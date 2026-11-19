# Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a public Astro site with a live, empty-by-default Supabase catalog and Cloudflare Workers deployment via GitHub Actions.

**Architecture:** Astro serves static files at the root. Browser reads published metadata from Supabase, which keeps editorial data in a private schema.

**Tech Stack:** Astro, TypeScript, Supabase PostgreSQL/Data API, Wrangler, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-19-production-design.md`

## Global Constraints

- Keep separate resources from genealogy. Do not introduce learner authentication, analytics, or audio uploads.
- Never publish fixtures, drafts, or unapproved audio. No secrets in frontend builds.
- No DNS changes. Do not automatically migrate the hosted DB from CI.

## Review Focus

- Anonymous DB grants permit reading only the published projection.
- Missing config, empty catalog, and request failure are distinguishable.
- Cloudflare serves the real nested routes and a genuine 404; test routes remain absent.
- PR workflows cannot deploy production or consume its credentials.
- Remote setup never targets the genealogy project.

## Steps

- [ ] **DB:** author and locally validate migrations and permission tests under `supabase/`. Contract: anonymous `GET /rest/v1/published_lessons?select=slug,title,summary,region&order=position.asc,slug.asc`; public row names are `slug`, `title`, `summary`, `region`, `position`. No production seed. Separate editorial schema. Verify anonymous access without privilege escalation.
- [ ] **Catalog:** implement a small typed read adapter, visible catalog states and retry on `src/pages/lo-trinh.astro`. Test empty, valid, invalid and failed responses. Env interface: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Render metadata as text, not HTML; no unimplemented lesson links.
- [ ] **Deploy:** add Wrangler and GitHub Actions pinned setup; PR checks do not deploy; production job uses the dedicated GitHub environment and `BASE_PATH=/`. Use actual artifacts and check asset routing and fixture exclusion before upload. Document rollback.
- [ ] **Hosted:** verify signed-in accounts, use a dedicated Supabase project and new Worker, add scoped configuration, and deploy via GitHub Actions. Verify live HTTPS routes, assets, empty catalog and absence of drafts/fixture. Record workflow run, deploy version, and the URL.
