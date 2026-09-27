// @ts-nocheck
import React, { useState, useEffect } from 'react';
import styles from './Groups.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faEdit, faTrash, faUsers, faStickyNote } from '@fortawesome/free-solid-svg-icons';
import GroupModal from './GroupModal';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import PaginationBar from '../Pagination/PaginationBar';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit'
  const [groupUid, setSelectedGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const navigate = useNavigate();

  const fetchGroups = async (searchTerm, page = 1, pageSize = pagination.pageSize) => {
    setIsLoading(true);
    try {
      const config = await fetch('/config.json').then((res) => res.json());
      const userId = JSON.parse(localStorage.getItem('user')).uid;
      const params = new URLSearchParams({
        ...(searchTerm && { filter: searchTerm }),
        userId,
        page: String(page),
        pageSize: String(pageSize),
      });

      const response = await fetch(`${config.apiUrl}/groups/groupsList?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || 'Failed to fetch groups');
      }

      // Store the config for later use in image URLs
      window.apiConfig = config;
      setGroups(resData.groups || []);
      setPagination({
        current: page,
        pageSize: resData.pagination?.pageSize || pageSize,
        total: resData.pagination?.total || 0,
      });
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
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchGroups(searchTerm, 1);
  };

  const handleReload = () => {
    fetchGroups(searchTerm, pagination.current, pagination.pageSize);
  };

  const handlePageSizeChange = (pageSize) => {
    setPagination((prev) => ({ ...prev, current: 1, pageSize }));
    fetchGroups(searchTerm, 1, pageSize);
  };

  const handlePageChange = (page) => {
    fetchGroups(searchTerm, page, pagination.pageSize);
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
          fetchGroups(searchTerm, pagination.current, pagination.pageSize);
        }
      } catch (error) {
        toast.error('Error deleting group');
        console.error('Error:', error);
      }
    }
  };

  return (
    <div className={styles.groupsContainer}>
      {isLoading ? (
        <div className={styles.loading}>
          <FontAwesomeIcon icon={faUsers} spin />
          <p>Loading groups...</p>
        </div>
      ) : (
        <>
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
                  {group.group_icon ? (
                    <img 
                      src={`${window.apiConfig?.apiUrl.replace('/api', '')}/uploads/group_icons/${group.group_icon}`}
                      alt={group.name}
                      className={styles.groupIconImage}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <FontAwesomeIcon 
                    icon={faUsers} 
                    className={styles.groupIcon}
                    style={{ display: group.group_icon ? 'none' : 'block' }}
                  />
                </div>
                </div>
                <div className={styles.cardBody}>
                <div className={styles.groupTitle}>
                  <h3 className={styles.groupName}>{group.name}</h3>
                  <span className={styles.memberCount}>
                    <FontAwesomeIcon icon={faUsers} /> {group.group_members || 0}
                  </span>
                </div>

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
                    className={`${styles.actionButton} ${styles.noteButton}`}
                    title={`Add note for ${group.name}`}
                    aria-label={`Add note for ${group.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/notesDetails/?note_type=group&group_id=${encodeURIComponent(group.uid)}`, {
                        state: { noteEntityLabel: group.name, returnTo: '/groups' }
                      });
                    }}
                  >
                    <FontAwesomeIcon icon={faStickyNote} />
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

      {groups.length > 0 && (
        <div className={styles.cardPagination}>
        <PaginationBar
          current={pagination.current}
          total={pagination.total}
          pageSize={pagination.pageSize}
          disabled={isLoading}
          onRefresh={handleReload}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
        </div>
      )}

        </>
      )}

      {showModal && (
        <GroupModal
          mode={modalMode}
          group={groupUid}
          onClose={() => setShowModal(false)}
          onSubmit={() => {
            fetchGroups(searchTerm, 1, pagination.pageSize);
            setShowModal(false);
          }}
          contacts={contacts}
        />
      )}
    </div>
  );
}