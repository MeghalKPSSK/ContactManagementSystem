// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import apiService from '../../services/apiService';
import styles from './CustomFields.module.css';

const typeOptions = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'select', label: 'Select' },
  { value: 'radio', label: 'Radio' },
];

export default function CustomFields({ open, onClose, plan: planProp }) {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [defs, setDefs] = useState([]);
  const [form, setForm] = useState({ key_name: '', label: '', type: 'text', options: '', is_required: false });
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState('free');
  const [editing, setEditing] = useState(null); // holds attr being edited or null
  const [dragIndex, setDragIndex] = useState(null);
  const [reordering, setReordering] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user'));
    if (u?.uid) setUserId(u.uid);
  }, []);

  const loadDefs = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await apiService.getCustomAttributes(userId);
      setDefs(res.attributes || []);
    } catch (e) {
      toast.error(e.message || 'Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadDefs(); }, [loadDefs]);

  // Reflect plan from prop immediately, fallback to localStorage and event listener
  useEffect(() => {
    if (planProp) setPlan(String(planProp).toLowerCase());
  }, [planProp]);

  useEffect(() => {
    if (!planProp) {
      const u = JSON.parse(localStorage.getItem('user'));
      if (u?.plan) setPlan(String(u.plan).toLowerCase());
    }
    const onProfile = (e) => {
      const newUser = e?.detail?.user;
      if (newUser?.plan) setPlan(String(newUser.plan).toLowerCase());
    };
    window.addEventListener('profileUpdated', onProfile);
    return () => window.removeEventListener('profileUpdated', onProfile);
  }, [planProp]);

  const activeCount = useMemo(() => defs.filter(d => d.is_active).length, [defs]);
  const planLimit = useMemo(() => {
    switch (plan) {
      case 'pro': return 5;
      case 'enterprise': return 10;
      default: return 3; // free
    }
  }, [plan]);

  // (reserved) last active index if we need to enforce strict grouping visuals

  const saveOrder = useCallback(async (newDefs) => {
    // Compute desired sort_order within status groups
    let activeOrder = 0;
    let inactiveOrder = 0;
    const updates = [];
    newDefs.forEach(d => {
      const desired = d.is_active ? activeOrder++ : inactiveOrder++;
      if (d.sort_order !== desired) {
        updates.push({ uid: d.uid, sort_order: desired });
      }
    });
    if (updates.length === 0) return;
    setReordering(true);
    try {
      await Promise.all(updates.map(u => apiService.updateCustomAttribute(u.uid, { sort_order: u.sort_order })));
      await loadDefs();
      toast.success('Order saved');
    } catch (e) {
      toast.error(e.message || 'Failed to save order');
    } finally {
      setReordering(false);
    }
  }, [loadDefs]);

  const onRowDrop = useCallback(async (targetIndex) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const src = defs[dragIndex];
    const tgt = defs[targetIndex];
    if (!src || !tgt) return;
    // prevent crossing Active/Inactive boundary (server sorts by is_active first)
    if (src.is_active !== tgt.is_active) {
      toast.info('Reorder within Active or Inactive sections only');
      setDragIndex(null);
      return;
    }
    const newDefs = [...defs];
    const [moved] = newDefs.splice(dragIndex, 1);
    newDefs.splice(targetIndex, 0, moved);
    setDefs(newDefs);
    setDragIndex(null);
    await saveOrder(newDefs);
  }, [defs, dragIndex, saveOrder]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!userId) return;
    const isChoice = ['select','radio'].includes(form.type);
    const optionsArr = isChoice ? form.options.split(',').map(s => s.trim()).filter(Boolean) : null;

    // Edit existing
    if (editing) {
      const patch = {
        label: form.label.trim(),
        type: form.type,
        is_required: !!form.is_required,
        options: isChoice ? optionsArr : null,
      };
      if (!patch.label) { toast.error('Label is required'); return; }
      if (isChoice && (!optionsArr || optionsArr.length === 0)) {
        toast.error('Please provide at least one option');
        return;
      }
      setSaving(true);
      try {
        await apiService.updateCustomAttribute(editing.uid, patch);
        toast.success('Field updated');
        setEditing(null);
        setForm({ key_name: '', label: '', type: 'text', options: '', is_required: false });
        await loadDefs();
      } catch (e2) {
        toast.error(e2.message || 'Failed to update');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Create new
    const payload = {
      userId,
      key_name: form.key_name.trim(),
      label: form.label.trim(),
      type: form.type,
      is_required: !!form.is_required,
      is_active: true,
      options: optionsArr,
    };
    if (!/^[a-z0-9_]{2,64}$/.test(payload.key_name)) {
      toast.error('Key must be 2-64 chars: lowercase letters, numbers, underscore');
      return;
    }
    if (!payload.label) { toast.error('Label is required'); return; }
    if (isChoice && (!optionsArr || optionsArr.length === 0)) {
      toast.error('Please provide at least one option');
      return;
    }
    setSaving(true);
    try {
      await apiService.createCustomAttribute(payload);
      toast.success('Custom field created');
      setForm({ key_name: '', label: '', type: 'text', options: '', is_required: false });
      await loadDefs();
    } catch (e) {
      toast.error(e.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const toggleRequired = async (attr) => {
    try {
      await apiService.updateCustomAttribute(attr.uid, { is_required: !attr.is_required });
      await loadDefs();
    } catch (e) {
      toast.error(e.message || 'Failed to update');
    }
  };

  const handleDelete = async (attr) => {
    const proceed = window.confirm('Deleting this field may lead to data loss for contacts that used it. Do you want to proceed?');
    if (!proceed) return;
    try {
      await apiService.updateCustomAttribute(attr.uid, { is_active: false });
      await loadDefs();
      toast.success('Field deactivated');
    } catch (e) {
      toast.error(e.message || 'Failed to delete');
    }
  };

  if (!open) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <h3>Manage Custom Fields: Plan ({plan.toUpperCase()}) </h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.body}>
          {/* <div className={styles.listHeader}>
            <div className={styles.listHeaderTitle}>Custom Fields</div>
            <div className={styles.listHeaderHint}>Drag to reorder</div>
          </div> */}
          <div className={styles.toolbar}>
            <div className={styles.planInfo} title={`Your plan allows up to ${planLimit} active custom fields`}>
              Active: {activeCount}/{planLimit} ({plan}) {reordering ? '• Saving order…' : ''}
            </div>
            <div className={styles.planInfo} title="Upgrade plan to increase your field limit">💡 Upgrade to add more fields</div>
          </div>
          <form ref={formRef} className={styles.addForm} onSubmit={handleCreate}>
            <input type="text" placeholder="key_name (e.g. twitter_handle)" value={form.key_name} disabled={!!editing} onChange={e => setForm({ ...form, key_name: e.target.value })} />
            <input type="text" placeholder="Label" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {['select','radio'].includes(form.type) ? (
              <input type="text" placeholder="Options (comma-separated)" value={form.options} onChange={e => setForm({ ...form, options: e.target.value })} />
            ) : (
              <div />
            )}
            <label>
              <input type="checkbox" checked={form.is_required} onChange={e => setForm({ ...form, is_required: e.target.checked })} /> Required
            </label>
            {(() => {
              const addDisabled = saving || (!editing && activeCount >= planLimit);
              const addTitle = addDisabled && !editing && activeCount >= planLimit ? `Plan limit reached (max ${planLimit})` : undefined;
              return (
                <button type="submit" className={styles.addButton} disabled={addDisabled} title={addTitle}>
                  {editing ? 'Update Field' : 'Add Field'}
                </button>
              );
            })()}
          </form>
          {editing && (
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
              <button className={styles.secondaryButton} onClick={() => { setEditing(null); setForm({ key_name: '', label: '', type: 'text', options: '', is_required: false }); }}>Cancel Edit</button>
            </div>
          )}

          {activeCount >= planLimit && (
            <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
              Plan limit reached. Deactivate a field or upgrade your plan to add more.
            </div>
          )}

          {loading ? (
            <div style={{ marginTop: 12 }}>Loading fields...</div>
          ) : defs.length === 0 ? (
            <div style={{ marginTop: 12 }}>No custom fields yet.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 24 }}></th>
                  <th>Field Name</th>
                  <th>Key</th>
                  <th className={styles.center}>Type</th>
                  <th className={styles.center}>Required</th>
                  <th className={styles.center}>Status</th>
                  <th className={styles.center}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {defs.map((d, idx) => (
                  <tr
                    key={d.uid}
                    data-index={idx}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const targetIdx = Number(e.currentTarget.getAttribute('data-index'));
                      onRowDrop(targetIdx);
                    }}
                    title={d.is_active ? 'Active field' : 'Inactive field'}
                  >
                    <td className={styles.handle}>
                      <span
                        draggable
                        onDragStart={() => setDragIndex(idx)}
                        onDragEnd={() => setDragIndex(null)}
                        title={d.is_active ? 'Drag to reorder within Active' : 'Drag to reorder within Inactive'}
                      >
                        ⋮⋮
                      </span>
                    </td>
                    <td className={styles.fieldName}>{d.label}</td>
                    <td><code className={styles.keyChip}>{d.key_name}</code></td>
                    <td className={styles.center}>
                      <span className={`${styles.typePill} ${styles[`type_${d.type}`]}`}>{String(d.type).toUpperCase()}</span>
                    </td>
                    <td className={styles.center}>
                      <span className={d.is_required ? styles.requiredDot : styles.requiredDotOff} onClick={() => toggleRequired(d)} title={d.is_required ? 'Required' : 'Optional'} />
                    </td>
                    <td className={styles.center}>
                      <span className={styles.statusWrap}>
                        <span className={`${styles.statusDot} ${d.is_active ? styles.statusActive : styles.statusInactive}`} />
                        <span className={d.is_active ? styles.statusTextActive : styles.statusTextInactive} title={d.is_active ? 'This field is active and visible in Contact forms' : 'This field is inactive; existing values are preserved'}>{d.is_active ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>
                    <td className={styles.actions}>
                      {d.is_active ? (
                        <>
                          <button className={styles.secondaryButton} onClick={() => {
                            setEditing(d);
                            setForm({
                              key_name: d.key_name,
                              label: d.label,
                              type: d.type,
                              options: Array.isArray(d.options) ? d.options.join(', ') : '',
                              is_required: !!d.is_required,
                            });
                            // Smooth scroll to the form for better UX
                            setTimeout(() => {
                              formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 0);
                          }}>Edit</button>
                          <button className={styles.dangerButton} onClick={() => handleDelete(d)}>Inactive</button>
                        </>
                      ) : (
                        <button
                          className={styles.primaryButton}
                          disabled={activeCount >= planLimit}
                          title={activeCount >= planLimit ? `Plan limit reached (max ${planLimit})` : 'Activate this field'}
                          onClick={async () => {
                            if (activeCount >= planLimit) {
                              toast.error(`Plan limit reached (max ${planLimit}).`);
                              return;
                            }
                            try {
                              await apiService.updateCustomAttribute(d.uid, { is_active: true });
                              await loadDefs();
                              toast.success('Field activated');
                            } catch (e) {
                              toast.error(e.message || 'Failed to activate');
                            }
                          }}
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
