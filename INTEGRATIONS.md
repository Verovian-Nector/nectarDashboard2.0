# Integrations & Mapping Configuration

This document explains how inbound/outbound integrations work, how to configure mapping, and how HMAC webhook verification is applied.

## Models
- `Client` — Owns one or more `IntegrationConfig` records.
- `IntegrationConfig` — Controls integration behavior:
  - `integration_type`: Adapter key, e.g., `wordpress_acf`, `custom_rest`.
  - `direction`: `inbound` | `outbound` | `bidirectional`.
  - `source_of_truth`: `dashboard` or `external`.
  - `endpoint_url`: Base endpoint for external system (adapter-specific).
  - `auth_type`: `none` | `basic` | `bearer` | `apikey` | `hmac`.
  - `auth_config`: Auth details, e.g., `{ "api_key": "..." }` or `{ "webhook_secret": "..." }`.
  - `field_mappings`: Optional canonical→external mapping overrides.
  - `transforms`: Optional per-field transforms.

## Source-of-Truth
- `dashboard`: outbound updates external, inbound modifies only non-critical fields unless allowed.
- `external`: inbound overrides mapped fields; outbound limited to create or mirrors if supported.
- Each successful operation sets `source_last_sync_at` on `DBProperty`.

## Dedup & Upsert Keys
- Unique constraints on `DBProperty`:
  - `(source, source_id)` unique — primary dedup key.
  - `wordpress_id` unique (nullable) — secondary dedup for WordPress.
- CRUD upsert behavior:
  - Find existing by `(source, source_id)`. If found, update mapped fields and `acf`.
  - For WordPress inbound, set `wordpress_id` from external id.
  - Merge rules: `acf.profilegroup` numeric-like values normalized to integers when possible.

## Adapter Responsibilities
- `fetch_inbound`/`fetch_inbound_by_id(config)`: Pull data from external system.
- `map_inbound_item(item, config)`: Map external JSON → canonical fields: `title`, `content`, `address`, `description`, `acf`.
- `prepare_outbound_property(property, config)`: Build external payload from canonical fields.
- `send_outbound_property(property, config, db)`: Create/update in external.

### Example field_mappings
```json
{
  "field_mappings": {
    "title": "post_title",
    "content": "post_content",
    "acf.profilegroup.beds": "acf.profilegroup.beds",
    "acf.profilegroup.location": "acf.profilegroup.location"
  },
  "transforms": {
    "page": 1,
    "per_page": 50
  }
}
```

## Public Properties Feed
- Endpoint: `GET /public/properties`
- Auth: API key via header `X-API-Key`.
- Validation: Matches against enabled `IntegrationConfig` with `auth_type = "apikey"` and `auth_config.api_key`.

## Webhook Ingestion (HMAC)
- Endpoint: `POST /integrations/{config_id}/ingest`
- Requires `IntegrationConfig.auth_type = "hmac"` and a secret in:
  - `auth_config.webhook_secret` or `auth_config.hmac_secret` or `auth_config.secret`.
- Headers supported:
  - `X-Signature` or `X-Hub-Signature`: signature of raw body.
  - `X-Timestamp` or `X-Signature-Timestamp`: optional timestamp for replay resistance.
- Verification: `security.verify_hmac_signature(signature, raw_body, secret, timestamp)`.
- On success: upserts property by `(source, source_id)` using adapter mapping.

## Uploads
- Endpoint: `POST /upload` accepts multipart files (`files`) and base64 data URLs (`file_data_urls`).
- Files saved to `uploads/` with UUID filenames; app mounts static files at `/uploads`.
- Base URL used for returned file URLs:
  - `BASE_URL` environment variable if set; otherwise derived from `request.base_url`.

## Testing Notes
- Use `tests/` for integration tests. Fixtures rely on `AsyncSessionLocal` and the configured `DATABASE_URL`.
- When testing outbound WordPress sync, set `WP_SYNC_ENABLED=true` with credentials; otherwise tests skip.