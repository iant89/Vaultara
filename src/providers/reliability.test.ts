import { describe, expect, it } from 'vitest';
import { createAppError, type AppError } from '../models/errors';
import {
  computeBackoffDelay,
  DEFAULT_RETRY_POLICY,
  executeWithPolicy,
  isRetryable,
  sleepWithSignal,
} from './reliability';

const NO_RETRY = { ...DEFAULT_RETRY_POLICY, maxAttempts: 1 };

/** Collect requested backoff delays so tests never actually wait. */
function createSleepRecorder(): {
  readonly delays: number[];
  readonly sleep: (ms: number) => Promise<void>;
} {
  const delays: number[] = [];

  return {
    delays,
    sleep: (ms: number) => {
      delays.push(ms);
      return Promise.resolve();
    },
  };
}

async function rejectionOf(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    return error as AppError;
  }

  throw new Error('Expected the operation to reject, but it resolved.');
}

describe('executeWithPolicy', () => {
  it('returns the first successful result and reports the attempt number', async () => {
    const attempts: number[] = [];

    const value = await executeWithPolicy(
      async (context) => {
        attempts.push(context.attempt);
        return 'done';
      },
      { providerId: 'fake' },
    );

    expect(value).toBe('done');
    expect(attempts).toEqual([1]);
  });

  it('retries a transient failure and succeeds', async () => {
    const recorder = createSleepRecorder();
    let call = 0;

    const value = await executeWithPolicy(
      async () => {
        call += 1;

        if (call < 3) {
          throw createAppError('network', 'Connection reset.');
        }

        return 'recovered';
      },
      { providerId: 'fake', sleep: recorder.sleep, random: () => 0.5 },
    );

    expect(value).toBe('recovered');
    expect(call).toBe(3);
    expect(recorder.delays).toHaveLength(2);
  });

  it('does not retry an invalid response: the same payload will come back', async () => {
    let calls = 0;

    const error = await rejectionOf(
      executeWithPolicy(
        async () => {
          calls += 1;
          throw createAppError('invalid-response', 'Malformed payload.');
        },
        { providerId: 'fake', sleep: createSleepRecorder().sleep },
      ),
    );

    expect(calls).toBe(1);
    expect(error.kind).toBe('invalid-response');
    expect(error.providerId).toBe('fake');
  });

  it('gives up after the configured number of attempts', async () => {
    let calls = 0;

    const error = await rejectionOf(
      executeWithPolicy(
        async () => {
          calls += 1;
          throw createAppError('network', 'Offline.');
        },
        { providerId: 'fake', sleep: createSleepRecorder().sleep },
      ),
    );

    expect(calls).toBe(DEFAULT_RETRY_POLICY.maxAttempts);
    expect(error.kind).toBe('network');
  });

  it('times out an operation that never settles', async () => {
    const error = await rejectionOf(
      executeWithPolicy(() => new Promise<never>(() => undefined), {
        providerId: 'fake',
        timeoutMs: 10,
        retry: NO_RETRY,
      }),
    );

    expect(error.kind).toBe('timeout');
    expect(error.providerId).toBe('fake');
  });

  it('enforces the timeout even when the adapter ignores its signal', async () => {
    let signalIgnored: AbortSignal | undefined;

    const error = await rejectionOf(
      executeWithPolicy(
        (context) => {
          signalIgnored = context.signal;
          // Deliberately ignores the signal: the policy must still stop waiting.
          return new Promise<never>(() => undefined);
        },
        { providerId: 'fake', timeoutMs: 10, retry: NO_RETRY },
      ),
    );

    expect(error.kind).toBe('timeout');
    expect(signalIgnored?.aborted).toBe(true);
  });

  it('refuses to start when the caller has already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;

    const error = await rejectionOf(
      executeWithPolicy(
        async () => {
          calls += 1;
          return 'never';
        },
        { providerId: 'fake', signal: controller.signal },
      ),
    );

    expect(calls).toBe(0);
    expect(error.kind).toBe('cancelled');
  });

  it('stops on cancellation without retrying', async () => {
    const controller = new AbortController();
    let calls = 0;

    const error = await rejectionOf(
      executeWithPolicy(
        () => {
          calls += 1;
          controller.abort();
          return new Promise<never>(() => undefined);
        },
        { providerId: 'fake', signal: controller.signal, sleep: createSleepRecorder().sleep },
      ),
    );

    expect(calls).toBe(1);
    expect(error.kind).toBe('cancelled');
  });

  it('stops when the caller cancels during a backoff wait', async () => {
    const controller = new AbortController();
    let calls = 0;
    const sleep = (): Promise<void> => {
      controller.abort();
      return Promise.resolve();
    };

    const error = await rejectionOf(
      executeWithPolicy(
        async () => {
          calls += 1;
          throw createAppError('network', 'Offline.');
        },
        { providerId: 'fake', signal: controller.signal, sleep },
      ),
    );

    expect(calls).toBe(1);
    expect(error.kind).toBe('cancelled');
  });

  it('honours a rate-limit retry hint instead of the computed backoff', async () => {
    const recorder = createSleepRecorder();
    let call = 0;

    const value = await executeWithPolicy(
      async () => {
        call += 1;

        if (call === 1) {
          throw createAppError('rate-limited', 'Slow down.', {
            providerId: 'fake',
            retryAfterMs: 2500,
          });
        }

        return 'allowed';
      },
      { providerId: 'fake', sleep: recorder.sleep, random: () => 0.5 },
    );

    expect(value).toBe('allowed');
    expect(recorder.delays).toEqual([2500]);
  });

  it('passes a cancellable signal to the adapter', async () => {
    let received: AbortSignal | undefined;

    await executeWithPolicy(
      async (context) => {
        received = context.signal;
        return 'ok';
      },
      { providerId: 'fake' },
    );

    expect(received).toBeInstanceOf(AbortSignal);
    expect(received?.aborted).toBe(false);
  });
});

