import React, { useState, useEffect } from 'react';
import styles from './GroupModal.module.css';

export default function MemberModal({ show, onClose, onSubmit, member, mode, contacts = [] }) {
  const [selectedUid, setSelectedUid] = useState('');

  useEffect(() => {
    if (mode === 'edit' && member) {
      setSelectedUid(member.uid);
    } else {
      setSelectedUid('');
    }
  }, [member, mode]);

  if (!show) return null;

  const handleSubmit = e => {
    e.preventDefault();
    if (!selectedUid) return;
    const selectedContact = contacts.find(c => c.uid === selectedUid);
    onSubmit({ ...selectedContact, uid: selectedUid });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: 400 }}>
        <div className={styles.modalHeader}>
          <h2>{mode === 'edit' ? 'Edit Member' : 'Add Member'}</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        <form className={styles.groupForm} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label data-required="true">Select Contact</label>
            <select
              className={styles.input}
              value={selectedUid}
              onChange={e => setSelectedUid(e.target.value)}
              required
              disabled={mode === 'edit'}
            >
              <option value="">-- Select --</option>
              {contacts.map(c => (
                <option key={c.uid} value={c.uid}>
                  {c.firstName} {c.lastName} ({c.email})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.submitButton}>
              {mode === 'edit' ? 'Update' : 'Add'}
            </button>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}