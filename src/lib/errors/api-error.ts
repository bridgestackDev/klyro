export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  SLUG_TAKEN: "SLUG_TAKEN",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
  BAD_REQUEST: "BAD_REQUEST",
  CONFLICT: "CONFLICT",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

const STATUS_MAP: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
  SLUG_TAKEN: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  BAD_REQUEST: 400,
  CONFLICT: 409,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;
  readonly retryAfterSeconds?: number;
  override readonly cause?: Error;

  constructor(params: {
    code: ErrorCode;
    message: string;
    fieldErrors?: Record<string, string>;
    cause?: Error;
    retryAfterSeconds?: number;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.status = STATUS_MAP[params.code];
    this.fieldErrors = params.fieldErrors;
    this.cause = params.cause;
    this.retryAfterSeconds = params.retryAfterSeconds;
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError({ code: ERROR_CODES.UNAUTHORIZED, message });
  }

  static forbidden(message = "Forbidden") {
    return new ApiError({ code: ERROR_CODES.FORBIDDEN, message });
  }

  static notFound(resource = "Resource") {
    return new ApiError({
      code: ERROR_CODES.NOT_FOUND,
      message: `${resource} not found`,
    });
  }

  static validation(
    fieldErrors: Record<string, string>,
    message = "Validation failed"
  ) {
    return new ApiError({
      code: ERROR_CODES.VALIDATION_FAILED,
      message,
      fieldErrors,
    });
  }

  static slugTaken(slug: string) {
    return new ApiError({
      code: ERROR_CODES.SLUG_TAKEN,
      message: `Slug "${slug}" is already taken`,
    });
  }

  static rateLimited(retryAfterSeconds: number) {
    return new ApiError({
      code: ERROR_CODES.RATE_LIMITED,
      message: "Too many requests",
      retryAfterSeconds,
    });
  }

  static internal(cause?: Error) {
    return new ApiError({
      code: ERROR_CODES.INTERNAL,
      message: "Internal server error",
      cause,
    });
  }

  static badRequest(message = "Bad request") {
    return new ApiError({ code: ERROR_CODES.BAD_REQUEST, message });
  }

  static conflict(message = "Conflict") {
    return new ApiError({ code: ERROR_CODES.CONFLICT, message });
  }
}
