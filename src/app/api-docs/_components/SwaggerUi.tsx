"use client";

import { useEffect } from "react";
import "swagger-ui-dist/swagger-ui.css";

export function SwaggerUi() {
  useEffect(() => {
    import("swagger-ui-dist").then(({ SwaggerUIBundle }) => {
      SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui",
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
        deepLinking: true,
      });
    });
  }, []);

  return (
    <>
      <style>{`
        /* ── Reset + root surface ──────────────────────────────────── */
        #swagger-ui,
        .swagger-ui,
        .swagger-ui * {
          color-scheme: dark;
        }
        .swagger-ui {
          background: #0a0a1f !important;
          color: #e8e8f4 !important;
        }
        .swagger-ui .wrapper {
          background: #0a0a1f !important;
          max-width: 1200px;
          padding: 0 20px;
        }

        /* ── Topbar ────────────────────────────────────────────────── */
        .swagger-ui .topbar {
          background: #111131 !important;
          border-bottom: 1px solid rgba(255,255,255,0.12) !important;
          padding: 10px 16px;
        }
        .swagger-ui .topbar .download-url-wrapper input[type=text] {
          background: #222246 !important;
          border: 1px solid rgba(255,255,255,0.18) !important;
          color: #e8e8f4 !important;
          border-radius: 6px;
        }
        .swagger-ui .topbar .download-url-button {
          background: #6d64fb !important;
          border-color: #6d64fb !important;
          color: #fff !important;
          border-radius: 6px;
        }
        .swagger-ui .topbar a {
          color: #e8e8f4 !important;
        }

        /* ── Info block ────────────────────────────────────────────── */
        .swagger-ui .info,
        .swagger-ui .info * {
          background: transparent !important;
        }
        .swagger-ui .info .title,
        .swagger-ui .info h1,
        .swagger-ui .info h2,
        .swagger-ui .info h3 {
          color: #ffffff !important;
        }
        .swagger-ui .info p,
        .swagger-ui .info li {
          color: #d0d0e0 !important;
        }
        .swagger-ui .info span {
          color: #d0d0e0 !important;
        }
        .swagger-ui .info a,
        .swagger-ui .info a:visited {
          color: #8a83fc !important;
        }
        .swagger-ui .info .base-url {
          color: #a8a8c0 !important;
        }
        .swagger-ui .info .version {
          background: rgba(109,100,251,0.2) !important;
          color: #afaafd !important;
          border: 1px solid rgba(109,100,251,0.3) !important;
        }

        /* ── Scheme container ──────────────────────────────────────── */
        .swagger-ui .scheme-container {
          background: #0a0a1f !important;
          border-bottom: 1px solid rgba(255,255,255,0.08) !important;
          padding: 12px 0;
        }
        .swagger-ui .servers > label,
        .swagger-ui .servers-title {
          color: #d0d0e0 !important;
        }
        .swagger-ui .servers select {
          background: #222246 !important;
          border: 1px solid rgba(255,255,255,0.18) !important;
          color: #e8e8f4 !important;
          border-radius: 6px;
        }

        /* ── Tags / sections ───────────────────────────────────────── */
        .swagger-ui .opblock-tag {
          color: #ffffff !important;
          border-bottom: 1px solid rgba(255,255,255,0.10) !important;
          font-size: 18px;
          background: transparent !important;
        }
        .swagger-ui .opblock-tag:hover {
          background: #1e1e40 !important;
        }
        .swagger-ui .opblock-tag small {
          color: #a8a8c0 !important;
          font-size: 13px;
        }
        .swagger-ui .opblock-tag-section h4 {
          color: #ffffff !important;
        }
        .swagger-ui .opblock-tag svg {
          fill: #a8a8c0 !important;
        }

        /* ── Operation blocks ──────────────────────────────────────── */
        .swagger-ui .opblock {
          background: #111131 !important;
          border: 1px solid rgba(255,255,255,0.10) !important;
          border-radius: 8px !important;
          box-shadow: none !important;
          margin-bottom: 8px;
        }
        .swagger-ui .opblock.is-open {
          border-color: rgba(109,100,251,0.4) !important;
        }
        .swagger-ui .opblock .opblock-summary {
          border: none !important;
          background: transparent !important;
        }
        .swagger-ui .opblock .opblock-summary:hover {
          background: #1e1e40 !important;
          border-radius: 7px 7px 0 0;
        }
        .swagger-ui .opblock-summary-control {
          background: transparent !important;
        }

        /* ── HTTP method badges ────────────────────────────────────── */
        .swagger-ui .opblock .opblock-summary-method {
          border-radius: 5px !important;
          font-weight: 700 !important;
          font-size: 13px !important;
          min-width: 70px;
          text-align: center;
          letter-spacing: 0.03em;
        }
        .swagger-ui .opblock.opblock-get    .opblock-summary-method { background: #1d4ed8 !important; color: #fff !important; }
        .swagger-ui .opblock.opblock-post   .opblock-summary-method { background: #15803d !important; color: #fff !important; }
        .swagger-ui .opblock.opblock-put    .opblock-summary-method { background: #b45309 !important; color: #fff !important; }
        .swagger-ui .opblock.opblock-patch  .opblock-summary-method { background: #0e7490 !important; color: #fff !important; }
        .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #b91c1c !important; color: #fff !important; }
        .swagger-ui .opblock.opblock-head   .opblock-summary-method { background: #6d28d9 !important; color: #fff !important; }

        /* ── Opblock left border accent ───────────────────────────── */
        .swagger-ui .opblock.opblock-get    { border-left: 3px solid #3b82f6 !important; }
        .swagger-ui .opblock.opblock-post   { border-left: 3px solid #22c55e !important; }
        .swagger-ui .opblock.opblock-put    { border-left: 3px solid #f59e0b !important; }
        .swagger-ui .opblock.opblock-patch  { border-left: 3px solid #06b6d4 !important; }
        .swagger-ui .opblock.opblock-delete { border-left: 3px solid #ef4444 !important; }

        /* ── Summary path + description ────────────────────────────── */
        .swagger-ui .opblock .opblock-summary-path,
        .swagger-ui .opblock .opblock-summary-path__deprecated,
        .swagger-ui .opblock .opblock-summary-path a {
          color: #e8e8f4 !important;
          font-size: 14px !important;
          font-weight: 500 !important;
        }
        .swagger-ui .opblock .opblock-summary-description {
          color: #b0b0c8 !important;
          font-size: 13px !important;
        }
        .swagger-ui .opblock-summary-control svg {
          fill: #a8a8c0 !important;
        }
        .swagger-ui .expand-operation svg {
          fill: #a8a8c0 !important;
        }

        /* ── Expanded body ─────────────────────────────────────────── */
        .swagger-ui .opblock-body {
          background: #0d0d24 !important;
          border-top: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 0 0 7px 7px;
        }
        .swagger-ui .opblock-section-header {
          background: #1a1a38 !important;
          border-bottom: 1px solid rgba(255,255,255,0.08) !important;
        }
        .swagger-ui .opblock-section-header h4 {
          color: #ffffff !important;
          font-size: 14px !important;
        }
        .swagger-ui .opblock-section-header label {
          color: #d0d0e0 !important;
        }

        /* ── Parameters table ──────────────────────────────────────── */
        .swagger-ui table {
          background: transparent !important;
        }
        .swagger-ui table thead tr td,
        .swagger-ui table thead tr th {
          color: #d0d0e0 !important;
          border-bottom: 1px solid rgba(255,255,255,0.12) !important;
          background: #1a1a38 !important;
          font-size: 13px !important;
          font-weight: 600 !important;
        }
        .swagger-ui table tbody tr td {
          color: #d0d0e0 !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
          background: transparent !important;
        }
        .swagger-ui table tbody tr:last-child td {
          border-bottom: none !important;
        }
        .swagger-ui .parameter__name {
          color: #ffffff !important;
          font-weight: 600 !important;
          font-size: 14px !important;
        }
        .swagger-ui .parameter__name.required::after {
          color: #f87171 !important;
        }
        .swagger-ui .parameter__name.required span {
          color: #f87171 !important;
        }
        .swagger-ui .parameter__type {
          color: #afaafd !important;
          font-size: 12px !important;
        }
        .swagger-ui .parameter__deprecated {
          color: #a8a8c0 !important;
        }
        .swagger-ui .parameter__in {
          color: #a8a8c0 !important;
          font-size: 11px !important;
          font-style: italic;
        }
        .swagger-ui .parameter-item {
          color: #d0d0e0 !important;
        }
        .swagger-ui .markdown p,
        .swagger-ui .markdown li,
        .swagger-ui .markdown span,
        .swagger-ui .renderedMarkdown p,
        .swagger-ui .renderedMarkdown li {
          color: #d0d0e0 !important;
        }
        .swagger-ui .markdown code,
        .swagger-ui .renderedMarkdown code {
          background: #1a1a38 !important;
          color: #afaafd !important;
          padding: 1px 5px;
          border-radius: 3px;
          font-size: 12px;
        }

        /* ── Code blocks / microlight ──────────────────────────────── */
        .swagger-ui .opblock-body pre,
        .swagger-ui .opblock-body pre.microlight,
        .swagger-ui pre.microlight,
        .swagger-ui .highlight-code,
        .swagger-ui .highlight-code pre,
        .swagger-ui .body-param__example,
        .swagger-ui .response-body {
          background: #07071a !important;
          color: #c8d3f5 !important;
          border-radius: 6px !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          font-size: 13px !important;
          line-height: 1.65 !important;
        }
        .swagger-ui .microlight .string { color: #86efac !important; }
        .swagger-ui .microlight .number { color: #fcd34d !important; }
        .swagger-ui .microlight .boolean { color: #f87171 !important; }
        .swagger-ui .microlight .null { color: #a8a8c0 !important; }
        .swagger-ui .microlight .key { color: #afaafd !important; }

        /* ── Execute / Try it out ──────────────────────────────────── */
        .swagger-ui .try-out__btn {
          background: transparent !important;
          border: 1px solid #6d64fb !important;
          color: #8a83fc !important;
          border-radius: 6px !important;
          font-weight: 600 !important;
          font-size: 13px !important;
        }
        .swagger-ui .try-out__btn:hover {
          background: rgba(109,100,251,0.15) !important;
        }
        .swagger-ui .btn.execute {
          background: #6d64fb !important;
          border-color: #6d64fb !important;
          color: #fff !important;
          border-radius: 6px !important;
          font-weight: 600 !important;
        }
        .swagger-ui .btn.execute:hover {
          background: #5d56d8 !important;
        }
        .swagger-ui .btn.cancel {
          background: transparent !important;
          border: 1px solid rgba(255,255,255,0.25) !important;
          color: #d0d0e0 !important;
          border-radius: 6px !important;
        }
        .swagger-ui .btn.cancel:hover {
          background: rgba(255,255,255,0.08) !important;
        }
        .swagger-ui .btn.authorize,
        .swagger-ui .authorization__btn {
          background: transparent !important;
          border: 1px solid #6d64fb !important;
          color: #8a83fc !important;
          border-radius: 6px !important;
        }
        .swagger-ui .btn.authorize:hover {
          background: rgba(109,100,251,0.15) !important;
        }
        .swagger-ui .btn.authorize svg {
          fill: #8a83fc !important;
        }
        .swagger-ui .authorization__btn svg {
          fill: #8a83fc !important;
        }

        /* ── Inputs ────────────────────────────────────────────────── */
        .swagger-ui input[type=text],
        .swagger-ui input[type=password],
        .swagger-ui input[type=search],
        .swagger-ui input[type=email],
        .swagger-ui textarea,
        .swagger-ui select {
          background: #1a1a38 !important;
          border: 1px solid rgba(255,255,255,0.18) !important;
          color: #e8e8f4 !important;
          border-radius: 6px !important;
          font-size: 14px !important;
        }
        .swagger-ui input[type=text]:focus,
        .swagger-ui input[type=password]:focus,
        .swagger-ui textarea:focus {
          border-color: #6d64fb !important;
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(109,100,251,0.25) !important;
        }
        .swagger-ui input::placeholder,
        .swagger-ui textarea::placeholder {
          color: #6a6a88 !important;
        }
        .swagger-ui label {
          color: #d0d0e0 !important;
          font-size: 13px !important;
          font-weight: 500 !important;
        }
        .swagger-ui select option {
          background: #1a1a38 !important;
          color: #e8e8f4 !important;
        }

        /* ── Responses ─────────────────────────────────────────────── */
        .swagger-ui .responses-wrapper,
        .swagger-ui .responses-inner,
        .swagger-ui .response-col_description,
        .swagger-ui .response-col_description * {
          background: transparent !important;
          color: #d0d0e0 !important;
        }
        .swagger-ui .responses-table .response {
          background: transparent !important;
        }
        .swagger-ui .response-col_status {
          color: #10b981 !important;
          font-weight: 700 !important;
          font-size: 14px !important;
        }
        .swagger-ui .response-col_status.response-undocumented {
          color: #a8a8c0 !important;
        }
        .swagger-ui .response-col_links {
          color: #a8a8c0 !important;
        }
        .swagger-ui .tab-header {
          background: transparent !important;
        }
        .swagger-ui .tab li {
          color: #b0b0c8 !important;
          font-size: 13px !important;
        }
        .swagger-ui .tab li.active {
          color: #ffffff !important;
          font-weight: 600 !important;
        }
        .swagger-ui .tab li button {
          color: inherit !important;
        }

        /* ── Models / Schemas ──────────────────────────────────────── */
        .swagger-ui section.models {
          border: 1px solid rgba(255,255,255,0.10) !important;
          border-radius: 8px !important;
          background: #111131 !important;
        }
        .swagger-ui section.models .models-control {
          background: #111131 !important;
          padding: 12px 16px;
        }
        .swagger-ui section.models h4 {
          color: #ffffff !important;
        }
        .swagger-ui section.models h4 span {
          color: #ffffff !important;
        }
        .swagger-ui section.models .model-container {
          background: #1a1a38 !important;
          border-radius: 6px !important;
          margin: 8px 12px !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
        }
        .swagger-ui section.models .model-box {
          background: transparent !important;
        }
        .swagger-ui .model-title,
        .swagger-ui .model-title__text {
          color: #ffffff !important;
        }
        .swagger-ui .model,
        .swagger-ui .model span {
          color: #d0d0e0 !important;
        }
        .swagger-ui .prop-type {
          color: #afaafd !important;
        }
        .swagger-ui .prop-format {
          color: #a8a8c0 !important;
        }
        .swagger-ui .prop-name {
          color: #e8e8f4 !important;
          font-weight: 600 !important;
        }
        .swagger-ui .model-toggle:after {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M0 3l5 5 5-5z' fill='%23d0d0e0'/%3E%3C/svg%3E") no-repeat center !important;
        }
        .swagger-ui .model .property {
          color: #d0d0e0 !important;
        }
        .swagger-ui .model .property.primitive {
          color: #afaafd !important;
        }
        .swagger-ui span.model-jump-to-path {
          color: #8a83fc !important;
        }
        .swagger-ui .object-type,
        .swagger-ui .inner-object {
          color: #d0d0e0 !important;
        }

        /* ── Arrows / chevrons ─────────────────────────────────────── */
        .swagger-ui .arrow {
          fill: #a8a8c0 !important;
        }

        /* ── Auth modal ────────────────────────────────────────────── */
        .swagger-ui .scopes h2 {
          color: #ffffff !important;
        }
        .swagger-ui .auth-container {
          background: #111131 !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          border-radius: 8px !important;
        }
        .swagger-ui .auth-container h4 {
          color: #ffffff !important;
        }
        .swagger-ui .auth-container p,
        .swagger-ui .auth-container li,
        .swagger-ui .auth-container code {
          color: #d0d0e0 !important;
        }
        .swagger-ui .dialog-ux .modal-ux {
          background: #111131 !important;
          border: 1px solid rgba(255,255,255,0.14) !important;
          border-radius: 12px !important;
          color: #e8e8f4 !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6) !important;
        }
        .swagger-ui .dialog-ux .modal-ux-header {
          background: #1a1a38 !important;
          border-bottom: 1px solid rgba(255,255,255,0.10) !important;
          border-radius: 12px 12px 0 0 !important;
        }
        .swagger-ui .dialog-ux .modal-ux-header h3 {
          color: #ffffff !important;
        }
        .swagger-ui .dialog-ux .modal-ux-header .close-modal svg {
          fill: #a8a8c0 !important;
        }
        .swagger-ui .dialog-ux .modal-ux-content p,
        .swagger-ui .dialog-ux .modal-ux-content h4,
        .swagger-ui .dialog-ux .modal-ux-content li {
          color: #d0d0e0 !important;
        }

        /* ── Loading indicator ─────────────────────────────────────── */
        .swagger-ui .loading-container .loading::after {
          border-color: #6d64fb transparent transparent transparent !important;
        }

        /* ── Misc labels ───────────────────────────────────────────── */
        .swagger-ui small {
          color: #a8a8c0 !important;
        }
        .swagger-ui .version-stamp,
        .swagger-ui .version {
          color: #afaafd !important;
        }
        .swagger-ui .opblock-external-docs-wrapper,
        .swagger-ui .external-docs a {
          color: #8a83fc !important;
        }
        .swagger-ui span,
        .swagger-ui p {
          color: inherit;
        }

        /* ── Curl output box ───────────────────────────────────────── */
        .swagger-ui .curl-command,
        .swagger-ui .curl {
          background: #07071a !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 6px !important;
          color: #c8d3f5 !important;
          font-size: 13px !important;
        }
        .swagger-ui .copy-to-clipboard {
          background: #1a1a38 !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          border-radius: 4px !important;
        }
        .swagger-ui .copy-to-clipboard button {
          background: transparent !important;
          color: #a8a8c0 !important;
        }

        /* ── Example value selector ────────────────────────────────── */
        .swagger-ui .example-select {
          background: #1a1a38 !important;
          border: 1px solid rgba(255,255,255,0.18) !important;
          color: #e8e8f4 !important;
          border-radius: 6px !important;
        }
        .swagger-ui .examples-select,
        .swagger-ui .examples-select select {
          background: #1a1a38 !important;
          border: 1px solid rgba(255,255,255,0.18) !important;
          color: #e8e8f4 !important;
          border-radius: 6px !important;
        }
        .swagger-ui .example__section-header {
          color: #d0d0e0 !important;
          font-weight: 600 !important;
        }
      `}</style>
      <div id="swagger-ui" />
    </>
  );
}
