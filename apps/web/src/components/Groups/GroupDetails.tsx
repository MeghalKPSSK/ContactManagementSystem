// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './GroupDetails.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faArrowLeft, faPlus, faTrash, faStickyNote } from '@fortawesome/free-solid-svg-icons';
import MemberModal from './MemberModal';
import { toast } from 'react-toastify';
import PaginationBar from '../Pagination/PaginationBar';
import apiService from '../../services/apiService';

export default function GroupDetails() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // Fetch group details
  const fetchGroup = async (page = 1, pageSize = pagination.pageSize) => {
    if (group) setIsLoadingMembers(true);
    else setLoading(true);
    try {
      const config = await fetch('/config.json').then(res => res.json());
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      const response = await fetch(`${config.apiUrl}/groups/group/${groupId}?${params}`);
      const data = await response.json();
      if (data.success) {
        setGroup(data.group);
        setPagination(data.pagination || { current: page, pageSize, total: data.group.membersTotal || 0 });
      }
    } catch (err) {
      setGroup(null);
      console.error('Fetch group error:', err);
      toast.error('Failed to fetch group details');
    } finally {
      setLoading(false);
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchGroup(1, pagination.pageSize);
    // eslint-disable-next-line
  }, [groupId]);

  // Add Member
  const handleAddMember = async () => {
    setShowMemberModal(true);
  };

  // Delete Member
  const handleDeleteMember = async (member) => {
    if (!group) return;
    const memberName = member.firstName + (member.lastName ? ` ${member.lastName}` : '');
    if (window.confirm(`Are you sure want to delete ${memberName}?`)) {
      try {
        const config = await fetch('/config.json').then(res => res.json());

        // Use the dedicated removeMember API
        const response = await fetch(`${config.apiUrl}/groups/removeMember/${group.uid}/${member.uid}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
          const nextPage = group.members.length === 1 && pagination.current > 1
            ? pagination.current - 1
            : pagination.current;
          fetchGroup(nextPage, pagination.pageSize);
          toast.success('Member deleted successfully!');
        } else {
          toast.error(data.message || 'Failed to delete member');
        }
      } catch (err) {
        toast.error('Failed to delete member');
        console.error('Delete member error:', err);
      }
    }
  };

  // Submit handler for Add
  const handleMemberModalSubmit = async (form) => {
    if (!group) return;
    try {
      const config = await fetch('/config.json').then(res => res.json());
      let memberIds = [];
      
      // Handle multiple member addition
      if (form.uids && form.uids.length > 0) {
        // Filter out existing members to avoid duplicates
        const existingMemberUids = group.members.map(m => m.uid);
        memberIds = form.uids.filter(uid => !existingMemberUids.includes(uid));
      } else if (form.uid) {
        // Fallback for single selection (backward compatibility)
        const existingMemberUids = group.members.map(m => m.uid);
        if (!existingMemberUids.includes(form.uid)) {
          memberIds = [form.uid];
        }
      }

      if (memberIds.length === 0) {
        toast.info('Selected contacts are already members of this group');
        setShowMemberModal(false);
        return;
      }

      // Use the dedicated addMembers API
      const response = await fetch(`${config.apiUrl}/groups/addMembers/${group.uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberIds }),
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        fetchGroup(pagination.current, pagination.pageSize);
        setShowMemberModal(false);
        toast.success(data.message || `${memberIds.length} member${memberIds.length !== 1 ? 's' : ''} added successfully!`);
      } else {
        toast.error(data.message || 'Failed to add members');
      }
    } catch (err) {
      toast.error('Failed to add members');
      console.error('Add members error:', err);
    }
  };

  const handlePageSizeChange = (pageSize) => {
    setPagination((previous) => ({ ...previous, current: 1, pageSize }));
    fetchGroup(1, pageSize);
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (!group) return <div className={styles.notFound}>Group not found.</div>;

  return (
    <div className={styles.detailsContainer}>
      <button className={styles.backButton} onClick={() => navigate(-1)}>
        <FontAwesomeIcon icon={faArrowLeft} /> Back
      </button>
      <div className={styles.headerStrip}>
        <div className={styles.groupIconContainer}>
          {group.group_icon ? (
            <img 
              src={apiService.getImageUrl(group.group_icon) || ''}
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
        <div className={styles.groupInfo}>
          <h2 className={styles.groupName}>{group.name}</h2>
          <p className={styles.groupDescription}>{group.description || 'No description available'}</p>
        </div>
      </div>
      <div className={styles.membersSection}>
        <div className={styles.membersHeader}>
          <h3>Members ({pagination.total})</h3>
          <div className={styles.headerActions}>
            <button className={styles.addButton} onClick={() => navigate(`/notesDetails/?note_type=group&group_id=${encodeURIComponent(group.uid)}`, {
              state: { noteEntityLabel: group.name, returnTo: `/groupDetails/${group.uid}` }
            })}>
              <FontAwesomeIcon icon={faStickyNote} /> Add Note
            </button>
            <button className={styles.addButton} onClick={handleAddMember}>
              <FontAwesomeIcon icon={faPlus} /> Add Member
            </button>
          </div>
        </div>
        <div className={styles.tableContainer}>
          <table className={styles.membersTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th style={{textAlign: 'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {group.members && group.members.length > 0 ? (
                group.members.map((member, idx) => (
                  <tr key={member.uid}>
                    <td>{(pagination.current - 1) * pagination.pageSize + idx + 1}</td>
                    <td>{member.firstName} {member.lastName}</td>
                    <td>{member.email}</td>
                    <td style={{textAlign: 'right'}}>
                      <button
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        title="Delete"
                        onClick={() => handleDeleteMember(member)}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className={styles.noMembers}>No members in this group.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {pagination.total > 0 && (
          <PaginationBar
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            disabled={isLoadingMembers}
            onPageChange={(page) => fetchGroup(page, pagination.pageSize)}
            onPageSizeChange={handlePageSizeChange}
            onRefresh={() => fetchGroup(pagination.current, pagination.pageSize)}
          />
        )}
      </div>
      <MemberModal
        show={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        onSubmit={handleMemberModalSubmit}
        mode="add"
        group={group}
      />
    </div>
  );
}
