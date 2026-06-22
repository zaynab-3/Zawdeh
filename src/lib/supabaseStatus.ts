export const DATABASE_NOT_READY_MESSAGE = 'Database tables are not ready yet.';

type SupabaseErrorLike = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

export class DatabaseNotReadyError extends Error {
  constructor() {
    super(DATABASE_NOT_READY_MESSAGE);
    this.name = 'DatabaseNotReadyError';
  }
}

function getSupabaseErrorText(error: SupabaseErrorLike) {
  return [error.code, error.message, error.details, error.hint].filter(Boolean).join(' ').toLowerCase();
}

export function isDatabaseNotReadyError(error: unknown) {
  if (error instanceof DatabaseNotReadyError) {
    return true;
  }

  if (!error || typeof error !== 'object') {
    return false;
  }

  const supabaseError = error as SupabaseErrorLike;
  const text = getSupabaseErrorText(supabaseError);

  return (
    supabaseError.code === '42P01' ||
    supabaseError.code === 'PGRST205' ||
    text.includes('could not find the table') ||
    text.includes('schema cache') ||
    text.includes('does not exist')
  );
}

export function throwIfDatabaseNotReady(error: unknown) {
  if (isDatabaseNotReadyError(error)) {
    throw new DatabaseNotReadyError();
  }
}

export function getSafeDataErrorMessage(error: unknown, fallbackMessage: string) {
  return isDatabaseNotReadyError(error) ? DATABASE_NOT_READY_MESSAGE : fallbackMessage;
}
