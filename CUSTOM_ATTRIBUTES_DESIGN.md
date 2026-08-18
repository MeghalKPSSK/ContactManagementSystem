# Dynamic Custom Attributes for Contacts — Design Doc

This document proposes a complete, incremental plan to add per-user, dynamic custom attributes for Contacts without changing the existing `contacts` table. It fits the current stack (MySQL, Express, React) and your encryption pattern (encryptId/decryptId in SQL).

- Scope: Backend first, then Frontend.
- Principle: Attribute definitions live at the user level; attribute values live per contact; no changes to `contacts` table.

---

## Goals
- Let each user define up to N custom attributes (Free: 3; Paid: 5 or 10).
- Attribute = key/value pair with type and optional options.
- Supported types: `text`, `number`, `date`, `boolean`, `select`, `radio`.
- Only user’s own attributes appear on their contact forms (add/edit/view).
- Store values separately so the `contacts` table remains unchanged.
- Prepare for import/export of attributes.

## Non-Goals
- Global attribute sets shared across users.
- Full-blown form builder (we only support common field types now).

## Current System References
- DB: MySQL with helper SQL functions `encryptId(...)` and `decryptId(...)` used at the SQL layer.
- Server: Express routes under `/contacts`, `/users`, etc.; models per domain in `apps/api/models`.
- Encryption: Encrypted IDs are returned to clients; API accepts encrypted IDs in params/bodies.
- Contact tags already exist and provide a similar mapping pattern you can mirror.

---

## Backend (Level 1) ✅

### 1. Database Schema (additive)
No changes to `contacts`. Add two new tables.

1) `custom_attributes` — per-user definitions
```
CREATE TABLE IF NOT EXISTS custom_attributes (
    pk_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    key_name VARCHAR(64) NOT NULL,      -- machine key, unique per user
    label VARCHAR(100) NOT NULL,        -- display label
    type ENUM('text','number','date','boolean','select','radio') NOT NULL,
    options_json JSON NULL,             -- array of options for select/radio
    is_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    createdOn DATETIME DEFAULT CURRENT_TIMESTAMP,
    modifiedOn DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ca_user FOREIGN KEY (user_id) REFERENCES app_user(pk_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_key (user_id, key_name),
    INDEX idx_user (user_id),
    INDEX idx_active (is_active)
);
```

2) `contact_attribute_values` — per-contact values
```
CREATE TABLE IF NOT EXISTS contact_attribute_values (
    contact_id INT NOT NULL,
    attribute_id INT NOT NULL,
    value_text TEXT NULL,               -- store raw string; app interprets by type
    createdOn DATETIME DEFAULT CURRENT_TIMESTAMP,
    modifiedOn DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (contact_id, attribute_id),
    CONSTRAINT fk_cav_contact FOREIGN KEY (contact_id) REFERENCES contacts(pk_id) ON DELETE CASCADE,
    CONSTRAINT fk_cav_attribute FOREIGN KEY (attribute_id) REFERENCES custom_attributes(pk_id) ON DELETE CASCADE,
    INDEX idx_contact (contact_id),
    INDEX idx_attribute (attribute_id)
);
```

Notes
- Keep `options_json` for flexibility; you can normalize to an options table later if needed.
- Use `is_active` to soft-disable an attribute without losing historical values.

Migration wiring
- Create `apps/api/dbInit/schemas/customAttributesSchema.js` mirroring the style of `contactSchema.js` and `userSchema.js`.
- Update `dbInit/init.js` to call your new ensure function so tables are created/validated on startup.

### 2. Subscription & Limits
Use existing `app_user.role` or add a small plan resolver in code:
- Free: max 3 attributes
- Pro: max 5 attributes
- Enterprise: max 10 attributes

Enforcement points
- On `POST /contacts/customAttributes` check current active attribute count for the user.
- Optionally, prevent re-activation if the limit would be exceeded.

### 3. APIs (proposed)
Add routes to `apps/api/Routes/contactRoutes.js` (co-locate with contacts domain):

Attribute definitions
- GET `/contacts/customAttributes?userId=<uid>` → list active + inactive (optionally filter by `is_active`)
- POST `/contacts/customAttributes` → create definition
- PUT `/contacts/customAttributes/:attrId` → update definition (prefer restricting `key_name` changes; allow `label`, `sort_order`, `is_required`, `is_active`, `options_json`)
- DELETE or PATCH `/contacts/customAttributes/:attrId` → soft disable via `is_active=false`

