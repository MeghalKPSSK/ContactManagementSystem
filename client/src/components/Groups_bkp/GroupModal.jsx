import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave } from '@fortawesome/free-solid-svg-icons';
import styles from './GroupModal.module.css';
import { toast } from 'react-toastify';

const GroupModal = ({ mode, group, onClose, onSubmit, contacts }) => {
  const [formData, setFormData] = useState({
    name: '',
    members: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== 'add' && group) {
      fetchGroupDetails(group);
    } else {
      setFormData({
        name: '',
        members: [],
        user_id: JSON.parse(localStorage.getItem('user')).uid,
      });
    }
  }, [group, mode]);

  const fetchGroupDetails = async (groupId) => {
    setLoading(true);
    try {
      const config = await fetch('/config.json').then((res) => res.json());
      const response = await fetch(`${config.apiUrl}/groups/group/${groupId}`);
      const data = await response.json();

      if (data.success) {
        setFormData({
          name: data.group.name,
          members: data.group.members.map((member) => member.uid),
          user_id: JSON.parse(localStorage.getItem('user')).uid,
        });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.members.length === 0) {
      toast.error('Group name and members are required');
      return;
    }

    try {
      const config = await fetch('/config.json').then((res) => res.json());
      const payload = {
        name: formData.name,
        members: formData.members,
        user_id: JSON.parse(localStorage.getItem('user')).uid,
      };

      const url =
        mode === 'add'
          ? `${config.apiUrl}/groups/groupSave`
          : `${config.apiUrl}/groups/updateGroup/${group}`;
      const method = mode === 'add' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        onSubmit();
      }
    } catch (error) {
      toast.error(`Error ${mode === 'add' ? 'creating' : 'updating'} group`);
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
          <h2>{mode === 'add' ? 'Add Group' : 'Edit Group'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <form className={styles.groupForm} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="groupName" data-required="true">Group Name</label>
            <input
              type="text"
              id="groupName"
              name="name"
              className={styles.input}
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter group name"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label data-required="true">Group Members</label>
            <div className={styles.memberList}>
              {contacts.map((contact) => (
                <div key={contact.uid} className={styles.memberItem}>
                  <input
                    type="checkbox"
                    id={`member-${contact.uid}`}
                    checked={formData.members.includes(contact.uid)}
                    onChange={() => handleMemberToggle(contact.uid)}
                  />
                  <label htmlFor={`member-${contact.uid}`}>
                    {contact.firstName} {contact.lastName}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.submitButton}>
              <FontAwesomeIcon icon={faSave} />{' '}
              {mode === 'add' ? 'Create Group' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupModal;