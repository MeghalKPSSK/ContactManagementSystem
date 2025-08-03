import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser,
  faAngleLeft,
  faAngleRight,
  faAnglesLeft,
  faAnglesRight
} from '@fortawesome/free-solid-svg-icons';
import styles from './GroupModal.module.css';

// Add this constant for pagination
const MAX_PAGES_SHOWN = 5;

// Add this helper function
const getPageNumbers = (current, total, pageSize) => {
  const totalPages = Math.ceil(total / pageSize);
  const pages = [];
  let startPage = Math.max(1, current - Math.floor(MAX_PAGES_SHOWN / 2));
  let endPage = Math.min(totalPages, startPage + MAX_PAGES_SHOWN - 1);

  if (endPage - startPage + 1 < MAX_PAGES_SHOWN) {
    startPage = Math.max(1, endPage - MAX_PAGES_SHOWN + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  return pages;
};

export default function MemberModal({ show, onClose, onSubmit, member, mode, contacts = [], group }) {
  const [selectedUids, setSelectedUids] = useState([]);
  const [contactsList, setContactsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0
  });

  useEffect(() => {
    if (mode === 'edit' && member) {
      setSelectedUids([member.uid]);
    } else {
      setSelectedUids([]);
    }
  }, [member, mode]);

  // Fetch contacts with pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(pagination.total / pagination.pageSize)) {
      setPagination(prev => ({
        ...prev,
        current: newPage
      }));
      fetchContacts(newPage);
    }
  };

  const fetchContacts = async (page = 1) => {
    if (!show || mode === 'edit') return; // Only fetch for add mode
    
    setLoading(true);
    try {
      const config = await fetch('/config.json').then(res => res.json());
      const userId = JSON.parse(localStorage.getItem('user')).uid;
      const groupId = group?.uid || '';
      
      const params = new URLSearchParams({
        userId,
        groupId,
        page,
        pageSize: pagination.pageSize
      });
      
      const response = await fetch(`${config.apiUrl}/contacts/contactsList?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setContactsList(data.contacts);
        setPagination(prev => ({
          ...prev,
          current: page,
          total: data.pagination?.total || data.contacts.length
        }));
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch contacts when modal opens in add mode
  useEffect(() => {
    if (show && mode === 'add') {
      fetchContacts(1);
    }
  }, [show, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null;

  const handleSubmit = e => {
    e.preventDefault();
    if (selectedUids.length === 0) return;
    
    if (mode === 'edit') {
      // For edit mode, only allow single selection
      const selectedContact = contacts.find(c => c.uid === selectedUids[0]);
      onSubmit({ ...selectedContact, uid: selectedUids[0] });
    } else {
      // For add mode, handle multiple selections from contactsList
      const selectedContacts = contactsList.filter(c => selectedUids.includes(c.uid));
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

  // Use appropriate contacts list based on mode
  const currentContacts = mode === 'edit' ? contacts : contactsList;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: 1000, maxHeight: 'none', width: '90vw', minHeight: '60vh' }}>
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
              {loading ? (
                <div className={styles.loading}>Loading contacts...</div>
              ) : currentContacts.length > 0 ? (
                <>
                  <table className={styles.contactsTable}>
                    <thead>
                      <tr>
                        <th style={{width: '40px'}}>
                          {mode === 'add' && (
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUids(currentContacts.map(c => c.uid));
                                } else {
                                  setSelectedUids([]);
                                }
                              }}
                              checked={selectedUids.length === currentContacts.length && currentContacts.length > 0}
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
                      {currentContacts.map(contact => (
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
                  {mode === 'add' && pagination.total > pagination.pageSize && (
                    <div className={styles.paginationContainer}>
                      <div className={styles.paginationControls}>
                        <button
                          type="button"
                          className={`${styles.paginationButton} ${styles.iconButton}`}
                          onClick={() => handlePageChange(1)}
                          disabled={pagination.current === 1 || loading}
                          title="First Page"
                        >
                          <FontAwesomeIcon icon={faAnglesLeft} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.paginationButton} ${styles.iconButton}`}
                          onClick={() => handlePageChange(pagination.current - 1)}
                          disabled={pagination.current === 1 || loading}
                          title="Previous Page"
                        >
                          <FontAwesomeIcon icon={faAngleLeft} />
                        </button>
                        {getPageNumbers(pagination.current, pagination.total, pagination.pageSize).map(pageNum => (
                          <button
                            key={pageNum}
                            type="button"
                            className={`${styles.paginationButton} ${pageNum === pagination.current ? styles.active : ''}`}
                            onClick={() => handlePageChange(pageNum)}
                            disabled={loading}
                          >
                            {pageNum}
                          </button>
                        ))}
                        <button
                          type="button"
                          className={`${styles.paginationButton} ${styles.iconButton}`}
                          onClick={() => handlePageChange(pagination.current + 1)}
                          disabled={pagination.current * pagination.pageSize >= pagination.total || loading}
                          title="Next Page"
                        >
                          <FontAwesomeIcon icon={faAngleRight} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.paginationButton} ${styles.iconButton}`}
                          onClick={() => handlePageChange(Math.ceil(pagination.total / pagination.pageSize))}
                          disabled={pagination.current * pagination.pageSize >= pagination.total || loading}
                          title="Last Page"
                        >
                          <FontAwesomeIcon icon={faAnglesRight} />
                        </button>
                      </div>
                      <div className={styles.paginationInfo}>
                        Showing {currentContacts.length ? (pagination.current - 1) * pagination.pageSize + 1 : 0} 
                        - {Math.min(pagination.current * pagination.pageSize, pagination.total)} 
                        &nbsp; of {pagination.total} entries
                      </div>
                    </div>
                  )}
                </>
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