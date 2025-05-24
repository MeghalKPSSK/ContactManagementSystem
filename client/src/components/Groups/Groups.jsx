import React, { useState, useEffect } from 'react';
import styles from './Groups.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faSync, faEdit, faTrash, faUsers } from '@fortawesome/free-solid-svg-icons';
import GroupModal from './GroupModal';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit'
  const [groupUid, setSelectedGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchGroups = async (searchTerm) => {
    setIsLoading(true);
    try {
      const config = await fetch('/config.json').then((res) => res.json());
      const userId = JSON.parse(localStorage.getItem('user')).uid;
      const params = new URLSearchParams({
        ...(searchTerm && { filter: searchTerm }),
        userId,
      });

      const response = await fetch(`${config.apiUrl}/groups/groupsList?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Failed to fetch groups');
      }

      setGroups(resData.groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const config = await fetch('/config.json').then((res) => res.json());
      const userId = JSON.parse(localStorage.getItem('user')).uid;

      const response = await fetch(`${config.apiUrl}/contacts/contactsList?userId=${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Failed to fetch contacts');
      }

      setContacts(resData.contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  useEffect(() => {
    fetchGroups(searchTerm);
    fetchContacts();
  }, []);

  const handleSearch = () => {
    fetchGroups(searchTerm);
  };

  const handleReload = () => {
    fetchGroups(searchTerm);
  };

  const handleAdd = () => {
    setModalMode('add');
    setSelectedGroup(null);
    setShowModal(true);
  };

  const handleEdit = (group) => {
    setModalMode('edit');
    setSelectedGroup(group.uid);
    setShowModal(true);
  };

  const handleDelete = async (groupId) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      try {
        const config = await fetch('/config.json').then((res) => res.json());
        const response = await fetch(`${config.apiUrl}/groups/deleteGroup/${groupId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Failed to delete group');
        }

        const data = await response.json();
        if (data.success) {
          toast.success(data.message);
          fetchGroups(searchTerm);
        }
      } catch (error) {
        toast.error('Error deleting group');
        console.error('Error:', error);
      }
    }
  };

  return (
    <div className={styles.groupsContainer}>
      <div className={styles.header}>
        <h2>Groups</h2>
        <div className={styles.headerActions}>
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Search groups..."
              className={styles.searchInput}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
                }}
              />
              </div>
              <button className={styles.searchButton} onClick={handleSearch}>
              <FontAwesomeIcon icon={faSearch} />
              </button>
              <button className={styles.addButton} onClick={handleAdd}>
              <FontAwesomeIcon icon={faPlus} /> &nbsp; Add Group
              </button>
            </div>
            </div>

            <div className={styles.cardContainer}>
            {groups.length > 0 ? (
              groups.map((group) => (
              <div
                key={group.uid}
                className={styles.card}
                onClick={() => navigate(`/groupDetails/${group.uid}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.cardHeader}>
                <div className={styles.groupIconContainer}>
                  <FontAwesomeIcon icon={faUsers} className={styles.groupIcon} />
                </div>
                </div>
                <div className={styles.cardBody}>
                <h3 className={styles.groupName}>{group.name} : {group.group_members || 0}</h3>

                <p className={styles.groupDescription}>
                  {group.description || 'No description available'}
                </p>
                <div className={styles.cardActions}>
                  <button
                    className={`${styles.actionButton} ${styles.editButton}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(group);
                    }}
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(group.uid);
                    }}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className={styles.noGroups}>No groups found</p>
        )}
      </div>

      <div className={styles.reloadContainer}>
        <button className={styles.reloadButton} onClick={handleReload} disabled={isLoading}>
          <FontAwesomeIcon icon={faSync} className={`${styles.reloadIcon} ${isLoading ? styles.spinning : ''}`} />
        </button>
      </div>

      {showModal && (
        <GroupModal
          mode={modalMode}
          group={groupUid}
          onClose={() => setShowModal(false)}
          onSubmit={() => {
            fetchGroups(searchTerm);
            setShowModal(false);
          }}
          contacts={contacts}
        />
      )}
    </div>
  );
}