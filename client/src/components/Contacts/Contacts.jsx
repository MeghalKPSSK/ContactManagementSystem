import React, { useState, useEffect } from 'react';
import styles from './Contacts.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faSearch, 
  faEdit, 
  faTrash, 
  faEye 
} from '@fortawesome/free-solid-svg-icons';
import ContactModal from './ContactModal';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
  const [contactUid, setSelectedContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleList = async (searchTerm) => {
        const config = await fetch('/config.json').then((res) => res.json());
        const response = await fetch(`${config.apiUrl}/contacts/contactsList`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            params: { filter: searchTerm },
        });
        if (!response.ok) {
            const errorData = response.json();
            throw new Error(errorData.message || 'Failed to fetch contacts');
        }
    }; 
    handleList(searchTerm);
  },[searchTerm]);
  

  const handleAdd = () => {
    setModalMode('add');
    setSelectedContact(null);
    setShowModal(true);
  };

  const handleEdit = (contact) => {
    setModalMode('edit');
    setSelectedContact(contact);
    setShowModal(true);
  };

  const handleView = (contact) => {
    setModalMode('view');
    setSelectedContact(contact);
    setShowModal(true);
  };

  const handleDelete = (contactId) => {
    // Add confirmation dialog
    if (window.confirm('Are you sure you want to delete this contact?')) {
      // API call will go here
      setContacts(contacts.filter(contact => contact.id !== contactId));
    }
  };

  return (
    <div className={styles.contactsContainer}>
      
      <div className={styles.header}>
        <h2>Contacts</h2>
        <div className={styles.headerActions}>
        <div className={styles.searchBar}>
            <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
            <input
            type="text"
            placeholder="Search contacts..."
            className={styles.searchInput}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    setSearchTerm(e.target.value);
                }
            }}
            />
        </div>
        <button className={styles.addButton} onClick={handleAdd}>
          <FontAwesomeIcon icon={faPlus} /> Add Contact
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map(contact => (
              <tr key={contact.id}>
                <td>{contact.name}</td>
                <td>{contact.email}</td>
                <td>{contact.phone}</td>
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
                    onClick={() => handleDelete(contact.id)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ContactModal
          mode={modalMode}
          contact={contactUid}
          onClose={() => setShowModal(false)}
          onSubmit={() => {
            // Handle submit based on mode
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}