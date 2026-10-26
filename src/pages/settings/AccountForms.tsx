import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { describeSessionError, useSession } from '../../data/SessionContext';
import { buildOnboardingPath } from '../../utils/links';
import styles from './Settings.module.css';

export function AccountPanel() {
  const session = useSession();

  if (session.status === 'loading') {
    return <p className={styles.lede}>Checking account…</p>;
  }

  if (session.status === 'signed-in' && session.account !== undefined) {
    return (
      <div className={styles.signedIn}>
        <p>
          Signed in as <strong>{session.account.displayName}</strong> ({session.account.email}).
        </p>
        <p className={styles.lede}>
          This account and its saved state stay in this browser. They are not sent to a Vaultara
          server and do not sync to other devices.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            void session.signOut();
          }}
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.formGrid}>
      <p className={styles.lede}>
        Accounts are stored in this browser with IndexedDB. A password is stored as a one-way hash,
        never as the password itself. Cross-device sync needs a hosted backend, which this GitHub
        Pages deployment does not have.
      </p>
      <CreateAccountForm />
      <SignInForm />
    </div>
  );
}

function CreateAccountForm() {
  const session = useSession();
  const navigate = useNavigate();
  const errorId = useId();
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError(undefined);

    try {
      await session.createAccount({
        displayName: String(data.get('displayName') ?? ''),
        email: String(data.get('email') ?? ''),
        password: String(data.get('password') ?? ''),
      });
      form.reset();
      navigate(buildOnboardingPath());
    } catch (cause) {
      setError(describeSessionError(cause).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => void onSubmit(event)}
      aria-describedby={error !== undefined ? errorId : undefined}
    >
      <h3 className={styles.formTitle}>Create account</h3>
      <Field label="Display name" name="displayName" autoComplete="nickname" disabled={pending} />
      <Field label="Email" name="email" type="email" autoComplete="email" disabled={pending} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        disabled={pending}
      />
      {error !== undefined ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" disabled={pending}>
        Create account
      </Button>
    </form>
  );
}

function SignInForm() {
  const session = useSession();
  const navigate = useNavigate();
  const errorId = useId();
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError(undefined);

    try {
      const preferences = await session.signIn({
        email: String(data.get('email') ?? ''),
        password: String(data.get('password') ?? ''),
      });
      form.reset();

      if (!preferences.onboardingCompleted) {
        navigate(buildOnboardingPath());
      }
    } catch (cause) {
      setError(describeSessionError(cause).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => void onSubmit(event)}
      aria-describedby={error !== undefined ? errorId : undefined}
    >
      <h3 className={styles.formTitle}>Sign in</h3>
      <Field label="Email" name="email" type="email" autoComplete="email" disabled={pending} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        disabled={pending}
      />
      {error !== undefined ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        Sign in
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  autoComplete,
  disabled,
}: {
  readonly label: string;
  readonly name: string;
  readonly type?: 'text' | 'email' | 'password';
  readonly autoComplete?: string;
  readonly disabled?: boolean;
}) {
  const id = useId();

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={styles.input}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        disabled={disabled}
      />
    </div>
  );
}
