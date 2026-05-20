import { describe, it, expect } from "vitest";
import { ApiError, ERROR_CODES } from "../api-error";

describe("ApiError factories", () => {
  it("unauthorized() has correct code and 401 status", () => {
    const err = ApiError.unauthorized();
    expect(err.code).toBe(ERROR_CODES.UNAUTHORIZED);
    expect(err.status).toBe(401);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(Error);
  });

  it("forbidden() has correct code and 403 status", () => {
    const err = ApiError.forbidden();
    expect(err.code).toBe(ERROR_CODES.FORBIDDEN);
    expect(err.status).toBe(403);
  });

  it("notFound() includes the resource name in the message", () => {
    const err = ApiError.notFound("Business");
    expect(err.code).toBe(ERROR_CODES.NOT_FOUND);
    expect(err.status).toBe(404);
    expect(err.message).toContain("Business");
  });

  it("validation() carries fieldErrors", () => {
    const err = ApiError.validation({ email: "Invalid email" });
    expect(err.code).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(err.status).toBe(400);
    expect(err.fieldErrors).toEqual({ email: "Invalid email" });
  });

  it("slugTaken() includes slug in message and has 409 status", () => {
    const err = ApiError.slugTaken("my-slug");
    expect(err.code).toBe(ERROR_CODES.SLUG_TAKEN);
    expect(err.status).toBe(409);
    expect(err.message).toContain("my-slug");
  });

  it("rateLimited() carries retryAfterSeconds and has 429 status", () => {
    const err = ApiError.rateLimited(30);
    expect(err.code).toBe(ERROR_CODES.RATE_LIMITED);
    expect(err.status).toBe(429);
    expect(err.retryAfterSeconds).toBe(30);
  });

  it("internal() stores the cause and has 500 status", () => {
    const cause = new Error("db connection failed");
    const err = ApiError.internal(cause);
    expect(err.code).toBe(ERROR_CODES.INTERNAL);
    expect(err.status).toBe(500);
    expect(err.cause).toBe(cause);
  });

  it("badRequest() has 400 status", () => {
    const err = ApiError.badRequest("missing field");
    expect(err.code).toBe(ERROR_CODES.BAD_REQUEST);
    expect(err.status).toBe(400);
    expect(err.message).toBe("missing field");
  });

  it("conflict() has 409 status", () => {
    const err = ApiError.conflict("already exists");
    expect(err.code).toBe(ERROR_CODES.CONFLICT);
    expect(err.status).toBe(409);
  });

  it("name is ApiError, not Error", () => {
    expect(ApiError.internal().name).toBe("ApiError");
  });
});
