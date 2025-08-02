import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave, faCamera } from '@fortawesome/free-solid-svg-icons';
import styles from './GroupModal.module.css';
import { toast } from 'react-toastify';

const GroupModal = ({ mode, group, onClose, onSubmit, contacts }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    members: [],
    group_icon: null
  });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== 'add' && group) {
      fetchGroupDetails(group);
    } else {
      setFormData({
        name: '',
        description: '',
        members: [],
        group_icon: null,
        user_id: JSON.parse(localStorage.getItem('user')).uid,
      });
      setPreview(null);
    }
  }, [group, mode]);

  const fetchGroupDetails = async (groupId) => {
    setLoading(true);
    try {
      const config = await fetch('/config.json').then((res) => res.json());
      const response = await fetch(`${config.apiUrl}/groups/group/${groupId}`);
      const data = await response.json();

      console.log('Fetched group data:', data); // Debug log

      if (data.success) {
        setFormData({
          name: data.group.name,
          description: data.group.description,
          members: data.group.members.map((member) => member.uid),
          user_id: JSON.parse(localStorage.getItem('user')).uid,
          group_icon: null, // we don't re-submit the file, just show preview
        });
        
        console.log('Group icon from server:', data.group.group_icon); // Debug log
        
        if (data.group.group_icon) {
          const iconUrl = `${config.apiUrl.replace('/api', '')}/uploads/group_icons/${data.group.group_icon}`;
          console.log('Setting preview URL:', iconUrl); // Debug log
          setPreview(iconUrl);
        } else {
          setPreview(null);
        }
      }
    } catch (error) {
      toast.error('Error fetching group details');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

const handleMemberToggle = (contactId) => {
  setFormData((prev) => ({
    ...prev,
    members: prev.members.includes(contactId)
      ? prev.members.filter((id) => id !== contactId)
      : [...prev.members, contactId],
  }));
};

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        group_icon: file,
      }));
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const config = await fetch('/config.json').then((res) => res.json());
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('description', formData.description);
      payload.append('members', JSON.stringify([])); // Send empty array since we removed members
      payload.append('user_id', formData.user_id);
      if (formData.group_icon) {
        payload.append('group_icon', formData.group_icon);
      }

      const url =
        mode === 'add'
          ? `${config.apiUrl}/groups/groupSave`
          : `${config.apiUrl}/groups/updateGroup/${group}`;
      const method = mode === 'add' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        body: payload,
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        onSubmit();
      } else {
        toast.error(data.message || 'Error processing request');
      }
    } catch (error) {
      toast.error(`Error ${mode === 'add' ? 'creating' : 'updating'} group`);
      console.error('Error:', error);
    }
  };

  if (loading) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>{mode === 'add' ? 'Add Group' : 'Edit Group'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <form className={styles.groupForm} onSubmit={handleSubmit}>
          <div className={styles.profileImageSection}>
              <div className={styles.imageUploadContainer}>
                  <div className={styles.imagePreview} onClick={() => document.getElementById('groupImageInput').click()}>
                      {preview ? (
                          <>
                              <img 
                                  src={preview} 
                                  alt="Group" 
                                  className={styles.profileImage}
                              />
                              <div className={styles.imageOverlay}>
                                  <FontAwesomeIcon icon={faCamera} className={styles.overlayIcon} />
                                  <span className={styles.overlayText}>Change Photo</span>
                              </div>
                          </>
                      ) : (
                          <div className={styles.placeholderImage}>
                              <FontAwesomeIcon icon={faCamera} className={styles.placeholderIcon} />
                              <span className={styles.placeholderText}>Add Photo</span>
                          </div>
                      )}
                      <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className={styles.fileInput}
                          id="groupImageInput"
                      />
                  </div>
              </div>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="groupName" data-required="true">Group Name</label>
            <input
              type="text"
              id="groupName"
              name="name"
              className={styles.input}
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          {/* Description field */}
          <div className={styles.formGroup}>
            <label htmlFor="groupDescription">Description</label>
            <textarea
              id="groupDescription"
              name="description"
              className={styles.input}
              value={formData.description}
              onChange={handleChange}
              rows={4}
            />
          </div>
          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.submitButton}>
              <FontAwesomeIcon icon={faSave} />{' '}
              {mode === 'add' ? 'Create Group' : 'Update Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupModal;