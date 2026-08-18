// Application error carrying an HTTP status code, used to short-circuit controller responses.
export class AppError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function getErrorStatus(error: unknown, fallback = 500): number {
  return error instanceof AppError ? error.status : fallback;
}
