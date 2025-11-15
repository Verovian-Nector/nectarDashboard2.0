# Frontend Handoff — Mantine UI Plan

This document captures the agreed plan to build a premium React + Mantine UI frontend aligned to the backend capabilities. It serves as the implementation handoff for engineering.

## Goals
- Deliver a fast, intuitive admin app with rich, enterprise-grade UX.
- Enforce granular permissions and role-based visibility across all modules.
- Present authoritative property pages with deep context and easy actions.

## Tech Stack
- React + TypeScript + Vite
- Mantine v7 (`AppShell`, `Navbar`, `Header`, `Tabs`, `Grid`, `Table`, `Form`, `Notifications`)
- Routing: `react-router-dom` (nested routes)
- Data layer: `@tanstack/react-query` + `axios` interceptors (JWT)
- State: `zustand` (session, theme, feature flags)
- Validation: `zod` + Mantine `useForm`
- Charts: `recharts` (or `echarts-for-react` if needed)
- Calendar: `react-big-calendar` + `date-fns`

## Information Architecture
- Dashboard
- Properties (list, filters) → Property Detail (tabs): Overview, Gallery, Tenants, Owner, Financial, Maintenance, Documents, Inventory, Inspections
- Financials (KPIs, transactions, P&L)
- Maintenance (requests board)
- Tenants
- Documents
- Inventory (defaults + per property)
- Inspections
- Integrations (config, import single/bulk)
- DLQ & Logs (resync)
- Public Feed (preview)
- Settings (Locations list, Users & permissions)

## UX Principles
- Minimal cognitive load, consistent component patterns, clear primary actions.
- Friendly micro-interactions (hover, focus, skeletons, toasts) and accessible forms.
- Keyboard-first navigation; AA contrast; responsive layout for 1200–1440px content width.

## Permissions & Auth
- Auth via `POST /token`; store JWT in memory with axios interceptor.
- UI gating by `UserPermissions` per section/action; route guards for forbidden states.

## API Integration
- Generate types/services from `openapi.json` using `openapi-typescript` or `orval`.
- Representative endpoints: auth (`/token`), users, properties, inventory, uploads, integrations, public feed, DLQ.

## Key Screens & Flows
- Dashboard: KPIs (properties, tenants, revenue, outstanding, expenses, net income), trends, alerts.
- Properties: server-side filters; create wizard; detail tabs with inline editing.
- Gallery: multi-upload drag-drop, previews, safe delete.
- Tenants & Owner: CRUD, assignments, contact and payment history.
- Financials: transactions, charts, exports; property-level P&L.
- Maintenance: requests board, SLA, priority, attachments.
- Documents: upload/manage, tags, secure links.
- Inventory: defaults admin; property rooms/items CRUD, audits.
- Inspections: scheduling, checklists, issues, photos, reports.
- Integrations: config management; inbound import single/bulk with preview.
- DLQ: list, resync with attempt history.
- Settings: locations list manager; user creation and granular permissions.

## Calendar & Notifications
- Calendar aggregates rent, charges, inspections, maintenance deadlines with filters.
- Notifications via toasts and inbox panel; configurable per user.

## Accessibility & Internationalization
- Screen reader labels, focus management, ARIA roles; i18n-ready via `react-i18next`.

## Performance & Reliability
- React Query caching; virtualization for large lists; graceful empty/error states.

## Milestones
1. AppShell, auth, routing, API client generation.
2. Properties list/detail + create wizard + uploads.
3. Tenants/Owner, Inventory defaults + property-level.
4. Financials and Maintenance modules.
5. Inspections, Integrations, DLQ.
6. Public Feed, Settings (locations), Calendar; polish.
7. Hardening, E2E tests, performance profiling; pre-prod.

## Risks & Assumptions
- Stable backend endpoints and OpenAPI availability.
- Clear permission mapping for each section/action.
- Financial metrics available via endpoints or derived server-side.

## Next Steps
- Scaffold the frontend with Mantine AppShell, auth, and routing.
- Implement Properties flows first for early feedback.

— Prepared for implementation by senior product engineering.