"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export function SwaggerUi() {
  return (
    <>
      <style>{`
        /* Reset swagger-ui to dark Klyro surface */
        .swagger-ui,
        .swagger-ui .info,
        .swagger-ui .scheme-container {
          background: var(--color-bg-base);
          color: var(--color-text-primary);
        }
        .swagger-ui .topbar {
          background: var(--color-bg-surface);
          border-bottom: 1px solid var(--color-border);
          padding: 8px 16px;
        }
        .swagger-ui .topbar .download-url-wrapper .select-label select,
        .swagger-ui .topbar .download-url-wrapper input[type=text] {
          border-color: var(--color-border);
          background: var(--color-bg-elevated);
          color: var(--color-text-primary);
        }
        .swagger-ui .opblock-tag {
          color: var(--color-text-primary);
          border-bottom: 1px solid var(--color-border);
        }
        .swagger-ui .opblock-tag:hover {
          background: var(--color-bg-hover);
        }
        /* Operation blocks */
        .swagger-ui .opblock {
          background: var(--color-bg-surface);
          border-color: var(--color-border);
          box-shadow: none;
        }
        .swagger-ui .opblock .opblock-summary-method {
          background: var(--color-violet);
          color: #fff;
        }
        .swagger-ui .opblock.opblock-get .opblock-summary-method {
          background: var(--color-violet);
        }
        .swagger-ui .opblock.opblock-post .opblock-summary-method {
          background: var(--color-violet-hover);
        }
        .swagger-ui .opblock .opblock-summary-description,
        .swagger-ui .opblock .opblock-summary-path {
          color: var(--color-text-secondary);
        }
        .swagger-ui .opblock-body pre.microlight {
          background: var(--color-bg-elevated);
          color: var(--color-text-primary);
        }
        /* Buttons */
        .swagger-ui .btn.execute {
          background: var(--color-violet);
          border-color: var(--color-violet);
          color: #fff;
        }
        .swagger-ui .btn.execute:hover {
          background: var(--color-violet-hover);
        }
        .swagger-ui .btn.cancel {
          border-color: var(--color-border);
          color: var(--color-text-secondary);
        }
        /* Inputs */
        .swagger-ui input[type=text],
        .swagger-ui textarea,
        .swagger-ui select {
          background: var(--color-bg-elevated);
          border-color: var(--color-border);
          color: var(--color-text-primary);
        }
        /* Tables */
        .swagger-ui table thead tr td,
        .swagger-ui table thead tr th {
          color: var(--color-text-secondary);
          border-bottom: 1px solid var(--color-border);
        }
        .swagger-ui .parameter__name,
        .swagger-ui .parameter__type {
          color: var(--color-text-primary);
        }
        /* Info section */
        .swagger-ui .info .title,
        .swagger-ui .info li,
        .swagger-ui .info p {
          color: var(--color-text-primary);
        }
        .swagger-ui .info a {
          color: var(--color-violet-soft);
        }
        /* Models */
        .swagger-ui section.models {
          border-color: var(--color-border);
        }
        .swagger-ui section.models .model-container {
          background: var(--color-bg-surface);
        }
        .swagger-ui .model-title {
          color: var(--color-text-primary);
        }
        .swagger-ui .model {
          color: var(--color-text-secondary);
        }
        /* Responses */
        .swagger-ui .response-col_status {
          color: var(--color-success);
        }
        .swagger-ui .response-col_description {
          color: var(--color-text-secondary);
        }
      `}</style>
      <SwaggerUI url="/openapi.json" />
    </>
  );
}
