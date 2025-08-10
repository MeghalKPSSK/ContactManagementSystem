const initDB = require('../db');

// Resolve per-plan limits. Prefers explicit app_user.plan; falls back to role.
const getUserAttributeLimit = (planOrRole) => {
  const v = (planOrRole || '').toString().toLowerCase();
  switch (v) {
    case 'free':
    case 'user':
      return 3;
    case 'pro':
      return 5;
    case 'enterprise':
    case 'admin':
      return 10;
    default:
      return 3;
  }
};

const customAttributesModel = async () => {
  const pool = await initDB();

  // List definitions for a user
  const listDefinitions = async (userId, includeInactive = true) => {
    const whereActive = includeInactive ? '' : 'AND is_active = 1';
    const [rows] = await pool.execute(
      `SELECT 
         (SELECT encryptId(pk_id)) AS uid,
         key_name,
         label,
         type,
         JSON_EXTRACT(options_json, '$') AS options,
         is_required,
         is_active,
         sort_order,
         createdOn,
         modifiedOn
       FROM custom_attributes
       WHERE user_id = (SELECT decryptId(?)) ${whereActive}
       ORDER BY is_active DESC, sort_order, pk_id`,
      [userId]
    );
    // MySQL returns JSON as string sometimes; normalize to array/null
    return rows.map(r => ({
      ...r,
      options: typeof r.options === 'string' ? JSON.parse(r.options) : r.options,
    }));
  };

  // Create a new attribute definition with limit enforcement
  const createDefinition = async (def) => {
    const { userId, key_name, label, type, options = null, is_required = false, is_active = true, sort_order = 0 } = def;

    // Enforce plan limits
    const [userRows] = await pool.execute(
      `SELECT COALESCE(NULLIF(plan, ''), role) AS plan_or_role FROM app_user WHERE pk_id = (SELECT decryptId(?)) AND is_deleted = 0`,
      [userId]
    );
    if (!userRows.length) throw new Error('Invalid user');

    const limit = getUserAttributeLimit(userRows[0].plan_or_role);

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM custom_attributes WHERE user_id = (SELECT decryptId(?)) AND is_active = 1`,
      [userId]
    );
    if (countRows[0].cnt >= limit) {
      const msg = `Attribute limit reached for plan (max ${limit})`;
      const err = new Error(msg);
      err.status = 400;
      throw err;
    }

    // Validate basics
    if (!/^[a-z0-9_]{2,64}$/.test(key_name)) {
      const err = new Error('Invalid key_name (use lowercase letters, numbers, underscore)');
      err.status = 400;
      throw err;
    }
    const allowedTypes = ['text','number','date','boolean','select','radio'];
    if (!allowedTypes.includes(type)) {
      const err = new Error('Invalid type');
      err.status = 400;
      throw err;
    }
    let optionsJson = null;
    if (['select','radio'].includes(type)) {
      if (!Array.isArray(options) || options.some(o => typeof o !== 'string')) {
        const err = new Error('Options must be an array of strings');
        err.status = 400;
        throw err;
      }
      optionsJson = JSON.stringify(options);
    }

    const [result] = await pool.execute(
      `INSERT INTO custom_attributes (user_id, key_name, label, type, options_json, is_required, is_active, sort_order)
       VALUES ((SELECT decryptId(?)), ?, ?, ?, ?, ?, ?, ?)`,
      [userId, key_name, label, type, optionsJson, !!is_required, !!is_active, sort_order]
    );

    const [row] = await pool.execute(
      `SELECT (SELECT encryptId(pk_id)) AS uid, key_name, label, type, JSON_EXTRACT(options_json, '$') AS options, is_required, is_active, sort_order
       FROM custom_attributes WHERE pk_id = ?`,
      [result.insertId]
    );
    const r = row[0];
    return { ...r, options: typeof r.options === 'string' ? JSON.parse(r.options) : r.options };
  };

  // Update definition (restrict key_name changes by default)
  const updateDefinition = async (attrId, patch) => {
    // If re-activating, ensure plan limit isn't exceeded
    if (patch.is_active === true) {
      const [infoRows] = await pool.execute(
        `SELECT d.user_id, d.is_active AS current_active, COALESCE(NULLIF(u.plan, ''), u.role) AS plan_or_role
         FROM custom_attributes d
         JOIN app_user u ON u.pk_id = d.user_id
         WHERE d.pk_id = (SELECT decryptId(?))`,
        [attrId]
      );
      if (!infoRows.length) {
        const err = new Error('Attribute not found');
        err.status = 404;
        throw err;
      }
      const { user_id, current_active, plan_or_role } = infoRows[0];
      if (!current_active) {
        const limit = getUserAttributeLimit(plan_or_role);
        const [cntRows] = await pool.execute(
          `SELECT COUNT(*) AS cnt FROM custom_attributes WHERE user_id = ? AND is_active = 1`,
          [user_id]
        );
        if (cntRows[0].cnt >= limit) {
          const err = new Error(`Cannot activate attribute: plan limit reached (max ${limit})`);
          err.status = 400;
          throw err;
        }
      }
    }

    const fields = [];
    const params = [];

    if (patch.label !== undefined) { fields.push('label = ?'); params.push(patch.label); }
    if (patch.type !== undefined) {
      const allowedTypes = ['text','number','date','boolean','select','radio'];
      if (!allowedTypes.includes(patch.type)) {
        const err = new Error('Invalid type');
        err.status = 400;
        throw err;
      }
      fields.push('type = ?'); params.push(patch.type);
    }
    if (patch.options !== undefined) {
      if (patch.options === null) {
        fields.push('options_json = NULL');
      } else if (Array.isArray(patch.options) && patch.options.every(o => typeof o === 'string')) {
        fields.push('options_json = CAST(? AS JSON)'); params.push(JSON.stringify(patch.options));
      } else {
        const err = new Error('Options must be an array of strings or null');
        err.status = 400;
        throw err;
      }
    }
    if (patch.is_required !== undefined) { fields.push('is_required = ?'); params.push(!!patch.is_required); }
    if (patch.is_active !== undefined) { fields.push('is_active = ?'); params.push(!!patch.is_active); }
    if (patch.sort_order !== undefined) { fields.push('sort_order = ?'); params.push(patch.sort_order|0); }

    if (!fields.length) return false;

    const [res] = await pool.execute(
      `UPDATE custom_attributes SET ${fields.join(', ')}, modifiedOn = NOW() WHERE pk_id = (SELECT decryptId(?))`,
      [...params, attrId]
    );
    return res.affectedRows > 0;
  };

  // Get attributes (defs + values) for a contact
  const getContactAttributes = async (contactId, includeInactive = false) => {
    const activeClause = includeInactive ? '' : 'AND d.is_active = 1';
    const [rows] = await pool.execute(
      `SELECT 
         d.key_name,
         d.label,
         d.type,
         JSON_EXTRACT(d.options_json, '$') AS options,
         v.value_text AS value
       FROM custom_attributes d
       JOIN contacts c ON c.user_id = d.user_id
       LEFT JOIN contact_attribute_values v 
         ON v.attribute_id = d.pk_id 
        AND v.contact_id = (SELECT decryptId(?))
       WHERE c.pk_id = (SELECT decryptId(?))
       ${activeClause}
       ORDER BY d.sort_order, d.pk_id`,
      [contactId, contactId]
    );
    return rows.map(r => ({
      ...r,
      options: typeof r.options === 'string' ? JSON.parse(r.options) : r.options,
    }));
  };

  // Upsert values for a contact: values = [{ key_name, value }]
  const upsertContactAttributes = async (contactId, values) => {
    if (!Array.isArray(values)) {
      const err = new Error('values must be an array');
      err.status = 400;
      throw err;
    }

    // Resolve definitions for the contact's user
    const [defs] = await pool.execute(
      `SELECT d.pk_id, d.key_name, d.type, d.is_active, d.is_required, JSON_EXTRACT(d.options_json, '$') AS options
       FROM custom_attributes d
       JOIN contacts c ON c.user_id = d.user_id
       WHERE c.pk_id = (SELECT decryptId(?))`,
      [contactId]
    );

    const defByKey = new Map(defs.map(d => [d.key_name, {
      ...d,
      options: typeof d.options === 'string' ? JSON.parse(d.options) : d.options,
    }]));
    const requiredDefs = defs.filter(d => d.is_active && d.is_required);

    // Load current values for required fields to allow partial updates
    let currentReqValues = new Map();
    if (requiredDefs.length) {
      const ids = requiredDefs.map(d => d.pk_id);
      const placeholders = ids.map(() => '?').join(',');
      const [curRows] = await pool.execute(
        `SELECT attribute_id, value_text FROM contact_attribute_values 
         WHERE contact_id = (SELECT decryptId(?)) AND attribute_id IN (${placeholders})`,
        [contactId, ...ids]
      );
      currentReqValues = new Map(curRows.map(r => [r.attribute_id, r.value_text]));
    }

    // First pass: validate and prepare updates
    const updates = [];
    for (const item of values) {
      const { key_name, value } = item || {};
      const def = defByKey.get(key_name);
      if (!def) continue; // ignore unknown keys
      if (!def.is_active) continue; // ignore inactive

      // Type validation & normalization to string storage
      let strValue = null;
      if (value === null || value === undefined || value === '') {
        strValue = null; // allow clearing
      } else {
        switch (def.type) {
          case 'text':
            strValue = String(value);
            if (strValue.length > 500) {
              const err = new Error(`Value too long for ${key_name}`);
              err.status = 400;
              throw err;
            }
            break;
          case 'number':
            if (typeof value === 'string' && value.trim() === '') { strValue = null; break; }
            const num = Number(value);
            if (!Number.isFinite(num)) { const err = new Error(`Invalid number for ${key_name}`); err.status = 400; throw err; }
            strValue = String(num);
            break;
          case 'date':
            // Expect YYYY-MM-DD
            if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) { const err = new Error(`Invalid date for ${key_name}`); err.status = 400; throw err; }
            strValue = String(value);
            break;
          case 'boolean':
            strValue = (value === true || value === 'true') ? 'true' : (value === false || value === 'false') ? 'false' : null;
            if (strValue === null) { const err = new Error(`Invalid boolean for ${key_name}`); err.status = 400; throw err; }
            break;
          case 'select':
          case 'radio':
            if (!Array.isArray(def.options) || !def.options.includes(String(value))) {
              const err = new Error(`Invalid option for ${key_name}`);
              err.status = 400;
              throw err;
            }
            strValue = String(value);
            break;
          default:
            strValue = String(value);
        }
      }
      updates.push({ def, key_name, strValue });
    }

    // Enforce required: for each required def, ensure either incoming has non-null value or existing DB value present
    const missing = [];
    for (const d of requiredDefs) {
      const incoming = updates.find(u => u.def.pk_id === d.pk_id);
      const hasIncoming = incoming !== undefined;
      const incomingValid = hasIncoming ? (incoming.strValue !== null && incoming.strValue !== '') : false;
      const currentVal = currentReqValues.get(d.pk_id);
      const hasCurrent = currentVal !== undefined && currentVal !== null && String(currentVal) !== '';
      if (!incomingValid && !hasCurrent) {
        missing.push(d.key_name);
      }
    }
    if (missing.length) {
      const err = new Error(`Missing required attributes: ${missing.join(', ')}`);
      err.status = 400;
      throw err;
    }

    // Second pass: apply updates
    for (const u of updates) {
      await pool.execute(
        `INSERT INTO contact_attribute_values (contact_id, attribute_id, value_text)
         VALUES ((SELECT decryptId(?)), ?, ?)
         ON DUPLICATE KEY UPDATE value_text = VALUES(value_text), modifiedOn = CURRENT_TIMESTAMP`,
        [contactId, u.def.pk_id, u.strValue]
      );
    }

    return true;
  };

  return {
    listDefinitions,
    createDefinition,
    updateDefinition,
    getContactAttributes,
    upsertContactAttributes,
  };
};

module.exports = customAttributesModel;
