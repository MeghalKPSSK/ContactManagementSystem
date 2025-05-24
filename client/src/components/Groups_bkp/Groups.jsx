import React, { useState, useEffect } from 'react';
import styles from './Groups.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faSearch,
  faTrash,
  faSync,
  faAngleLeft,
  faEdit, 
  faAngleRight,
  faAnglesLeft,
  faAnglesRight,
} from '@fortawesome/free-solid-svg-icons';
import GroupModal from './GroupModal';
import { toast } from 'react-toastify';

const MAX_PAGES_SHOWN = 5;

const getPageNumbers = (current, total, pageSize) => {
  const totalPages = Math.ceil(total / pageSize);
  const pages = [];
  let startPage = Math.max(1, current - Math.floor(MAX_PAGES_SHOWN / 2));
  let endPage = Math.min(totalPages, startPage + MAX_PAGES_SHOWN - 1);

  if (endPage - startPage + 1 < MAX_PAGES_SHOWN) {
    startPage = Math.max(1, endPage - MAX_PAGES_SHOWN + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  return pages;
};

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit'
  const [groupUid, setSelectedGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const fetchGroups = async (searchTerm, page = 1) => {
    setIsLoading(true);
    try {
      const config = await fetch('/config.json').then((res) => res.json());
      const userId = JSON.parse(localStorage.getItem('user')).uid;
      const params = new URLSearchParams({
        ...(searchTerm && { filter: searchTerm }),
        userId,
        page,
        pageSize: pagination.pageSize,
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
      setPagination((prev) => ({
        ...prev,
        current: page,
        total: resData.pagination.total,
      }));
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
    fetchGroups(searchTerm, 1);
    fetchContacts();
  }, []);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchGroups(searchTerm, 1);
  };

  const handleReload = () => {
    fetchGroups(searchTerm, pagination.current);
  };

  const handleAdd = () => {
    setModalMode('add');
    setSelectedGroup(null);
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
          fetchGroups(searchTerm, pagination.current);
        }
      } catch (error) {
        toast.error('Error deleting group');
        console.error('Error:', error);
      }
    }
  };

  const handlePageChange = (newPage) => {
    fetchGroups(searchTerm, newPage);
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

      <div className={styles.tableContainer}>
        <table className={styles.groupTable}>
          <thead>
            <tr>
              <th>Group Name</th>
              <th>Members</th>
              <th style={{ textAlign: 'end' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.length > 0 ? (
              groups.map((group) => (
                <tr key={group.uid}>
                  <td>{group.name}</td>
                  <td>{group.group_members || 0}</td>
                  <td className={styles.actions}>
                    <button 
                      className={`${styles.actionButton} ${styles.editButton}`}
                      onClick={() => handleEdit(group)}
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      onClick={() => handleDelete(group.uid)}
                    >
                      <FontAwesomeIcon icon={faTrash} title='Delete'/>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center' }}>
                  No Records Found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className={styles.paginationContainer}>
          <div className={styles.paginationControls}>
            <button
              className={`${styles.paginationButton} ${styles.iconButton}`}
              onClick={() => handlePageChange(1)}
              disabled={pagination.current === 1 || isLoading}
              title="First Page"
            >
              <FontAwesomeIcon icon={faAnglesLeft} />
            </button>
            <button
              className={`${styles.paginationButton} ${styles.iconButton}`}
              onClick={() => handlePageChange(pagination.current - 1)}
              disabled={pagination.current === 1 || isLoading}
              title="Previous Page"
            >
              <FontAwesomeIcon icon={faAngleLeft} />
            </button>
            {getPageNumbers(pagination.current, pagination.total, pagination.pageSize).map((pageNum) => (
              <button
                key={pageNum}
                className={`${styles.paginationButton} ${pageNum === pagination.current ? styles.active : ''}`}
                onClick={() => handlePageChange(pageNum)}
                disabled={isLoading}
              >
                {pageNum}
              </button>
            ))}
            <button
              className={`${styles.paginationButton} ${styles.iconButton}`}
              onClick={() => handlePageChange(pagination.current + 1)}
              disabled={pagination.current * pagination.pageSize >= pagination.total || isLoading}
              title="Next Page"
            >
              <FontAwesomeIcon icon={faAngleRight} />
            </button>
            <button
              className={`${styles.paginationButton} ${styles.iconButton}`}
              onClick={() => handlePageChange(Math.ceil(pagination.total / pagination.pageSize))}
              disabled={pagination.current * pagination.pageSize >= pagination.total || isLoading}
              title="Last Page"
            >
              <FontAwesomeIcon icon={faAnglesRight} />
            </button>
          </div>
          <div className={styles.paginationInfo}>
            Showing {groups.length ? (pagination.current - 1) * pagination.pageSize + 1 : 0} -{' '}
            {Math.min(pagination.current * pagination.pageSize, pagination.total)} &nbsp; of {pagination.total} entries
          </div>
        </div>
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
            fetchGroups(searchTerm, pagination.current);
            setShowModal(false);
          }}
          contacts={contacts}
        />
      )}
    </div>
  );
}