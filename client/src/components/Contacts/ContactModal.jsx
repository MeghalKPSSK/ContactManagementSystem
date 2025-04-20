import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import styles from './ContactModal.module.css';

const ContactModal = ({ mode, contact, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (contact && (mode === 'edit' || mode === 'view')) {
      setFormData(contact);
    }
  }, [contact, mode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>{mode === 'add' ? 'Add Contact' : mode === 'edit' ? 'Edit Contact' : 'Contact Details'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={mode === 'view'}
              placeholder="Enter name"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={mode === 'view'}
              placeholder="Enter email"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={mode === 'view'}
              placeholder="Enter phone number"
              required
            />
          </div>
          <div className={styles.buttonGroup}>
            {mode !== 'view' && (
              <button type="submit" className={styles.submitButton}>
                {mode === 'add' ? 'Add Contact' : 'Save Changes'}
              </button>
            )}
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              {mode === 'view' ? 'Close' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactModal;