describe('computeBackoffDelay', () => {
  const policy = { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 1000, jitterRatio: 0 };

  it('grows exponentially from the base delay', () => {
    expect(computeBackoffDelay(1, policy, () => 0.5)).toBe(100);
    expect(computeBackoffDelay(2, policy, () => 0.5)).toBe(200);
    expect(computeBackoffDelay(3, policy, () => 0.5)).toBe(400);
  });

  it('never exceeds the cap', () => {
    expect(computeBackoffDelay(20, policy, () => 0.5)).toBe(1000);
  });

  it('applies jitter within the configured ratio', () => {
    const jittered = { ...policy, jitterRatio: 0.5 };

    expect(computeBackoffDelay(1, jittered, () => 0)).toBe(50);
    expect(computeBackoffDelay(1, jittered, () => 1)).toBe(150);
  });

  it('prefers a provider-supplied retry hint, capped at the maximum', () => {
    expect(computeBackoffDelay(1, policy, () => 0.5, 300)).toBe(300);
    expect(computeBackoffDelay(1, policy, () => 0.5, 60_000)).toBe(1000);
  });
});

describe('isRetryable', () => {
  it.each([
    ['timeout', true],
    ['network', true],
    ['rate-limited', true],
    ['provider-unavailable', true],
    ['invalid-response', false],
    ['not-found', false],
    ['cancelled', false],
    ['unauthorized', false],
    ['unsupported-capability', false],
  ] as const)('treats %s as retryable=%s', (kind, expected) => {
    expect(isRetryable(createAppError(kind, 'message'))).toBe(expected);
  });
});

describe('sleepWithSignal', () => {
  it('resolves after the delay', async () => {
    await expect(sleepWithSignal(1)).resolves.toBeUndefined();
  });

  it('resolves immediately for a non-positive delay', async () => {
    await expect(sleepWithSignal(0)).resolves.toBeUndefined();
  });

  it('rejects when the signal aborts first', async () => {
    const controller = new AbortController();
    const pending = sleepWithSignal(10_000, controller.signal);
    controller.abort();

    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' });
  });
});
