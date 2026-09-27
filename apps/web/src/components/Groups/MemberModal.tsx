// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faUser,
  faUsers,
  faCheckCircle,
  faSearch
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import styles from './GroupModal.module.css';
import PaginationBar from '../Pagination/PaginationBar';

const MemberModal = ({ show, onClose, onSubmit, mode, group }) => {
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [contactsList, setContactsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });

  const fetchContacts = async (page = 1, filter = searchFilter, pageSize = pagination.pageSize) => {
    if (!group?.uid) return;
    
    setLoading(true);
    try {
      const config = await fetch('/config.json').then(res => res.json());
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user.uid;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const url = new URL(`${config.apiUrl}/contacts/contactsForSelection`, window.location.origin);
      url.searchParams.append('userId', userId);
      url.searchParams.append('groupId', group.uid);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('pageSize', pageSize.toString());
      
      // Add search filter if provided
      if (filter && filter.trim()) {
        url.searchParams.append('filter', filter.trim());
        console.log('Adding filter parameter:', filter.trim());
      }

      console.log('Fetching contacts from:', url.toString());

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.success) {
        setContactsList(data.contacts || []);
        setPagination(data.pagination || { current: page, pageSize, total: 0, totalPages: 0 });
      } else {
        throw new Error(data.message || 'Failed to fetch contacts');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error(`Failed to load contacts: ${error.message}`);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  // Fetch contacts when modal opens or pagination changes
  useEffect(() => {
    if (show && mode === 'add') {
      // Reset search filter when modal opens
      setSearchFilter('');
      setSelectedContacts([]);
      fetchContacts(1, '');
    }
  }, [show, mode, group?.uid]);

  // Handle page changes
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.current) {
      fetchContacts(newPage);
    }
  };

  const handlePageSizeChange = (pageSize) => {
    setPagination((prev) => ({ ...prev, current: 1, pageSize }));
    fetchContacts(1, searchFilter, pageSize);
  };

  const handleRefresh = () => {
    fetchContacts(pagination.current, searchFilter, pagination.pageSize);
  };

  // Handle search functionality
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchFilter(value);
  };

  const handleSearchSubmit = () => {
    console.log('Search submitted with filter:', searchFilter);
    setIsSearching(true);
    // Reset to first page when searching
    fetchContacts(1, searchFilter);
  };

  const handleSearchClear = () => {
    console.log('Search cleared');
    setSearchFilter('');
    setIsSearching(true);
    // Fetch contacts without filter
    fetchContacts(1, '');
  };

  if (!show) return null;

  const handleSubmit = e => {
    e.preventDefault();
    if (selectedContacts.length === 0) return;
    
    if (mode === 'edit') {
      // For edit mode, only allow single selection
      const selectedContact = contactsList.find(c => c.uid === selectedContacts[0]);
      onSubmit({ ...selectedContact, uid: selectedContacts[0] });
    } else {
      // For add mode, handle multiple selections from contactsList
      const selectedContactsData = contactsList.filter(c => selectedContacts.includes(c.uid));
      onSubmit({ selectedContacts: selectedContactsData, uids: selectedContacts });
    }
  };

  const handleContactToggle = (contactUid) => {
    if (mode === 'edit') {
      // Edit mode: single selection only
      setSelectedContacts([contactUid]);
    } else {
      // Add mode: multiple selection
      setSelectedContacts(prev => 
        prev.includes(contactUid)
          ? prev.filter(uid => uid !== contactUid)
          : [...prev, contactUid]
      );
    }
  };

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectedContacts.length === contactsList.length && contactsList.length > 0) {
      // If all are selected, deselect all
      setSelectedContacts([]);
    } else {
      // Select all contacts on current page
      const allContactUids = contactsList.map(contact => contact.uid);
      setSelectedContacts(allContactUids);
    }
  };

  // Handle individual contact selection via checkbox
  const handleContactSelect = (contactUid) => {
    handleContactToggle(contactUid);
  };

  // Handle row click for contact selection
  const handleRowClick = (contactUid) => {
    handleContactToggle(contactUid);
  };

  const isSelected = (contactUid) => selectedContacts.includes(contactUid);

  return (
    <div className={`${styles.modalOverlay} ${show ? styles.show : ''}`}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <h2>
                <FontAwesomeIcon icon={faUsers} className={styles.headerIcon} />
                Add Members
              </h2>
              <p className={styles.headerSubtitle}>Select contacts to add to this group</p>
            </div>
            <div className={styles.headerRight}>
              <span className={styles.selectionCount}>
                <FontAwesomeIcon icon={faCheckCircle} className={styles.selectionIcon} />
                {selectedContacts.length} selected
              </span>
              <button className={styles.closeButton} onClick={onClose} title="Close">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>
        </div>

        {/* Search Filter Section - moved outside main form */}
        <div className={styles.searchSection}>
          <div className={styles.searchContainer}>
            <div className={styles.searchInputGroup}>
              <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchFilter}
                onChange={handleSearchChange}
                className={styles.searchInput}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchSubmit();
                  }
                }}
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className={styles.searchClearButton}
                  title="Clear search"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleSearchSubmit}
              className={styles.searchButton}
              title="Search contacts"
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p className={styles.loadingText}>Loading contacts...</p>
              </div>
            ) : contactsList.length > 0 ? (
              <div className={styles.contactsTableContainer}>
                <table className={styles.contactsTable}>
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          className={styles.headerCheckbox}
                          checked={selectedContacts.length === contactsList.length && contactsList.length > 0}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectAll();
                          }}
                        />
                      </th>
                      <th>Contact</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contactsList.map((contact) => (
                      <tr
                        key={contact.uid}
                        className={`${styles.contactRow} ${
                          selectedContacts.includes(contact.uid) ? styles.selectedRow : ''
                        }`}
                        onClick={() => handleRowClick(contact.uid)}
                      >
                        <td>
                          <input
                            type="checkbox"
                            className={styles.rowCheckbox}
                            checked={selectedContacts.includes(contact.uid)}
                            onChange={(e) => {
                              e.stopPropagation(); // Prevent row click
                              handleContactSelect(contact.uid);
                            }}
                            onClick={(e) => e.stopPropagation()} // Prevent row click
                          />
                        </td>
                        <td>
                          <div className={styles.contactTableIdentity}>
                          <div className={styles.contactTableAvatar}>
                            <div className={styles.contactTableIcon}>
                              <FontAwesomeIcon icon={faUser} />
                            </div>
                          </div>
                            <span className={styles.contactTableName}>
                              {contact.firstName} {contact.lastName}
                            </span>
                          </div>
                        </td>
                        <td className={styles.contactTableEmail}>{contact.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.noContactsContainer}>
                <FontAwesomeIcon icon={faUsers} className={styles.noContactsIcon} />
                <h3 className={styles.noContactsTitle}>No Contacts Available</h3>
                <p className={styles.noContactsText}>
                  All contacts are already members of this group or no contacts exist.
                </p>
              </div>
            )}

            {contactsList.length > 0 && (
              <PaginationBar
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={pagination.total}
                disabled={loading}
                onRefresh={handleRefresh}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </div>

          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={selectedContacts.length === 0}
            >
              Add {selectedContacts.length} Member{selectedContacts.length !== 1 ? 's' : ''}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberModal;