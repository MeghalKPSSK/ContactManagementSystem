import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import styles from './GroupModal.module.css';

export default function MemberModal({ show, onClose, onSubmit, member, mode, contacts = [] }) {
  const [selectedUids, setSelectedUids] = useState([]);

  useEffect(() => {
    if (mode === 'edit' && member) {
      setSelectedUids([member.uid]);
    } else {
      setSelectedUids([]);
    }
  }, [member, mode]);

  if (!show) return null;

  const handleSubmit = e => {
    e.preventDefault();
    if (selectedUids.length === 0) return;
    
    if (mode === 'edit') {
      // For edit mode, only allow single selection
      const selectedContact = contacts.find(c => c.uid === selectedUids[0]);
      onSubmit({ ...selectedContact, uid: selectedUids[0] });
    } else {
      // For add mode, handle multiple selections
      const selectedContacts = contacts.filter(c => selectedUids.includes(c.uid));
      onSubmit({ selectedContacts, uids: selectedUids });
    }
  };

  const handleContactToggle = (contactUid) => {
    if (mode === 'edit') {
      // Edit mode: single selection only
      setSelectedUids([contactUid]);
    } else {
      // Add mode: multiple selection
      setSelectedUids(prev => 
        prev.includes(contactUid)
          ? prev.filter(uid => uid !== contactUid)
          : [...prev, contactUid]
      );
    }
  };

  const isSelected = (contactUid) => selectedUids.includes(contactUid);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: 1000, maxHeight: '85vh', width: '90vw' }}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <h2>{mode === 'edit' ? 'Edit Member' : 'Add Members'}</h2>
            <span className={styles.selectionCount}>
              {mode === 'edit' ? 'Select Contact' : `Select Contacts (${selectedUids.length} selected)`}
            </span>
          </div>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        <form className={styles.groupForm} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <div className={styles.contactsTableContainer}>
              {contacts.length > 0 ? (
                <table className={styles.contactsTable}>
                  <thead>
                    <tr>
                      <th style={{width: '40px'}}>
                        {mode === 'add' && (
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUids(contacts.map(c => c.uid));
                              } else {
                                setSelectedUids([]);
                              }
                            }}
                            checked={selectedUids.length === contacts.length && contacts.length > 0}
                            className={styles.headerCheckbox}
                          />
                        )}
                      </th>
                      <th style={{width: '60px'}}>Photo</th>
                      <th>Name</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map(contact => (
                      <tr 
                        key={contact.uid}
                        className={`${styles.contactRow} ${isSelected(contact.uid) ? styles.selectedRow : ''}`}
                        onClick={() => handleContactToggle(contact.uid)}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected(contact.uid)}
                            onChange={() => handleContactToggle(contact.uid)}
                            className={styles.rowCheckbox}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td>
                          <div className={styles.contactTableAvatar}>
                            {contact.profile_image ? (
                              <img 
                                src={`${window.groupDetailsConfig?.apiUrl?.replace('/api', '')}/uploads/profiles/${contact.profile_image}`}
                                alt={contact.firstName}
                                className={styles.contactTableImage}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={styles.contactTableIcon} style={{ display: contact.profile_image ? 'none' : 'flex' }}>
                              <FontAwesomeIcon icon={faUser} />
                            </div>
                          </div>
                        </td>
                        <td className={styles.contactTableName}>
                          {contact.firstName} {contact.lastName}
                        </td>
                        <td className={styles.contactTableEmail}>
                          {contact.email}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className={styles.noContacts}>
                  No contacts available to add
                </div>
              )}
            </div>
          </div>
          <div className={styles.buttonGroup}>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={selectedUids.length === 0}
            >
              {mode === 'edit' ? 'Update' : `Add ${selectedUids.length} Member${selectedUids.length !== 1 ? 's' : ''}`}
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