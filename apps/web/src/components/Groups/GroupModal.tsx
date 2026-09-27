// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave, faCamera, faUsers } from '@fortawesome/free-solid-svg-icons';
import styles from './GroupModal.module.css';
import { toast } from 'react-toastify';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';
import apiService from '../../services/apiService';

const GroupModal = ({ mode, group, onClose, onSubmit, initialMemberIds = [], sourceTag = '' }) => {
  useBodyScrollLock(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    group_icon: null
  });
  const [originalGroupName, setOriginalGroupName] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (mode !== 'add' && group) {
      fetchGroupDetails(group);
    } else {
      setFormData({
        name: '',
        description: '',
        group_icon: null,
        user_id: JSON.parse(localStorage.getItem('user')).uid,
      });
      setOriginalGroupName('');
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
        // Store the original group name for the header
        setOriginalGroupName(data.group.name);
        
        setFormData({
          name: data.group.name,
          description: data.group.description,
          user_id: JSON.parse(localStorage.getItem('user')).uid,
          group_icon: null, // we don't re-submit the file, just show preview
        });
        
        console.log('Group icon from server:', data.group.group_icon); // Debug log
        
        if (data.group.group_icon) {
          const iconUrl = apiService.getImageUrl(data.group.group_icon);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (name === 'name') setNameError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Choose a JPEG, PNG, GIF, or WebP image');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5 MB');
      e.target.value = '';
      return;
    }

    setFormData((prev) => ({ ...prev, group_icon: file }));
    const reader = new FileReader();
    reader.onload = (event) => setPreview(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveIcon = () => {
    setFormData((prev) => ({ ...prev, group_icon: null }));
    setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const groupName = formData.name.trim();
    if (!groupName) {
      setNameError('Enter a group name');
      return;
    }
    if (groupName.length > 50) {
      setNameError('Group name must be 50 characters or fewer');
      return;
    }

    try {
      const config = await fetch('/config.json').then((res) => res.json());
      const payload = new FormData();
      payload.append('name', groupName);
      payload.append('description', formData.description);
      payload.append('user_id', formData.user_id);
      if (formData.group_icon) {
        payload.append('group_icon', formData.group_icon);
      } else if (mode !== 'add' && !preview) {
        payload.append('group_icon', '');
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

        if (mode === 'add' && initialMemberIds.length > 0 && data.uid) {
          try {
            const membersResponse = await fetch(`${config.apiUrl}/groups/addMembers/${data.uid}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ memberIds: initialMemberIds }),
            });
            const membersData = await membersResponse.json();
            if (!membersResponse.ok || !membersData.success) {
              toast.error('Group created, but tagged contacts could not be added');
            } else {
              toast.success(`${initialMemberIds.length} contacts from ${sourceTag} added`);
            }
          } catch (memberError) {
            toast.error('Group created, but tagged contacts could not be added');
            console.error('Error adding tagged contacts to group:', memberError);
          }
        }

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
          <h2>{mode === 'add' ? 'Add Group' : `Edit Group: ${originalGroupName}`}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <form noValidate className={styles.groupForm} onSubmit={handleSubmit}>
          {mode === 'add' && initialMemberIds.length > 0 && (
            <div className={styles.memberImportNotice}>
              <FontAwesomeIcon icon={faUsers} />
              <span>{initialMemberIds.length} contacts tagged "{sourceTag}" will be added to this group.</span>
            </div>
          )}
          <div className={styles.profileImageSection}>
              <div className={styles.imageUploadContainer}>
                  <div className={styles.imagePreview} onClick={() => document.getElementById('groupImageInput').click()} role="button" tabIndex={0} onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      document.getElementById('groupImageInput').click();
                    }
                  }}>
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
                  {preview && (
                    <button type="button" onClick={handleRemoveIcon} className={styles.removeButton}>
                      <FontAwesomeIcon icon={faTimes} /> Remove Photo
                    </button>
                  )}
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
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? 'group-name-error' : undefined}
            />
            {nameError && <span className={styles.formError} id="group-name-error">{nameError}</span>}
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