Contact attribute values
- GET `/contacts/contact/:contactId/attributes` → list values merged with definitions
- PUT `/contacts/contact/:contactId/attributes` → upsert array of `{ key_name, value }`

Data contracts
- Definition (server response)
```
{
  uid: string,             // encryptId(pk_id)
  key_name: string,
  label: string,
  type: 'text'|'number'|'date'|'boolean'|'select'|'radio',
  options: string[] | null,
  is_required: boolean,
  is_active: boolean,
  sort_order: number
}
```
- Create/Update definition (request)
```
{
  userId: string,          // encrypted uid
  key_name: string,
  label: string,
  type: 'text'|'number'|'date'|'boolean'|'select'|'radio',
  options?: string[],
  is_required?: boolean,
  is_active?: boolean,
  sort_order?: number
}
```
- Contact attribute values (GET values)
```
{
  attributes: [
    {
      key_name: string,
      label: string,
      type: string,
      options: string[] | null,
      value: string | null
    }
  ]
}
```
- Contact attribute values (PUT upsert)
```
{
  values: [ { key_name: string, value: string | number | boolean | null } ]
}
```

### 4. Validation & Rules
- `key_name`: lowercase letters, numbers, underscore only (e.g., `/^[a-z0-9_]{2,64}$/`). Must be unique per user.
- `type`:
  - `text`: optional max length check (e.g., 500)
  - `number`: must parse to finite number
  - `date`: ISO `YYYY-MM-DD`
  - `boolean`: `true`/`false`
  - `select`/`radio`: `options_json` must be array of strings; value must be in options
- `is_required`: only enforced when writing contact values; server should validate on upsert
- `is_active=false`: read-only (show existing values but don’t allow updates) unless explicitly allowed

### 5. Model Layer (new or extend existing)
Recommended: add a new `customAttributesModel.js` in `apps/api/models/` to keep concerns separate, but you can also co-locate small helpers in `contactModel.js`.

Core functions (pseudocode hints use your existing SQL encryption style)
- `listDefinitions(userId)`
  - `SELECT encryptId(pk_id) uid, key_name, label, type, JSON_EXTRACT(options_json, '$') as options, is_required, is_active, sort_order FROM custom_attributes WHERE user_id = decryptId(?) ORDER BY is_active DESC, sort_order, pk_id`.
- `createDefinition(def)`
  - Enforce limit; insert with `user_id = decryptId(?)`.
- `updateDefinition(attrId, patch)`
  - Map fields, forbid `key_name` change (or handle carefully).
- `getContactAttributeValues(contactId)`
  - Join defs + left join values:
  - `SELECT d.key_name, d.label, d.type, d.options_json, v.value_text FROM custom_attributes d LEFT JOIN contact_attribute_values v ON v.attribute_id = d.pk_id AND v.contact_id = decryptId(?) WHERE d.user_id = (SELECT user_id FROM contacts WHERE pk_id = decryptId(?)) AND d.is_active IN (1,0)` (or filter active only).
- `upsertContactAttributeValues(contactId, [{key_name, value}])`
  - Resolve each `key_name` → `attribute_id` for that contact’s user.
  - Type-validate `value` against `type` and `options_json`.
  - `INSERT ... ON DUPLICATE KEY UPDATE value_text = VALUES(value_text), modifiedOn = CURRENT_TIMESTAMP` for each.

### 6. Security & Isolation
- Always scope definitions by `userId` and ensure `contactId` belongs to that user.
- Keep using encrypted IDs at API boundaries.

### 7. Performance
- Indexes provided above.
- Batch upserts for values in a single statement if needed; otherwise one by one is fine initially.
- Cache definitions per user in memory (optional, phase 2).

### 8. Test Plan (API)
- Create defs up to plan limit; expect 200; exceeding → 400 with message.
- Create contact; upsert values with valid/invalid data by type; ensure validation responses.
- Deactivate attribute; ensure it’s hidden or read-only per policy.
- Delete contact; verify cascading delete removes values.

---

## Frontend (Level 2)

### 1. API Service
Extend `apps/web/src/services/apiService.js` with methods that match the endpoints. Use the existing `fetch` wrapper and `configService`.
- `getCustomAttributes(userId)` → GET `/contacts/customAttributes?userId=...`
- `createCustomAttribute(def)` → POST `/contacts/customAttributes`
- `updateCustomAttribute(attrId, patch)` → PUT `/contacts/customAttributes/:attrId`
- `getContactAttributes(contactId)` → GET `/contacts/contact/:contactId/attributes`
- `upsertContactAttributes(contactId, values)` → PUT `/contacts/contact/:contactId/attributes`

