// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faStar, faSave } from '@fortawesome/free-solid-svg-icons';
import styles from './ContactModal.module.css';
import { toast } from 'react-toastify';
import apiService from '../../services/apiService';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

const ContactModal = ({ mode, contact, onClose, onSubmit }) => {
  useBodyScrollLock(true);
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
  const [phoneErrors, setPhoneErrors] = useState({
    phone: '',
    alt_phone: '',
    mobile: ''
  });
  const [customDefs, setCustomDefs] = useState([]);
  const [customValues, setCustomValues] = useState({});

  useEffect(() => {
    if (mode !== 'add' && contact) {
      fetchContactDetails(contact);
    } else {
      setFormData(prev => ({
        ...prev,
        user_id: JSON.parse(localStorage.getItem('user')).uid
      }));
      setLoading(false);
    }
  }, [contact, mode]);

  // Load custom field definitions for current user, and values if editing
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user'));
    if (!u?.uid) return;
    (async () => {
      try {
        const defsRes = await apiService.getCustomAttributes(u.uid);
        setCustomDefs(defsRes.attributes || []);
        if (mode !== 'add' && contact) {
          const valRes = await apiService.getContactAttributes(contact);
          const byKey = {};
          (valRes.attributes || []).forEach(a => { byKey[a.key_name] = a.value ?? ''; });
          setCustomValues(byKey);
        } else {
          setCustomValues({});
        }
      } catch (e) {
        // Non-blocking
        console.error('Custom fields load error', e);
      }
    })();
  }, [mode, contact]);

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
    
    // For phone fields, validate length
    if (['phone', 'mobile', 'alt_phone'].includes(name)) {
      // Only allow numbers
      const numbersOnly = value.replace(/[^\d]/g, '');
      
      if (numbersOnly.length > 10) {
        return; // Don't update if more than 10 digits
      }

      setFormData(prev => ({
        ...prev,
        [name]: numbersOnly
      }));

      // Validate length only if there's input
      if (numbersOnly.length > 0 && numbersOnly.length !== 10) {
        setPhoneErrors(prev => ({
          ...prev,
          [name]: 'Phone number must be 10 digits'
        }));
      } else {
        setPhoneErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    } else {
      // Handle non-phone fields normally
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
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
                id: data.tag.uid,
                name: data.tag.name
            };
            setAllTags(prev => [...prev, newTag]);
            setSelectedTags(prev => [...prev, newTag.id]);
            setTagInput('');
            setShowSuggestions(false);
        }
    } catch (error) {
        toast.error('Error creating tag: '+error.message);
    }
};

  const removeTag = (tagId) => {
    setSelectedTags(prev => prev.filter(id => id !== tagId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode !== 'view') {
      if (!formData.firstName.trim()) {
        toast.error('First name is required');
        return;
      }
      if (!formData.phone.trim() || formData.phone.length !== 10) {
        toast.error('Primary phone must be exactly 10 digits');
        return;
      }
      if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        toast.error('Enter a valid email address');
        return;
      }

      const missingCustomField = customDefs.find((definition) => {
        if (!definition.is_active || !definition.is_required) return false;
        const value = customValues[definition.key_name];
        if (definition.type === 'boolean') return value !== true && value !== 'true';
        return value === undefined || value === null || String(value).trim() === '';
      });
      if (missingCustomField) {
        toast.error(`${missingCustomField.label} is required`);
        return;
      }
    }

    // Check for phone validation errors
    const hasPhoneErrors = Object.values(phoneErrors).some(error => error);
    const hasIncompletePhone = formData.phone.length > 0 && formData.phone.length !== 10;

    if (hasPhoneErrors || hasIncompletePhone) {
      toast.error('Please fix phone number errors before submitting');
      return;
    }

    try {
        const config = await fetch('/config.json').then((res) => res.json());
        const submitData = {
            ...formData,
            tags: selectedTags
        };

        const url = mode === 'add' 
            ? `${config.apiUrl}/contacts/contactSave`
            : `${config.apiUrl}/contacts/updateContact/${contact}`;
            
        const response = await fetch(url, {
            method: mode === 'add' ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submitData)
        });

        const data = await response.json();
        if (data.success) {
            // Upsert custom attribute values after core save/update
            const contactUid = mode === 'add' ? data.uid : contact;
            if (customDefs.length) {
              const values = customDefs
                .filter(d => d.is_active)
                .map(d => ({ key_name: d.key_name, value: normalizeValueForType(customValues[d.key_name], d.type) }));
              try {
                await apiService.upsertContactAttributes(contactUid, values);
              } catch (err) {
                toast.error(err.message || 'Failed to save custom fields');
                return; // stop further flow to let user correct
              }
            }
            toast.success(data.message);
            onSubmit();
        }
    } catch (error) {
        toast.error(`Error ${mode === 'add' ? 'saving' : 'updating'} contact: ${error.message}`);
    }
};

  const normalizeValueForType = (val, type) => {
    if (val === undefined) return '';
    switch (type) {
      case 'number':
        return val === '' ? '' : Number(val);
      case 'boolean':
        if (val === true || val === 'true') return true;
        if (val === false || val === 'false') return false;
        return '';
      default:
        return val;
    }
  };

  const renderCustomField = (def) => {
    const value = customValues[def.key_name] ?? '';
    const setVal = (v) => setCustomValues(prev => ({ ...prev, [def.key_name]: v }));
  const common = { disabled: mode === 'view' };
    switch (def.type) {
      case 'text':
        return <input type="text" className={styles.input} value={value} onChange={e => setVal(e.target.value)} {...common} />;
      case 'number':
        return <input type="number" className={styles.input} value={value} onChange={e => setVal(e.target.value)} {...common} />;
      case 'date':
        return <input type="date" className={styles.input} value={value} onChange={e => setVal(e.target.value)} {...common} />;
      case 'boolean':
        return <input type="checkbox" checked={value === true || value === 'true'} onChange={e => setVal(e.target.checked)} {...common} />;
      case 'select':
        return (
          <select className={styles.input} value={value} onChange={e => setVal(e.target.value)} {...common}>
            <option value="">Select...</option>
            {(def.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      case 'radio':
        return (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {(def.options || []).map(opt => (
              <label key={opt} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="radio" name={`ra_${def.key_name}`} value={opt} checked={value === opt} onChange={() => setVal(opt)} {...common} />
                {opt}
              </label>
            ))}
          </div>
        );
      default:
        return <input type="text" className={styles.input} value={value} onChange={e => setVal(e.target.value)} {...common} />;
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

        <form noValidate onSubmit={handleSubmit} className={styles.contactForm}>
          {/* First row - Name fields */}
          <div className={styles.formSection}>
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
          </div>

          {/* Phone fields */}
          <div className={styles.formSection}>
            <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label data-required="true">Primary Phone</label>
              <input
                type="tel"
                name="phone"
                className={`${styles.input} ${phoneErrors.phone ? styles.inputError : ''}`}
                placeholder="Enter 10 digit phone number"
                value={formData.phone}
                onChange={handleChange}
                disabled={mode === 'view'}
              />
              {phoneErrors.phone && <span className={styles.errorText}>{phoneErrors.phone}</span>}
            </div>
            <div className={styles.formGroup}>
              <label>Alternate Phone</label>
              <input
                type="tel"
                name="alt_phone"
                className={`${styles.input} ${phoneErrors.alt_phone ? styles.inputError : ''}`}
                placeholder="Enter 10 digit phone number"
                value={formData.alt_phone}
                onChange={handleChange}
                disabled={mode === 'view'}
              />
              {phoneErrors.alt_phone && <span className={styles.errorText}>{phoneErrors.alt_phone}</span>}
            </div>
            </div>
          </div>

          {/* Mobile and Email */}
          <div className={styles.formSection}>
            <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Mobile</label>
              <input
                type="tel"
                name="mobile"
                className={`${styles.input} ${phoneErrors.mobile ? styles.inputError : ''}`}
                placeholder="Enter 10 digit mobile number"
                value={formData.mobile}
                onChange={handleChange}
                disabled={mode === 'view'}
              />
              {phoneErrors.mobile && <span className={styles.errorText}>{phoneErrors.mobile}</span>}
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
              />
            </div>
            </div>
          </div>

          {/* Address */}
          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <label>Address</label>
              <input
                type="text"
                name="address_line"
                className={styles.input}
                placeholder="Enter street address"
                value={formData.address_line}
                onChange={handleChange}
                rows={5}
                disabled={mode === 'view'}
              />
            </div>
          </div>

          {/* City and State */}
          <div className={styles.formSection}>
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
          </div>

          {/* Postal Code and Country */}
          <div className={styles.formSection}>
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
          </div>

          {/* Company and Job Title */}
          <div className={styles.formSection}>
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
          </div>

          {/* Notes */}
          <div className={styles.formSection}>
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
          </div>

          {/* Custom Fields */}
          {customDefs && customDefs.filter(d => d.is_active).length > 0 && (
            <div className={styles.customFieldsSection}>
              <div className={styles.sectionTitle}>Custom Fields</div>
              <div className={styles.customFieldsGrid}>
                {customDefs.filter(d => d.is_active).map(def => (
                  <div key={def.key_name} className={styles.formGroup}>
                    <label data-required={def.is_required ? 'true' : undefined} aria-required={def.is_required ? 'true' : undefined}>
                      {def.label}
                    </label>
                    {renderCustomField(def)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags Section */}
          <div className={`${styles.formSection} ${styles.tagsSection}`}>
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
                <FontAwesomeIcon icon={faSave} className={styles.buttonIcon} />
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
