# Water Delivery System

CSSOFT1 Software Engineering 1 project by Team Avatar (BSCS IAB1, University of Baguio, SY 2026-2027).

A web and mobile app where customers order water refills, pick a delivery slot, pay by cash or e-wallet, and track their order. Riders get a daily delivery list, and admins manage stock, prices, containers, and reports. The AI feature is an agentic workflow using Small Language Models (SLMs) for chat ordering and dispatch suggestions.

## Branches

- `main` holds reviewed, merged work only.
- Work on a feature branch named after its Jira issue, for example `feature/SCRUM-19-register`, and merge it through a reviewed pull request.

## Tech stack

- React + TypeScript, built with Vite
- React Router for pages
- Supabase for the database and auth (`@supabase/supabase-js`)
- GitHub Actions CI runs lint and build on every pull request

## Getting started

Requires Node.js 24.

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL and anon key
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run oxlint |
| `npm run preview` | Preview the production build |

## Project structure

```
src/
  components/     shared UI (Layout, nav)
  lib/supabase.ts Supabase client
  pages/
    auth/         Login, Register
    customer/     ordering, slots, payment, tracking
    rider/        daily delivery list
    admin/        stock, prices, containers, reports
  types/          shared TypeScript types
supabase/
  migrations/     SQL migrations
```
