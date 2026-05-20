import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError, ERROR_CODES } from "./api-error";
import { logger } from "@/lib/log";

interface PostgrestError {
  code: string;
  message: string;
  details?: string;
}

function isPostgrestError(err: unknown): err is PostgrestError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "message" in err &&
    typeof (err as Record<string, unknown>)["code"] === "string" &&
    typeof (err as Record<string, unknown>)["message"] === "string"
  );
}

export function toErrorResponse(error: unknown): NextResponse {
  const reqId = crypto.randomUUID();
  const headers = { "X-Request-ID": reqId };

  if (error instanceof ApiError) {
    const body: Record<string, unknown> = {
      code: error.code,
      message: error.message,
    };
    if (error.fieldErrors) body["fieldErrors"] = error.fieldErrors;
    if (error.retryAfterSeconds) body["retryAfter"] = error.retryAfterSeconds;
    return NextResponse.json(body, { status: error.status, headers });
  }

  if (error instanceof ZodError) {
    const flat = error.flatten();
    const fieldErrors: Record<string, string> = {};
    for (const [field, msgs] of Object.entries(flat.fieldErrors)) {
      const messages = msgs as string[] | undefined;
      fieldErrors[field] = messages?.[0] ?? "Invalid";
    }
    return NextResponse.json(
      {
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Validation failed",
        fieldErrors,
      },
      { status: 400, headers }
    );
  }

  if (isPostgrestError(error)) {
    if (error.code === "23505") {
      const apiErr = ApiError.slugTaken("");
      return NextResponse.json(
        { code: apiErr.code, message: "A record with this value already exists" },
        { status: apiErr.status, headers }
      );
    }
    logger.error("toErrorResponse: PostgrestError", {
      reqId,
      pgCode: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { code: ERROR_CODES.INTERNAL, message: "Database error" },
      { status: 500, headers }
    );
  }

  const cause = error instanceof Error ? error : new Error(String(error));
  logger.error("toErrorResponse: unhandled error", {
    reqId,
    error: cause instanceof Error ? cause.message : String(cause),
  });
  return NextResponse.json(
    { code: ERROR_CODES.INTERNAL, message: "An unexpected error occurred" },
    { status: 500, headers }
  );
}
