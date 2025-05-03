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
  faSync
} from '@fortawesome/free-solid-svg-icons';
import ContactModal from './ContactModal';
import { toast } from 'react-toastify';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
  const [contactUid, setSelectedContact] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchContacts = async (searchTerm) => {
    setIsLoading(true);
    try {
      const config = await fetch('/config.json').then((res) => res.json());
      const userId = JSON.parse(localStorage.getItem('user')).uid;
      const params = new URLSearchParams({
          ...(searchTerm && { filter: searchTerm }),
          userId: userId
      });
      const response = await fetch(`${config.apiUrl}/contacts/contactsList?${params}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
      });
      const resData = await response.json();
      
      if (!response.ok) {
          const errorData = response.json();
          throw new Error(errorData.message || 'Failed to fetch contacts');
      }
      
      setContacts(resData.contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setIsLoading(false);
    }
  }; 

  useEffect(() => {
    fetchContacts(searchTerm);
  }, []);
  
  const handleReload = () => {
    fetchContacts(searchTerm);
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
        const config = await fetch('/config.json').then((res) => res.json());
        const response = await fetch(`${config.apiUrl}/contacts/deleteContact/${contactId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error('Failed to delete contact');
        }

        const data = await response.json();
        if (data.success) {
          toast.success(data.message);
          fetchContacts(searchTerm);
        }
      } catch (error) {
        toast.error('Error deleting contact');
        console.error('Error:', error);
      }
    }
  };

  const handleFavoriteToggle = async (contact) => {
    try {
      const config = await fetch('/config.json').then((res) => res.json());
      const response = await fetch(`${config.apiUrl}/contacts/toggleFavorite/${contact.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !contact.is_favorite })
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        fetchContacts(searchTerm);
      }
    } catch (error) {
      toast.error('Error updating favorite status');
      console.error('Error:', error);
    }
  };

  return (
    <div className={styles.contactsContainer}>
      
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
                  fetchContacts(searchTerm);
                }
              }}
            />
          </div>
          <button 
              className={styles.searchButton} 
              onClick={()=>fetchContacts(searchTerm)}
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
      </div>
      
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
            fetchContacts(searchTerm); // Refresh the list after submit
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}