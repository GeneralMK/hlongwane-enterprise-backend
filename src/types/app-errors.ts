export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);

    this.name = "AppError";
  }
}

export const badRequest = (
  code: string,
  message: string,
  details?: unknown,
) =>
  new AppError(
    400,
    code,
    message,
    details,
  );

export const unauthorized = (
  message = "Authentication required.",
) =>
  new AppError(
    401,
    "UNAUTHENTICATED",
    message,
  );

export const forbidden = (
  code: string,
  message: string,
  details?: unknown,
) =>
  new AppError(
    403,
    code,
    message,
    details,
  );

export const notFound = (
  code: string,
  message: string,
) =>
  new AppError(
    404,
    code,
    message,
  );

export const conflict = (
  code: string,
  message: string,
  details?: unknown,
) =>
  new AppError(
    409,
    code,
    message,
    details,
  );