# Integration & Sync Task List

## Architecture & Source-of-Truth Strategy

- Integrations are implemented via adapters registered by `integration_type` (e.g., `wordpress_acf`).
- `IntegrationConfig` controls direction (`inbound` | `outbound` | `bidirectional`) and `source_of_truth` (`dashboard` | `external`).
- Outbound sync: CRUD helpers dispatch to adapter `send_outbound_property` after create/update; legacy fallback removed (adapter-only).
- Inbound import: Endpoints call CRUD helpers which use adapter `fetch_inbound`/`fetch_inbound_by_id` and `map_inbound_item` to upsert.

### Source-of-Truth Policy

- If `source_of_truth = dashboard`: outbound wins, external is updated; inbound imports update only non-critical fields (e.g., description) unless explicitly allowed.
- If `source_of_truth = external`: inbound wins for mapped fields; outbound restricted to create-only or mirror updates that external supports.
- Sync stamps: set `source_last_sync_at` on every successful operation; use for staleness detection.

### Conflict Resolution & Deduping

- Dedup keys: `(source, source_id)` unique and `wordpress_id` unique (nullable).
- Upsert logic: find by `(source, source_id)` first; map and update fields; set `wordpress_id` when adapter type is WordPress.
- Merge rules: when updating `acf`, merge per-group dictionaries; replace non-dict values.
- Tiebreakers: prefer newer `source_last_sync_at`; if equal, prefer `source_of_truth` winner.

### Mapping Config

- `field_mappings` can override adapter defaults: canonical -> external keys.
- `transforms` allow per-field transformations (e.g., pagination defaults `page`, `per_page`).

## Implemented

- Adapter base, registry, and WordPress adapter (outbound + inbound).
- Outbound dispatch wired on property create/update (adapter-only).
- Inbound single and bulk import endpoints, using CRUD upsert helpers.
- DBProperty uniqueness constraints and removal of conflicting `inventory` JSON column.
- Webhook ingestion with HMAC verification for external push events.
- Public properties feed with API-key auth.
- Conflict resolution and deduping by `(source, source_id)` and `wordpress_id` upsert behavior.

## Next

- Resync endpoint and dead-letter queue for failed operations.
- Unit/integration tests for adapters, mapping, and sync flows.
- Cleanup duplicate routes and unreachable code paths.

This task list tracks the work to support all four property-data scenarios across WordPress and non-WordPress sites while keeping the dashboard as the system of record where configured.

## Scope & Scenarios
- Scenario 1: Pre-existing WordPress is source → inbound import to dashboard.
- Scenario 2: WordPress expects data from dashboard → outbound sync (current).
- Scenario 3: Non-WordPress is source → external ingestion to dashboard.
- Scenario 4: Non-WordPress expects data from dashboard → public feed / outbound API.

## Tasks

### Architecture & Configuration
 - [x] Design integration architecture and source-of-truth strategy (Priority: high)
 - [x] Add Client and IntegrationConfig models with storage (Priority: high)

### Adapter Layer
- [x] Implement adapter interface and registry (Priority: high)
- [x] Refactor WordPress outbound sync to use adapter (Priority: high)

### Inbound Imports
- [x] Build WordPress inbound import endpoints (single, bulk) (Priority: high)
- [x] Implement external ingestion endpoints and webhook with HMAC (Priority: high)

### Outbound & Public Feeds
- [x] Publish public properties feed with API-key auth (Priority: high)
- [x] Add resync endpoint and DLQ for failed syncs (Priority: medium)

### Data Consistency
 - [x] Add conflict resolution and deduping by source_id/wordpress_id (Priority: medium)

### Testing & Documentation
 - [x] Write mapping config format and developer docs (Priority: medium)
 - [x] Add unit and integration tests for adapters and sync (Priority: medium)

### Housekeeping
 - [x] Align Pydantic version and fix schema conflicts (Priority: medium)
- [x] Resolve DBProperty.inventory column/relationship conflict (Priority: medium)
- [x] Remove duplicate endpoints and unreachable code paths (Priority: low)
 - [x] Add Docker Compose for Postgres and Adminer (Priority: low)
 - [x] Provide .env.example and LOCAL_DEV.md for setup (Priority: low)

## Notes
- Properties remain the only cross-system entity; other domains (events, payments, inventory) are dashboard-only.
- Integration behavior is governed per client via `source_of_truth` and `integration_type`.
- Adapters map inbound/outbound payloads to the canonical internal model and optional ACF/other schemas.