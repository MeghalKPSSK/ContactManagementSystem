// @ts-nocheck
import React, { useState, useEffect } from 'react';
import styles from './Contacts.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faSearch, 
  faEdit, 
  faTrash, 
  faEye, 
  faStar,
  faAddressBook,
  faStickyNote,
  faUsers
} from '@fortawesome/free-solid-svg-icons';
import ContactModal from './ContactModal';
import GroupModal from '../Groups/GroupModal';
import { toast } from 'react-toastify';
import apiService from '../../services/apiService';
import { useNavigate } from 'react-router-dom';
import PaginationBar from '../Pagination/PaginationBar';

export default function Contacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
  const [contactUid, setSelectedContact] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparingGroup, setIsPreparingGroup] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [tags, setTags] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupMemberIds, setGroupMemberIds] = useState([]);
  const [sourceTagName, setSourceTagName] = useState('');

  // Add pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // Update the fetchContacts function
  const fetchContacts = async (searchTerm, page = 1, selectedTagId = tagFilter, pageSize = pagination.pageSize) => {
    setIsLoading(true);
    try {
      const userId = JSON.parse(localStorage.getItem('user')).uid;
      const params = new URLSearchParams({
        ...(searchTerm && { filter: searchTerm }),
        userId,
        page,
        pageSize,
        ...(selectedTagId && { tagId: selectedTagId })
      });
      
      const data = await apiService.fetch(`/contacts/contactsList?${params}`);
      
      if (data.success) {
        setContacts(data.contacts);
        setPagination(prev => ({
          ...prev,
          current: page,
          pageSize,
          total: data.pagination?.total || 0
        }));
      } else {
        throw new Error(data.message || 'Failed to fetch contacts');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const userId = JSON.parse(localStorage.getItem('user')).uid;
      const data = await apiService.fetch(`/contacts/tags?${new URLSearchParams({ userId })}`);
      setTags(data.tags || []);
    } catch (error) {
      console.error('Error fetching contact tags:', error);
      toast.error('Unable to load contact tags');
    }
  };

  useEffect(() => {
    fetchContacts('', 1, '');
    fetchTags();
  }, []);
  
  // Update search handler
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page
    fetchContacts(searchTerm, 1, tagFilter);
  };

  // Update reload handler
  const handleReload = () => {
    fetchContacts(searchTerm, pagination.current, tagFilter);
  };

  const handleAdd = () => {
    setModalMode('add');
    setSelectedContact(null); // Don't pass UID for add mode
    setShowModal(true);
  };

  const handleEdit = (contact) => {
    setModalMode('edit');
    setSelectedContact(contact.uid); // Pass the UID from the row
    setShowModal(true);
  };

  const handleView = (contact) => {
    setModalMode('view');
    setSelectedContact(contact.uid); // Pass the UID from the row
    setShowModal(true);
  };

  const handleDelete = async (contactId) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        const data = await apiService.deleteContact(contactId);
        
        if (data.success) {
          toast.success(data.message);
          fetchContacts(searchTerm, pagination.current);
        } else {
          toast.error(data.message || 'Failed to delete contact');
        }
      } catch (error) {
        toast.error('Error deleting contact');
        console.error('Error:', error);
      }
    }
  };

  const handleFavoriteToggle = async (contact) => {
    try {
      const data = await apiService.fetch(`/contacts/toggleFavorite/${contact.uid}`, {
        method: 'PUT',
        body: JSON.stringify({ is_favorite: !contact.is_favorite })
      });

      if (data.success) {
        toast.success(data.message);
        fetchContacts(searchTerm, pagination.current);
      } else {
        toast.error(data.message || 'Failed to update favorite status');
      }
    } catch (error) {
      toast.error('Error updating favorite status');
      console.error('Error:', error);
    }
  };

  // Add pagination handler
  const handlePageChange = (newPage) => {
    fetchContacts(searchTerm, newPage, tagFilter);
  };

  const handlePageSizeChange = (pageSize) => {
    setPagination((prev) => ({ ...prev, current: 1, pageSize }));
    fetchContacts(searchTerm, 1, tagFilter, pageSize);
  };

  const handleTagFilterChange = (tagId) => {
    setTagFilter(tagId);
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchContacts(searchTerm, 1, tagId);
  };

  const handleCreateGroupFromTag = async () => {
    if (!tagFilter) return;

    setIsPreparingGroup(true);
    try {
      const userId = JSON.parse(localStorage.getItem('user')).uid;
      const matchedContacts = [];
      const pageSize = 250;
      let page = 1;
      let totalPages = 1;

      do {
        const params = new URLSearchParams({
          ...(searchTerm && { filter: searchTerm }),
          userId,
          page: String(page),
          pageSize: String(pageSize),
          tagId: tagFilter,
        });
        const response = await apiService.fetch(`/contacts/contactsList?${params}`);
        matchedContacts.push(...(response.contacts || []));
        totalPages = Math.ceil((response.pagination?.total || 0) / pageSize);
        page += 1;
      } while (page <= totalPages);

      const memberIds = matchedContacts.map((contact) => contact.uid).filter(Boolean);
      if (!memberIds.length) {
        toast.info('No contacts match this tag and search');
        return;
      }

      setGroupMemberIds(memberIds);
      setSourceTagName(tags.find((tag) => tag.uid === tagFilter)?.name || 'selected tag');
      setShowGroupModal(true);
    } catch (error) {
      console.error('Error preparing tagged group:', error);
      toast.error('Could not load contacts for this tag');
    } finally {
      setIsPreparingGroup(false);
    }
  };

  return (
    <div className={styles.contactsContainer}>
      {isLoading ? (
        <div className={styles.loading}>
          <FontAwesomeIcon icon={faAddressBook} spin />
          <p>Loading contacts...</p>
        </div>
      ) : (
        <>
          <div className={styles.header}>
        <h2>Contacts</h2>
        <div className={styles.headerActions}>
          <div className={styles.searchControl}>
            <div className={styles.searchBar}>
              <input
                type="text"
                placeholder="Search contacts..."
                className={styles.searchInput}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearch();
                }}
              />
            </div>
            <button className={styles.searchButton} onClick={handleSearch} title="Search contacts" aria-label="Search contacts">
              <FontAwesomeIcon icon={faSearch} />
            </button>
          </div>
          <select
            className={styles.tagFilter}
            value={tagFilter}
            onChange={(event) => handleTagFilterChange(event.target.value)}
            aria-label="Filter contacts by tag"
          >
            <option value="">All tags</option>
            {tags.map((tag) => <option key={tag.uid} value={tag.uid}>{tag.name}</option>)}
          </select>
          {tagFilter && (
            <button className={styles.createGroupButton} onClick={handleCreateGroupFromTag} disabled={isPreparingGroup}>
              <FontAwesomeIcon icon={faUsers} />
              {isPreparingGroup ? 'Preparing...' : 'Create group'}
            </button>
          )}
          <button className={styles.addButton} onClick={handleAdd}>
            <FontAwesomeIcon icon={faPlus} />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.contactTable}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th style={{textAlign:"end"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length>0 ? contacts.map(contact => (
              <tr key={contact.uid}>
                <td>
                  <button 
                    className={styles.favoriteButton}
                    onClick={() => handleFavoriteToggle(contact)}
                  >
                    <FontAwesomeIcon 
                      icon={faStar} 
                      className={`${styles.favoriteIcon} ${contact.is_favorite ? styles.favorite : ''}`}
                    />
                  </button>
                  {contact.firstName} {contact.lastName || ''}
                </td>
                <td>{contact.email}</td>
                <td>{contact.phone}</td>
                <td>{contact.status}</td>
                <td className={styles.actions}>
                  <button 
                    className={`${styles.actionButton} ${styles.viewButton}`}
                    onClick={() => handleView(contact)}
                  >
                    <FontAwesomeIcon icon={faEye} />
                  </button>
                  <button 
                    className={`${styles.actionButton} ${styles.editButton}`}
                    onClick={() => handleEdit(contact)}
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => navigate(`/notesDetails/?note_type=contact&contact_id=${encodeURIComponent(contact.uid)}`, {
                      state: {
                        noteEntityLabel: `${contact.firstName} ${contact.lastName || ''}`.trim(),
                        returnTo: '/contacts'
                      }
                    })}
                    title={`Add note for ${contact.firstName} ${contact.lastName || ''}`}
                    aria-label={`Add note for ${contact.firstName} ${contact.lastName || ''}`}
                  >
                    <FontAwesomeIcon icon={faStickyNote} />
                  </button>
                  <button 
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => handleDelete(contact.uid)} // Use uid instead of id
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </td>
              </tr>
            )): (
              <tr><td colSpan="5" style={{ textAlign: "center" }}>No Records Found</td></tr>
            )}
          </tbody>
        </table>
        
        <PaginationBar
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          disabled={isLoading}
          onRefresh={handleReload}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
        </>
      )}
      
      {showModal && (
        <ContactModal
          mode={modalMode}
          contact={contactUid} // This will be null for add, uid for edit/view
          onClose={() => setShowModal(false)}
          onSubmit={() => {
            fetchContacts(searchTerm, pagination.current);
            setShowModal(false);
          }}
        />
      )}

      {showGroupModal && (
        <GroupModal
          mode="add"
          onClose={() => setShowGroupModal(false)}
          onSubmit={() => {
            setShowGroupModal(false);
            fetchContacts(searchTerm, pagination.current, tagFilter);
          }}
          initialMemberIds={groupMemberIds}
          sourceTag={sourceTagName}
        />
      )}
    </div>
  );
}