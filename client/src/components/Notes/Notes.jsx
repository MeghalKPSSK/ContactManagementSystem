import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Notes.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faStickyNote,
  faPlus,
  faSearch,
  faFilter,
  faStar,
  faEdit,
  faTrash,
  faStarOfLife,
  faAddressBook,
  faUsers,
  faTimes,
  faSync,
  faAngleLeft,
  faAngleRight,
  faAnglesLeft,
  faAnglesRight
} from '@fortawesome/free-solid-svg-icons';
import apiService from '../../services/apiService';

// Constants for pagination
const MAX_PAGES_SHOWN = 5;

// Helper function for pagination numbers
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

export default function Notes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // Actual search query for API
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 12;
  const [stats, setStats] = useState({
    total: 0,
    important: 0,
    personal: 0,
    contact: 0,
    group: 0
  });

  // Get user ID from localStorage or context
  const getUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.uid || null;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  };

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      
      const userId = getUserId();
      if (!userId) {
        console.error('No user ID found in session');
        setNotes([]);
        return;
      }
      
      const filters = {};
      if (filterType !== 'all') {
        filters.note_type = filterType;
      }
      if (searchQuery.trim()) {
        filters.search = searchQuery;
      }

      const response = await apiService.getNotesList(
        userId,
        filters,
        currentPage,
        pageSize
      );

      if (response.success) {
        setNotes(response.notes || []);
        setTotalCount(response.pagination.total);
        
        // Calculate stats from current notes data
        calculateStats(response.notes || []);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [filterType, searchQuery, currentPage, pageSize]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Reset to first page when search query or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType]);

  const calculateStats = (notesData) => {
    const totalNotes = notesData.length;
    const importantCount = notesData.filter(note => note.is_important === 1 || note.is_important === true).length;
    const personalCount = notesData.filter(note => note.note_type === 'personal').length;
    const contactCount = notesData.filter(note => note.note_type === 'contact').length;
    const groupCount = notesData.filter(note => note.note_type === 'group').length;

    setStats({
      total: totalNotes,
      important: importantCount,
      personal: personalCount,
      contact: contactCount,
      group: groupCount
    });
  };

  const handleSearch = () => {
    setSearchQuery(searchTerm);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchQuery('');
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleRefresh = () => {
    // Save current scroll position
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    // Refresh the notes
    fetchNotes();
    
    // Restore scroll position after a brief delay to allow for re-render
    setTimeout(() => {
      window.scrollTo(0, scrollPosition);
    }, 150);
  };

  const handleEdit = (noteId) => {
    // Ensure the note ID is valid before navigating
    if (noteId && noteId.trim() !== '') {
      navigate(`/notesDetails/${noteId}`);
    } else {
      console.error('Invalid note ID for edit navigation:', noteId);
    }
  };

  const handleAddNote = () => {
    navigate('/notesDetails/');
  };

  const handleViewNote = (noteId) => {
    // Ensure the note ID is valid before navigating
    if (noteId && noteId.trim() !== '') {
      navigate(`/notesDetails/${noteId}`);
    } else {
      console.error('Invalid note ID for navigation:', noteId);
    }
  };

  const handleDelete = async (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        console.log('Deleting note with ID:', noteId); // Debug log
        
        // Immediately remove the note from local state to prevent any UI interactions
        setNotes(prevNotes => prevNotes.filter(note => note.uid !== noteId));
        
        const response = await apiService.deleteNote(noteId);
        console.log('Delete response:', response); // Debug log
        
        if (response.success) {
          console.log('Note deleted successfully');
          // Refresh the list after a short delay to ensure consistency
          setTimeout(() => {
            fetchNotes();
          }, 300);
        } else {
          // If delete failed, restore the note (need to refetch)
          alert('Failed to delete note. Please try again.');
          fetchNotes();
        }
      } catch (error) {
        console.error('Error deleting note:', error);
        alert('Failed to delete note. Please try again.');
        // Restore the list if there was an error
        fetchNotes();
      }
    }
  };

  // Dummy notes data - REMOVED (now using API)

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    
    try {
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getNoteTypeColor = (type) => {
    switch (type) {
      case 'personal': return '#007bff';
      case 'contact': return '#28a745';
      case 'group': return '#ffc107';
      default: return '#6c757d';
    }
  };

  // Function to split content into lines for realistic notepad appearance
  const splitContentIntoLines = (content, maxLinesPerCard = 4) => {
    if (!content || content.trim() === '') return ['No content preview available'];
    
    const words = content.split(' ');
    const lines = [];
    let currentLine = '';
    const wordsPerLine = 4; // Reduced for larger font
    
    for (let i = 0; i < words.length && lines.length < maxLinesPerCard; i++) {
      if (currentLine.length === 0) {
        currentLine = words[i];
      } else if (currentLine.split(' ').length < wordsPerLine && currentLine.length < 25) {
        currentLine += ' ' + words[i];
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    
    if (currentLine && lines.length < maxLinesPerCard) {
      lines.push(currentLine);
    }
    
    // If we truncated, add ellipsis to last line
    if (words.length > lines.join(' ').split(' ').length) {
      lines[lines.length - 1] += '...';
    }
    
    return lines;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <FontAwesomeIcon icon={faStickyNote} spin />
          <p>Loading Notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>
          <FontAwesomeIcon icon={faStickyNote} className={styles.headerIcon} />
          Notes
        </h1>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={handleAddNote}>
            <FontAwesomeIcon icon={faPlus} />
            Add Note
          </button>
        </div>
      </div>

      {/* Stats moved to top */}
      <div className={styles.stats}>
        <div className={styles.statTile}>
          <div className={styles.statContent}>
            <FontAwesomeIcon icon={faStickyNote} className={styles.statIcon} />
            <div className={styles.statText}>
              <span className={styles.statNumber}>{stats.total}</span>
              <span className={styles.statLabel}>Total Notes</span>
            </div>
          </div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statContent}>
            <FontAwesomeIcon icon={faStar} className={styles.statIcon} />
            <div className={styles.statText}>
              <span className={styles.statNumber}>{stats.important}</span>
              <span className={styles.statLabel}>Important</span>
            </div>
          </div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statContent}>
            <FontAwesomeIcon icon={faStarOfLife} className={styles.statIcon} />
            <div className={styles.statText}>
              <span className={styles.statNumber}>{stats.personal}</span>
              <span className={styles.statLabel}>Personal</span>
            </div>
          </div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statContent}>
            <FontAwesomeIcon icon={faAddressBook} className={styles.statIcon} />
            <div className={styles.statText}>
              <span className={styles.statNumber}>{stats.contact}</span>
              <span className={styles.statLabel}>Contact</span>
            </div>
          </div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statContent}>
            <FontAwesomeIcon icon={faUsers} className={styles.statIcon} />
            <div className={styles.statText}>
              <span className={styles.statNumber}>{stats.group}</span>
              <span className={styles.statLabel}>Group</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchContainer}>
          <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            className={styles.searchInput}
          />
          <button 
            type="button"
            onClick={handleSearch}
            className={styles.searchButton}
            title="Search"
          >
            <FontAwesomeIcon icon={faSearch} />
          </button>
          {searchQuery && (
            <button 
              type="button"
              onClick={handleClearSearch}
              className={styles.clearButton}
              title="Clear search"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>

        <div className={styles.filterContainer}>
          <FontAwesomeIcon icon={faFilter} className={styles.filterIcon} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Notes</option>
            <option value="personal">Personal</option>
            <option value="contact">Contact</option>
            <option value="group">Group</option>
          </select>
        </div>
      </div>

      <div className={styles.notesGrid}>
        {notes.length === 0 ? (
          <div className={styles.emptyState}>
            <FontAwesomeIcon icon={faStickyNote} className={styles.emptyIcon} />
            <h3>No Notes Found</h3>
            <p>
              {searchTerm || filterType !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Create your first note to get started!'
              }
            </p>
          </div>
        ) : (
          notes.map(note => {
            const noteColor = note.color || 'blue'; // Fallback to blue
            const isImportant = note.is_important === 1 || note.is_important === true;
            
            return (
              <div key={note.uid} className={styles.noteCardWrapper}>
                {/* Notepad style card */}
                <div 
                  className={`${styles.noteCard} ${styles[`noteCard${noteColor.charAt(0).toUpperCase() + noteColor.slice(1)}`]}`}
                  onClick={() => handleViewNote(note.uid)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Notepad holes */}
                  <div className={styles.notepadHoles}>
                    <div className={styles.hole}></div>
                    <div className={styles.hole}></div>
                    <div className={styles.hole}></div>
                  </div>
                  
                  {/* Header area */}
                  <div className={styles.notepadHeader}>
                    <div className={styles.noteHeader}>
                      <div className={styles.noteType} style={{ backgroundColor: getNoteTypeColor(note.note_type) }}>
                        {note.note_type}
                      </div>
                      {isImportant && (
                        <FontAwesomeIcon icon={faStar} className={styles.importantIcon} />
                      )}
                    </div>
                    
                    {/* Handwritten style title */}
                    <h3 className={styles.noteTitle}>{note.title}</h3>
                  </div>
                  
                  {/* Lined paper content area */}
                  <div className={styles.notepadContent}>
                    <div className={styles.contentLines}>
                      {splitContentIntoLines(note.content_preview, 4).map((line, index) => (
                        <div key={index} className={styles.contentLine}>
                          <span className={styles.noteContent}>{line}</span>
                        </div>
                      ))}
                      
                      {/* Empty lines for notepad effect */}
                      {Array.from({ length: Math.max(0, 4 - splitContentIntoLines(note.content_preview, 4).length) }, (_, index) => (
                        <div key={`empty-${index}`} className={styles.emptyLine}></div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Bottom section with date and actions */}
                  <div className={styles.noteFooter}>
                    <span className={styles.noteDate}>
                      {formatDate(note.modifiedOn || note.createdOn)}
                    </span>
                    <div className={styles.noteActions}>
                      <button 
                        className={styles.actionButton}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click
                          handleEdit(note.uid);
                        }}
                        title="Edit note"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button 
                        className={styles.actionButton}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click
                          handleDelete(note.uid);
                        }}
                        title="Delete note"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Paper shadow effect */}
                  <div className={styles.paperShadow1}></div>
                  <div className={styles.paperShadow2}></div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Enhanced Pagination Controls */}
      {notes.length > 0 && (
        <div className={styles.paginationContainer}>
          <div className={styles.paginationControls}>
            <button
              className={`${styles.paginationButton} ${styles.iconButton}`}
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1 || loading}
              title="First Page"
            >
              <FontAwesomeIcon icon={faAnglesLeft} />
            </button>
            <button
              className={`${styles.paginationButton} ${styles.iconButton}`}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              title="Previous Page"
            >
              <FontAwesomeIcon icon={faAngleLeft} />
            </button>
            {getPageNumbers(currentPage, totalCount, pageSize).map(pageNum => (
              <button
                key={pageNum}
                className={`${styles.paginationButton} ${pageNum === currentPage ? styles.active : ''}`}
                onClick={() => handlePageChange(pageNum)}
                disabled={loading}
              >
                {pageNum}
              </button>
            ))}
            <button
              className={`${styles.paginationButton} ${styles.iconButton}`}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              title="Next Page"
            >
              <FontAwesomeIcon icon={faAngleRight} />
            </button>
            <button
              className={`${styles.paginationButton} ${styles.iconButton}`}
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage >= totalPages || loading}
              title="Last Page"
            >
              <FontAwesomeIcon icon={faAnglesRight} />
            </button>
          </div>
          <div className={styles.paginationInfo}>
            Showing {notes.length ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount} entries
          </div>
        </div>
      )}
      
      <div className={styles.reloadContainer}>
        <button 
          className={styles.reloadButton} 
          onClick={handleRefresh}
          disabled={loading}
        >
          <FontAwesomeIcon 
            icon={faSync} 
            className={`${styles.reloadIcon} ${loading ? styles.spinning : ''}`} 
          />
        </button>
      </div>
    </div>
  );
}
