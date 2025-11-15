# Frontend Permission-Gating & Build-Fix Hand-off

## New Permission Helpers (PropertyDetailPage.tsx)
- `canRead(...keys)` – shows section if user has read on any key
- `canUpdate(...keys)` – enables edit if user has update on any key  
- `canCreate(...keys)` – enables create if user has create on any key
- All helpers accept variadic string args, **NOT arrays**.

## Gated UI Actions
| Action | Keys Checked | Location |
|---|---|---|
| Edit Overview | `profilegroup`, `properties` | Overview tab |
| Edit Gallery | `gallery_photos`, `properties` | Gallery tab header |
| Add/Edit Owner | `profile_management` | Owner card |
| Add Tenant | `tenants_group` | TenantsPanel prop |
| Edit Tenant | `tenants_group` | TenantsPage list |
| Add/Edit Room & Item | `inventory_group`, `inventory` | Inventory accordion |
| Create Property | `properties` | PropertiesPage header |
| Create Owner User | `users` + `profile_management` | PropertiesPage modal |

## Build Fixes Required for Production
1. **Variadic vs Array**: every `canX(['a','b'])` → `canX('a','b')`
2. **SegmentedControl**: removed unsupported `label` prop, typed `onChange` to `string`
3. **Unused vars**: removed ~15 dead identifiers (trends, depositAmount, statusColor...)
4. **Modal footers**: ensure `(updated)` param is used or prefixed with `_`

## Remaining TODOs (non-blocking)
- 103 TS warnings = unused imports/vars – safe to ignore
- Future CRUD keys can be added to `sectionKeys()` in `permissions.ts`
- Upload fields: adopt dropzone component from EditTenantModal for premium finish
- All edit modals: reuse styling from EditOverviewModal

**Servers**: backend `8000`, frontend `5173` – both running clean.