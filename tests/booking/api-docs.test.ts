import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const spec = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/openapi.json"), "utf-8")
) as {
  paths: Record<string, Record<string, { responses: Record<string, { content?: Record<string, { schema?: unknown; example?: unknown }> }> }>>;
};

describe("openapi.json — POST /booking/create responses", () => {
  const responses = spec.paths["/booking/create"]?.post?.responses ?? {};

  it("has all required status codes", () => {
    expect(Object.keys(responses).sort()).toEqual(
      ["201", "400", "404", "409", "429", "500"].sort()
    );
  });

  it("each status code has an application/json schema", () => {
    for (const code of ["201", "400", "404", "409", "429", "500"]) {
      const schema = responses[code]?.content?.["application/json"]?.schema;
      expect(schema, `status ${code} has no schema`).toBeTruthy();
    }
  });
});

describe("openapi.json — GET /booking/slots responses", () => {
  const responses = spec.paths["/booking/slots"]?.get?.responses ?? {};

  it("has all required status codes", () => {
    expect(Object.keys(responses).sort()).toEqual(
      ["200", "400", "404", "429", "500"].sort()
    );
  });

  it("each status code has an application/json schema", () => {
    for (const code of ["200", "400", "404", "429", "500"]) {
      const schema = responses[code]?.content?.["application/json"]?.schema;
      expect(schema, `status ${code} has no schema`).toBeTruthy();
    }
  });
});

describe("openapi.json — shared schemas", () => {
  it("errorResponseSchema is in components.schemas", () => {
    const schemas = (spec as Record<string, unknown>).components as { schemas?: Record<string, unknown> };
    expect(schemas?.schemas?.["errorResponseSchema"]).toBeTruthy();
  });

  it("bookingCreatedResponseSchema is in components.schemas", () => {
    const schemas = (spec as Record<string, unknown>).components as { schemas?: Record<string, unknown> };
    expect(schemas?.schemas?.["bookingCreatedResponseSchema"]).toBeTruthy();
  });

  it("slotsListResponseSchema is in components.schemas", () => {
    const schemas = (spec as Record<string, unknown>).components as { schemas?: Record<string, unknown> };
    expect(schemas?.schemas?.["slotsListResponseSchema"]).toBeTruthy();
  });
});
