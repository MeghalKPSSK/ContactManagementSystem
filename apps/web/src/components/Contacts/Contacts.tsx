// @ts-nocheck
import React, { useState, useEffect } from 'react';
import styles from './Contacts.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faSearch, 
  faEdit, 
  faTrash, 
  faEye, 
  faStar,
  faSync,
  faAngleLeft,
  faAngleRight,
  faAnglesLeft,
  faAnglesRight,
  faAddressBook
} from '@fortawesome/free-solid-svg-icons';
import ContactModal from './ContactModal';
import { toast } from 'react-toastify';
import apiService from '../../services/apiService';

// Add this constant at the top of the file
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

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
  const [contactUid, setSelectedContact] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Add pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // Update the fetchContacts function
  const fetchContacts = async (searchTerm, page = 1) => {
    setIsLoading(true);
    try {
      const userId = JSON.parse(localStorage.getItem('user')).uid;
      const params = new URLSearchParams({
        ...(searchTerm && { filter: searchTerm }),
        userId,
        page,
        pageSize: pagination.pageSize
      });
      
      const data = await apiService.fetch(`/contacts/contactsList?${params}`);
      
      if (data.success) {
        setContacts(data.contacts);
        setPagination(prev => ({
          ...prev,
          current: page,
          total: data.pagination?.total || 0
        }));
      } else {
        throw new Error(data.message || 'Failed to fetch contacts');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update useEffect
  useEffect(() => {
    fetchContacts(searchTerm, 1);
  }, []);
  
  // Update search handler
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page
    fetchContacts(searchTerm, 1);
  };

  // Update reload handler
  const handleReload = () => {
    fetchContacts(searchTerm, pagination.current);
  };

  const handleAdd = () => {
    setModalMode('add');
    setSelectedContact(null); // Don't pass UID for add mode
    setShowModal(true);
  };

  const handleEdit = (contact) => {
    setModalMode('edit');
    setSelectedContact(contact.uid); // Pass the UID from the row
    setShowModal(true);
  };

  const handleView = (contact) => {
    setModalMode('view');
    setSelectedContact(contact.uid); // Pass the UID from the row
    setShowModal(true);
  };

  const handleDelete = async (contactId) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        const data = await apiService.deleteContact(contactId);
        
        if (data.success) {
          toast.success(data.message);
          fetchContacts(searchTerm, pagination.current);
        } else {
          toast.error(data.message || 'Failed to delete contact');
        }
      } catch (error) {
        toast.error('Error deleting contact');
        console.error('Error:', error);
      }
    }
  };

  const handleFavoriteToggle = async (contact) => {
    try {
      const data = await apiService.fetch(`/contacts/toggleFavorite/${contact.uid}`, {
        method: 'PUT',
        body: JSON.stringify({ is_favorite: !contact.is_favorite })
      });

      if (data.success) {
        toast.success(data.message);
        fetchContacts(searchTerm, pagination.current);
      } else {
        toast.error(data.message || 'Failed to update favorite status');
      }
    } catch (error) {
      toast.error('Error updating favorite status');
      console.error('Error:', error);
    }
  };

  // Add pagination handler
  const handlePageChange = (newPage) => {
    fetchContacts(searchTerm, newPage);
  };

  return (
    <div className={styles.contactsContainer}>
      {isLoading ? (
        <div className={styles.loading}>
          <FontAwesomeIcon icon={faAddressBook} spin />
          <p>Loading contacts...</p>
        </div>
      ) : (
        <>
          <div className={styles.header}>
        <h2>Contacts</h2>
        <div className={styles.headerActions}>
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Search contacts..."
              className={styles.searchInput}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              onKeyUp={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
          </div>
          <button 
              className={styles.searchButton} 
              onClick={handleSearch}
            >
              <FontAwesomeIcon icon={faSearch} />
            </button>
          <button className={styles.addButton} onClick={handleAdd}>
            <FontAwesomeIcon icon={faPlus} /> &nbsp; Add Contact
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.contactTable}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th style={{textAlign:"end"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length>0 ? contacts.map(contact => (
              <tr key={contact.uid}>
                <td>
                  <button 
                    className={styles.favoriteButton}
                    onClick={() => handleFavoriteToggle(contact)}
                  >
                    <FontAwesomeIcon 
                      icon={faStar} 
                      className={`${styles.favoriteIcon} ${contact.is_favorite ? styles.favorite : ''}`}
                    />
                  </button>
                  {contact.firstName} {contact.lastName || ''}
                </td>
                <td>{contact.email}</td>
                <td>{contact.phone}</td>
                <td>{contact.status}</td>
                <td className={styles.actions}>
                  <button 
                    className={`${styles.actionButton} ${styles.viewButton}`}
                    onClick={() => handleView(contact)}
                  >
                    <FontAwesomeIcon icon={faEye} />
                  </button>
                  <button 
                    className={`${styles.actionButton} ${styles.editButton}`}
                    onClick={() => handleEdit(contact)}
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button 
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => handleDelete(contact.uid)} // Use uid instead of id
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </td>
              </tr>
            )): (
              <tr><td colSpan="5" style={{ textAlign: "center" }}>No Records Found</td></tr>
            )}
          </tbody>
        </table>
        
        {/* Replace the existing pagination controls */}
        <div className={styles.paginationContainer}>
          <div className={styles.paginationControls}>
            <button
              className={`${styles.paginationButton} ${styles.iconButton}`}
              onClick={() => handlePageChange(1)}
              disabled={pagination.current === 1 || isLoading}
              title="First Page"
            >
              <FontAwesomeIcon icon={faAnglesLeft} />
            </button>
            <button
              className={`${styles.paginationButton} ${styles.iconButton}`}
              onClick={() => handlePageChange(pagination.current - 1)}
              disabled={pagination.current === 1 || isLoading}
              title="Previous Page"
            >
              <FontAwesomeIcon icon={faAngleLeft} />
            </button>
            {getPageNumbers(pagination.current, pagination.total, pagination.pageSize).map(pageNum => (
              <button
                key={pageNum}
                className={`${styles.paginationButton} ${pageNum === pagination.current ? styles.active : ''}`}
                onClick={() => handlePageChange(pageNum)}
                disabled={isLoading}
              >
                {pageNum}
              </button>
            ))}
            <button
              className={`${styles.paginationButton} ${styles.iconButton}`}
              onClick={() => handlePageChange(pagination.current + 1)}
              disabled={pagination.current * pagination.pageSize >= pagination.total || isLoading}
              title="Next Page"
            >
              <FontAwesomeIcon icon={faAngleRight} />
            </button>
            <button
              className={`${styles.paginationButton} ${styles.iconButton}`}
              onClick={() => handlePageChange(Math.ceil(pagination.total / pagination.pageSize))}
              disabled={pagination.current * pagination.pageSize >= pagination.total || isLoading}
              title="Last Page"
            >
              <FontAwesomeIcon icon={faAnglesRight} />
            </button>
          </div>
          <div className={styles.paginationInfo}>
            Showing {contacts.length ? (pagination.current - 1) * pagination.pageSize + 1 : 0} 
            - {Math.min(pagination.current * pagination.pageSize, pagination.total)} 
            &nbsp; of {pagination.total} entries
          </div>
        </div>
      </div>
        </>
      )}
      
      <div className={styles.reloadContainer}>
        <button 
          className={styles.reloadButton} 
          onClick={handleReload}
          disabled={isLoading}
        >
          <FontAwesomeIcon 
            icon={faSync} 
            className={`${styles.reloadIcon} ${isLoading ? styles.spinning : ''}`} 
          />
        </button>
      </div>

      {showModal && (
        <ContactModal
          mode={modalMode}
          contact={contactUid} // This will be null for add, uid for edit/view
          onClose={() => setShowModal(false)}
          onSubmit={() => {
            fetchContacts(searchTerm, pagination.current);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}