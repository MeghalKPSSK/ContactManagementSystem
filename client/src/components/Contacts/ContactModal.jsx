import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faStar,  } from '@fortawesome/free-solid-svg-icons';
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
  const [tagInput, setTagInput] = useState('');
  const [filteredTags, setFilteredTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const tagInputRef = useRef(null);

  useEffect(() => {
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

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      if (tagInputRef.current && filteredTags.length > 0) {
        const rect = tagInputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [filteredTags.length]);

  const fetchContactDetails = async (uid) => {
    try {
        const config = await fetch('/config.json').then((res) => res.json());
        const response = await fetch(`${config.apiUrl}/contacts/contact/${uid}`);
        const data = await response.json();
        
        if (data.success) {
            const { tags, ...contactData } = data.contact;
            // Set form data without tags
            setFormData(contactData);
            
            // Set tags if they exist
            if (tags && Array.isArray(tags)) {
                setSelectedTags(tags.map(tag => tag.uid)); // Change id to uid
                // Add tags to allTags if they're not already there
                setAllTags(prevTags => {
                    const newTags = tags.filter(
                        newTag => !prevTags.some(existingTag => existingTag.id === newTag.uid)
                    ).map(tag => ({
                        id: tag.uid,
                        name: tag.name
                    }));
                    return [...prevTags, ...newTags];
                });
            }
        }
    } catch (error) {
        toast.error('Error fetching contact details');
        console.error('Error:', error);
    } finally {
        setLoading(false);
    }
};

  const fetchTags = async () => {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const config = await fetch('/config.json').then((res) => res.json());
        const response = await fetch(`${config.apiUrl}/contacts/tags?userId=${user.uid}`);
        const data = await response.json();
        if (data.success) {
            // Transform tags to match your API structure
            setAllTags(data.tags.map(tag => ({
                id: tag.uid || tag.id, // Handle both uid and id
                name: tag.name
            })));
        }
    } catch (error) {
        console.error('Error fetching tags:', error);
        toast.error('Error loading tags');
    }
};

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleBlur = () => {
    // Small delay to allow click events on suggestions to fire
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleTagInput = (e) => {
    const value = e.target.value;
    setTagInput(value);
    if (value) {
      const filtered = allTags.filter(tag => 
        tag.name.toLowerCase().includes(value.toLowerCase()) && 
        !selectedTags.includes(tag.id)
      );
      setFilteredTags(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredTags([]);
      setShowSuggestions(false);
    }
  };

  const handleTagSelect = (tag) => {
    setSelectedTags(prev => [...prev, tag.id]);
    setTagInput('');
    setFilteredTags([]);
    setShowSuggestions(false);
  };

  const handleCreateTag = async () => {
    if (!tagInput.trim()) return;
    
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const config = await fetch('/config.json').then((res) => res.json());
        const response = await fetch(`${config.apiUrl}/contacts/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: tagInput.trim(),
                userId: user.uid
            })
        });

        const data = await response.json();
        if (data.success) {
            const newTag = {
                id: data.tag.uid || data.tag.id, // Handle both uid and id
                name: data.tag.name
            };
            setAllTags(prev => [...prev, newTag]);
            setSelectedTags(prev => [...prev, newTag.id]);
            setTagInput('');
            setFilteredTags([]);
        }
    } catch (error) {
        toast.error('Error creating tag');
        console.error('Error:', error);
    }
};

  const removeTag = (tagId) => {
    setSelectedTags(prev => prev.filter(id => id !== tagId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        const config = await fetch('/config.json').then((res) => res.json());
        const submitData = {
            ...formData,
            tags: selectedTags // Your API expects tags array
        };

        const url = mode === 'add' 
            ? `${config.apiUrl}/contacts/contactSave`
            : `${config.apiUrl}/contacts/updateContact/${contact}`;
            
        const response = await fetch(url, {
            method: mode === 'add' ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submitData)
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || `Failed to ${mode === 'add' ? 'save' : 'update'} contact`);
        }

        const data = await response.json();
        if (data.success) {
            toast.success(data.message);
            onSubmit();
        }
    } catch (error) {
        toast.error(error.message || `Error ${mode === 'add' ? 'saving' : 'updating'} contact`);
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

          {/* Tags Section */}
          <div className={styles.tagsSection}>
            <label>Tags</label>
            <div className={styles.tagInput}>
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={handleTagInput}
                onBlur={handleBlur}
                placeholder="Search or create tags..."
                className={styles.input}
                style={mode === 'view' ? { display: 'none' } : {}}
                disabled={mode === 'view'}
              />
              {tagInput && mode !== 'view' && !filteredTags.length && (
                <button 
                  type="button" 
                  onClick={handleCreateTag}
                  className={styles.createTagButton}
                >
                  Create "{tagInput}"
                </button>
              )}
            </div>
            {showSuggestions && filteredTags.length > 0 && (
              <div 
                className={styles.tagSuggestions}
                style={{
                  width: `${dropdownPosition.width}px`,
                  zIndex: 1100
                }}
              >
                {filteredTags.map(tag => (
                  <div 
                    key={tag.id} 
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent blur before click
                      handleTagSelect(tag);
                    }}
                    className={styles.tagSuggestion}
                  >
                    {tag.name}
                  </div>
                ))}
              </div>
            )}
            <div className={styles.selectedTags}>
              {selectedTags.map(tagId => {
                const tag = allTags.find(t => t.id === tagId);
                return tag ? (
                  <span key={tag.id} className={styles.tag}>
                    {tag.name}
                    {mode !== 'view' && (
                      <button 
                        type="button" 
                        onClick={() => removeTag(tag.id)}
                        className={styles.removeTag}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    )}
                  </span>
                ) : null;
              })}
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