Note: Ensure `configService.loadConfig()` is called early in app bootstrap so `apiService.getConfig()` is safe.

### 2. Configuration UI (User-level)
Add a simple screen to manage custom fields (e.g., under Profile/Settings):
- List definitions; add/edit/delete (or deactivate) with type and options editor.
- Show remaining count based on plan; disable add button when limit reached.
- Validate `key_name` and options on the client before sending.

Suggested placement
- `apps/web/src/components/Profile/CustomFields.jsx` (or a new Settings folder), with a menu entry in sidebar if desired.

### 3. ContactModal dynamic rendering
In `ContactModal.jsx`:
- On mount:
  - Fetch definitions for the current user.
  - If editing, fetch existing contact attribute values and merge into local form state.
- Render section "Custom Fields" below the current form rows:
  - For each definition, render control based on `type`:
    - `text` → input type=text
    - `number` → input type=number (validate numeric)
    - `date` → input type=date (ISO)
    - `boolean` → checkbox/switch
    - `select` → select options
    - `radio` → radio group
  - Respect `is_required` (add visual indicator and client validation).
- On submit:
  - Continue existing contact save/update first (as is).
  - Then call `upsertContactAttributes(contactUid, values)` with the mapped array `{ key_name, value }`.
- In view mode:
  - Render a read-only summary list of label → value.

UX Guidance
- Keep it minimal; group under a heading.
- For `select/radio`, render options from `options` array.
- Validate lightly on the client; rely on server as source of truth.

### 4. Import/Export (Phase 3)
- Export CSV: base contact columns + one column per user’s `key_name`.
- Import CSV: map headers to base fields and to matching `key_name` defs for that user.
  - Pre-validate values by type; show error rows summary.

---

## Rollout Plan
1) Backend Phase
   - Add tables via new `customAttributesSchema.js` and wire into dbInit.
   - Implement model and route handlers.
   - Add validation and plan-limit enforcement.
   - Smoke test with Postman.

2) Frontend Phase
   - Add API methods to `apiService`.
   - Build Custom Fields screen (add/edit/deactivate, options editor).
   - Update `ContactModal` to render dynamic fields and call upsert API after core save.
   - Add basic toasts and inline validations.

3) Quality & Polish
   - Pagination for definitions if needed.
   - Empty states and helpful tooltips.
   - Optional caching of definitions per user.

4) Import/Export Phase (optional)
   - Export first; then import with mapping UI.

---

## Edge Cases
- Renaming `key_name`: avoid if possible; prefer immutable key. If supported, update both definitions and values in a transaction.
- Deactivating attributes: hide from input forms but keep values for historical display; do not enforce required when inactive.
- Cross-user isolation: ensure `contactId` belongs to the same `userId` when upserting values.
- Large option lists: keep options under ~200 per field (UI/JSON size constraints).

---

## Security & Compliance
- Maintain current encrypted ID contract: API accepts/returns encrypted `uid`s and decrypts in SQL.
- Validate all inputs on server, including type and options membership.
- Follow current auth/session practices (re-use existing login validation and localStorage user usage on the client).

---

## Appendix: Example Queries

Insert a new attribute (server-side SQL shape)
```
INSERT INTO custom_attributes (
  user_id, key_name, label, type, options_json, is_required, is_active, sort_order
) VALUES (
  (SELECT decryptId(?)), ?, ?, ?, CAST(? AS JSON), ?, ?, ?
);
```

Upsert contact value
```
INSERT INTO contact_attribute_values (contact_id, attribute_id, value_text)
VALUES ((SELECT decryptId(?)), (SELECT decryptId(?)), ?)
ON DUPLICATE KEY UPDATE
  value_text = VALUES(value_text),
  modifiedOn = CURRENT_TIMESTAMP;
```

Join for read
```
SELECT d.key_name, d.label, d.type, JSON_EXTRACT(d.options_json, '$') AS options, v.value_text AS value
FROM custom_attributes d
LEFT JOIN contact_attribute_values v
  ON v.attribute_id = d.pk_id
  AND v.contact_id = (SELECT decryptId(?))
WHERE d.user_id = (
  SELECT user_id FROM contacts WHERE pk_id = (SELECT decryptId(?))
) AND d.is_active = 1
ORDER BY d.sort_order, d.pk_id;
```

---

This plan keeps your contacts table intact, leverages your existing encryption and route structure, and provides a clear path to dynamic per-user fields across backend and frontend.
