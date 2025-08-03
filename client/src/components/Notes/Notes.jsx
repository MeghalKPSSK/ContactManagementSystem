import React, { useState, useEffect } from 'react';
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
  faUsers
} from '@fortawesome/free-solid-svg-icons';

export default function Notes() {
  // const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  // Dummy notes data
  const dummyNotes = [
    {
      id: 1,
      title: "Meeting Notes",
      content: "Discuss project timeline and deliverables with the team...",
      type: "personal",
      isImportant: true,
      color: "pink",
      createdOn: "2025-08-01T10:30:00Z",
      modifiedOn: "2025-08-01T10:30:00Z"
    },
    {
      id: 2,
      title: "Contact Follow-up",
      content: "Need to follow up with John regarding the proposal...",
      type: "contact",
      isImportant: false,
      color: "blue",
      createdOn: "2025-08-02T14:15:00Z",
      modifiedOn: "2025-08-02T14:15:00Z"
    },
    {
      id: 3,
      title: "Group Discussion Points",
      content: "Key points to discuss in the next group meeting...",
      type: "group",
      isImportant: true,
      color: "yellow",
      createdOn: "2025-08-03T09:00:00Z",
      modifiedOn: "2025-08-03T09:00:00Z"
    },
    {
      id: 4,
      title: "Project Ideas",
      content: "Brainstorm new features for the upcoming release...",
      type: "personal",
      isImportant: false,
      color: "green",
      createdOn: "2025-08-03T11:00:00Z",
      modifiedOn: "2025-08-03T11:00:00Z"
    },
    {
      id: 5,
      title: "Client Requirements",
      content: "Document all client requirements and specifications...",
      type: "contact",
      isImportant: true,
      color: "purple",
      createdOn: "2025-08-03T15:30:00Z",
      modifiedOn: "2025-08-03T15:30:00Z"
    }
  ];

  const filteredNotes = dummyNotes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || note.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNoteTypeColor = (type) => {
    switch (type) {
      case 'personal': return '#007bff';
      case 'contact': return '#28a745';
      case 'group': return '#ffc107';
      default: return '#6c757d';
    }
  };

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
        <button className={styles.addButton}>
          <FontAwesomeIcon icon={faPlus} />
          Add Note
        </button>
      </div>

      {/* Stats moved to top */}
      <div className={styles.stats}>
        <div className={styles.statTile}>
          <div className={styles.statContent}>
            <FontAwesomeIcon icon={faStickyNote} className={styles.statIcon} />
            <div className={styles.statText}>
              <span className={styles.statNumber}>{dummyNotes.length}</span>
              <span className={styles.statLabel}>Total Notes</span>
            </div>
          </div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statContent}>
            <FontAwesomeIcon icon={faStar} className={styles.statIcon} />
            <div className={styles.statText}>
              <span className={styles.statNumber}>
                {dummyNotes.filter(note => note.isImportant).length}
              </span>
              <span className={styles.statLabel}>Important</span>
            </div>
          </div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statContent}>
            <FontAwesomeIcon icon={faStarOfLife} className={styles.statIcon} />
            <div className={styles.statText}>
              <span className={styles.statNumber}>
                {dummyNotes.filter(note => note.type === 'personal').length}
              </span>
              <span className={styles.statLabel}>Personal</span>
            </div>
          </div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statContent}>
            <FontAwesomeIcon icon={faAddressBook} className={styles.statIcon} />
            <div className={styles.statText}>
              <span className={styles.statNumber}>
                {dummyNotes.filter(note => note.type === 'contact').length}
              </span>
              <span className={styles.statLabel}>Contact</span>
            </div>
          </div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statContent}>
            <FontAwesomeIcon icon={faUsers} className={styles.statIcon} />
            <div className={styles.statText}>
              <span className={styles.statNumber}>
                {dummyNotes.filter(note => note.type === 'group').length}
              </span>
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
            className={styles.searchInput}
          />
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
        {filteredNotes.length === 0 ? (
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
          filteredNotes.map(note => {
            return (
              <div key={note.id} className={styles.noteCardWrapper}>
                {/* Notepad style card */}
                <div className={`${styles.noteCard} ${styles[`noteCard${note.color.charAt(0).toUpperCase() + note.color.slice(1)}`]}`}>
                  {/* Notepad holes */}
                  <div className={styles.notepadHoles}>
                    <div className={styles.hole}></div>
                    <div className={styles.hole}></div>
                    <div className={styles.hole}></div>
                  </div>
                  
                  {/* Header area */}
                  <div className={styles.notepadHeader}>
                    <div className={styles.noteHeader}>
                      <div className={styles.noteType} style={{ backgroundColor: getNoteTypeColor(note.type) }}>
                        {note.type}
                      </div>
                      {note.isImportant && (
                        <FontAwesomeIcon icon={faStar} className={styles.importantIcon} />
                      )}
                    </div>
                    
                    {/* Handwritten style title */}
                    <h3 className={styles.noteTitle}>{note.title}</h3>
                  </div>
                  
                  {/* Lined paper content area */}
                  <div className={styles.notepadContent}>
                    <div className={styles.contentLines}>
                      <div className={styles.contentLine}>
                        <p className={styles.noteContent}>{note.content}</p>
                      </div>
                      
                      {/* Empty lines for notepad effect */}
                      <div className={styles.emptyLine}></div>
                      <div className={styles.emptyLine}></div>
                      <div className={styles.emptyLine}></div>
                    </div>
                  </div>
                  
                  {/* Bottom section with date and actions */}
                  <div className={styles.noteFooter}>
                    <span className={styles.noteDate}>
                      {formatDate(note.modifiedOn)}
                    </span>
                    <div className={styles.noteActions}>
                      <button className={styles.actionButton}>
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className={styles.actionButton}>
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
    </div>
  );
}
