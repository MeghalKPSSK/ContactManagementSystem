import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faStar, faPlus } from '@fortawesome/free-solid-svg-icons';
import styles from './ContactModal.module.css';
import { toast } from 'react-toastify';

const ContactModal = ({ mode, contact, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    alt_phone: '',
    mobile: '',
    email: '',
    address_line: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    company: '',
    job_title: '',
    is_favorite: false,
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [attributes] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState([]);

  useEffect(() => {
    const fetchContactDetails = async (uid) => {
      try {
        const config = await fetch('/config.json').then((res) => res.json());
        const response = await fetch(`${config.apiUrl}/contacts/contact/${uid}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch contact details');
        }

        const data = await response.json();
        if (data.success) {
          setFormData(data.contact);
        }
      } catch (error) {
        toast.error('Error fetching contact details');
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (mode !== 'add' && contact) {
      fetchContactDetails(contact);
    } else {
      setFormData({
        ...formData,
        user_id: JSON.parse(localStorage.getItem('user')).uid
      });
      setLoading(false);
    }
  }, [contact, mode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAttributeToggle = (id) => {
    setSelectedAttributes(prev =>
      prev.includes(id) ? prev.filter(attrId => attrId !== id) : [...prev, id]
    );
  };

  const handleAddAttribute = () => {
    // Logic to add a new attribute
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const config = await fetch('/config.json').then((res) => res.json());
      const url = mode === 'add' 
          ? `${config.apiUrl}/contacts/contactSave`
          : `${config.apiUrl}/contacts/updateContact/${contact}`;
          
      const response = await fetch(url, {
        method: mode === 'add' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${mode === 'add' ? 'save' : 'update'} contact`);
      }

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        onSubmit();
      }
    } catch (error) {
      toast.error(`Error ${mode === 'add' ? 'saving' : 'updating'} contact`);
      console.error('Error:', error);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>{mode === 'add' ? 'Add Contact' : mode === 'edit' ? 'Edit Contact' : 'Contact Details'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.contactForm}>
          {/* First row - Name fields */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label data-required="true">First Name</label>
              <input
                type="text"
                name="firstName"
                className={styles.input}
                placeholder="Enter first name"
                value={formData.firstName}
                onChange={handleChange}
                disabled={mode === 'view'}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Last Name</label>
              <input
                type="text"
                name="lastName"
                className={styles.input}
                placeholder="Enter last name"
                value={formData.lastName}
                onChange={handleChange}
                disabled={mode === 'view'}
              />
            </div>
          </div>

          {/* Second row - Phone fields */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label data-required="true">Primary Phone</label>
              <input
                type="tel"
                name="phone"
                className={styles.input}
                placeholder="Enter primary phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={mode === 'view'}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Alternate Phone</label>
              <input
                type="tel"
                name="alt_phone"
                className={styles.input}
                placeholder="Enter alternate phone"
                value={formData.alt_phone}
                onChange={handleChange}
                disabled={mode === 'view'}
              />
            </div>
          </div>

          {/* Third row - Mobile and Email */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Mobile</label>
              <input
                type="tel"
                name="mobile"
                className={styles.input}
                placeholder="Enter mobile number"
                value={formData.mobile}
                onChange={handleChange}
                disabled={mode === 'view'}
              />
            </div>
            <div className={styles.formGroup}>
              <label data-required="true">Email</label>
              <input
                type="email"
                name="email"
                className={styles.input}
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleChange}
                disabled={mode === 'view'}
                required
              />
            </div>
          </div>

          {/* Address field */}
          <div className={styles.formGroup}>
            <label>Address</label>
            <input
              type="text"
              name="address_line"
              className={styles.input}
              placeholder="Enter street address"
              value={formData.address_line}
              onChange={handleChange}
              disabled={mode === 'view'}
            />
          </div>

          {/* City and State */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>City</label>
              <input
                type="text"
                name="city"
                className={styles.input}
                placeholder="Enter city"
                value={formData.city}
                onChange={handleChange}
                disabled={mode === 'view'}
              />
            </div>
            <div className={styles.formGroup}>
              <label>State</label>
              <input
                type="text"
                name="state"
                className={styles.input}
                placeholder="Enter state"
                value={formData.state}
                onChange={handleChange}
                disabled={mode === 'view'}
              />
            </div>
          </div>

          {/* Postal Code and Country */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Postal Code</label>
              <input
                type="text"
                name="postal_code"
                className={styles.input}
                placeholder="Enter postal code"
                value={formData.postal_code}
                onChange={handleChange}
                disabled={mode === 'view'}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Country</label>
              <input
                type="text"
                name="country"
                className={styles.input}
                placeholder="Enter country"
                value={formData.country}
                onChange={handleChange}
                disabled={mode === 'view'}
              />
            </div>
          </div>

          {/* Company and Job Title */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Company</label>
              <input
                type="text"
                name="company"
                className={styles.input}
                placeholder="Enter company name"
                value={formData.company}
                onChange={handleChange}
                disabled={mode === 'view'}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Job Title</label>
              <input
                type="text"
                name="job_title"
                className={styles.input}
                placeholder="Enter job title"
                value={formData.job_title}
                onChange={handleChange}
                disabled={mode === 'view'}
              />
            </div>
          </div>

          {/* Notes field */}
          <div className={styles.formGroup}>
            <label>Notes</label>
            <textarea
              name="notes"
              className={styles.input}
              placeholder="Enter additional notes"
              value={formData.notes}
              onChange={handleChange}
              disabled={mode === 'view'}
              rows={4}
            />
          </div>

          {/* Attributes Section */}
          <div className={styles.attributesSection}>
            <label>Attributes</label>
            <div className={styles.attributesList}>
              {attributes.map(attr => (
                <div 
                  key={attr.id}
                  className={`${styles.attributeTag} ${
                    selectedAttributes.includes(attr.id) ? styles.selected : ''
                  }`}
                  style={{ backgroundColor: attr.color }}
                  onClick={() => handleAttributeToggle(attr.id)}
                >
                  {attr.name}
                </div>
              ))}
              {mode !== 'view' && (
                <button 
                  className={styles.addAttributeButton}
                  onClick={handleAddAttribute}
                  type="button"
                >
                  <FontAwesomeIcon icon={faPlus} /> New Attribute
                </button>
              )}
            </div>
          </div>

          {/* Show favorite checkbox only when adding new contact */}
          {!contact && (
            <div className={styles.favoriteCheck}>
              <label>
                <input
                  type="checkbox"
                  name="is_favorite"
                  checked={formData.is_favorite}
                  onChange={handleChange}
                  disabled={mode === 'view'}
                />
                <FontAwesomeIcon icon={faStar} className={styles.icon} /> Mark as Favorite
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.buttonGroup}>
            {mode !== 'view' && (
              <button type="submit" className={styles.submitButton}>
                {mode === 'add' ? 'Add Contact' : 'Save Changes'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactModal;
