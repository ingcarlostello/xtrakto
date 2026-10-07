# 0002. TypeScript on Node for the backend; Python only for ML training

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

The backend parses statements, reconciles balances, categorizes movements, calls LLMs and talks to the database. The frontend is a Next.js app. Python is the natural language for training models (Stage 14), but serving users from a second language means a second deployment and duplicated types at the boundary.

## Decision

All backend code is TypeScript running on Node.js inside the Next.js app: server actions, route handlers and Inngest functions. The runtime is Node.js 22, pinned in `.nvmrc` and `engines`. Python lives only in `ml/`, runs offline, and never serves users: trained models are exported to ONNX and run from Node with a parity test in CI.

## Alternatives considered

- **Python API with FastAPI:** a second language, deployment and set of types to keep in sync with the frontend.
- **A Python service for model inference:** an always-on service that serverless hosting doesn't provide, for a model small enough to run in Node.

## Consequences

- One language and one deployment; types flow from the database to the UI.
- Models must be exportable to ONNX, and each export needs a parity test between Python and Node.
- Node.js 22 reaches end of life in April 2027: upgrade before then (`.nvmrc`, `engines` and CI read the same version).
