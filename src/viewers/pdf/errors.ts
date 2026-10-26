import { createAppError, type AppError } from '../../models/errors';

export function describePdfLoadFailure(error: unknown): AppError {
  const message = error instanceof Error ? error.message : 'The PDF could not be opened.';
  const lower = message.toLowerCase();
  const blocked =
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('cors') ||
    lower.includes('cross-origin') ||
    lower.includes('load failed');

  if (blocked) {
    return createAppError(
      'network',
      "This file could not be read in the browser. The provider did not allow this site to fetch it. Download the original or open it on the provider's site.",
    );
  }

  return createAppError('invalid-response', message);
}
