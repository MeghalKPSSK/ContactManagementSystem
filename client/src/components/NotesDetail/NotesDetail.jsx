import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './NotesDetail.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faStickyNote,
  faSave,
  faTimes,
  faArrowLeft,
  faStar,
  faStarOfLife,
  faAddressBook,
  faUsers,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import apiService from '../../services/apiService';

export default function NotesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = id && id !== '';
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState({
    title: '',
    content: '',
    note_type: 'personal',
    color: 'blue',
    is_important: false
  });

  // Get user ID from localStorage
  const getUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      console.log('User from localStorage:', user); // Debug log
      return user ? user.uid : null;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  };

  // Check if user is logged in on component mount
  useEffect(() => {
    const userId = getUserId();
    if (!userId) {
      console.error('No user found in localStorage, redirecting to login');
      alert('Please login to access notes');
      navigate('/login');
      return;
    }
  }, [navigate]);

  // Fetch note data if in edit mode
  useEffect(() => {
    const fetchNoteDetails = async () => {
      try {
        setLoading(true);
        console.log('Fetching note details for ID:', id); // Debug log
        const response = await apiService.getNoteById(id);
        console.log('Note details response:', response); // Debug log
        
        if (response.success && response.note) {
          setNote({
            title: response.note.title || '',
            content: response.note.content || '',
            note_type: response.note.note_type || 'personal',
            color: response.note.color || 'blue',
            is_important: response.note.is_important === 1 || response.note.is_important === true
          });
        } else {
          console.error('Failed to fetch note details:', response);
          alert('Failed to load note details. Redirecting to notes list.');
          navigate('/notes');
        }
      } catch (error) {
        console.error('Error fetching note details:', error);
        alert('Error loading note details. Redirecting to notes list.');
        navigate('/notes');
      } finally {
        setLoading(false);
      }
    };

    if (isEditMode) {
      fetchNoteDetails();
    }
  }, [id, isEditMode, navigate]);

  const handleSave = async () => {
    if (!note.title.trim() || !note.content.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    try {
      setSaving(true);
      const userId = getUserId();
      console.log('UserID retrieved:', userId); // Debug log
      
      if (!userId) {
        console.error('No userId found in localStorage');
        alert('User session not found. Please login again.');
        return;
      }

      const noteData = {
        title: note.title.trim(),
        content: note.content.trim(),
        note_type: note.note_type,
        color: note.color,
        is_important: note.is_important ? 1 : 0,
        userId: userId
      };

      console.log('Note data to save:', noteData); // Debug log

      let response;
      if (isEditMode) {
        response = await apiService.updateNote(id, noteData);
      } else {
        response = await apiService.createNote(noteData);
      }

      console.log('API response:', response); // Debug log

      if (response.success) {
        navigate('/notes');
      } else {
        alert(`Failed to ${isEditMode ? 'update' : 'create'} note. Please try again.`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} note:`, error);
      alert(`Failed to ${isEditMode ? 'update' : 'create'} note. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/notes');
  };

  const getNoteTypeColor = (type) => {
    switch (type) {
      case 'personal': return '#007bff';
      case 'contact': return '#28a745';
      case 'group': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getNoteTypeIcon = (type) => {
    switch (type) {
      case 'personal': return faStarOfLife;
      case 'contact': return faAddressBook;
      case 'group': return faUsers;
      default: return faStickyNote;
    }
  };

  const handleInputChange = (field, value) => {
    setNote(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <FontAwesomeIcon icon={faSpinner} spin />
          <p>Loading note...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button 
            onClick={handleCancel}
            className={styles.backButton}
            title="Back to Notes"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <h1>
            <FontAwesomeIcon icon={faStickyNote} className={styles.headerIcon} />
            {isEditMode ? 'Edit Note' : 'Create New Note'}
          </h1>
        </div>
        <div className={styles.headerActions}>
          <button 
            onClick={handleCancel}
            className={styles.cancelButton}
            disabled={saving}
          >
            <FontAwesomeIcon icon={faTimes} />
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className={styles.saveButton}
            disabled={saving}
          >
            <FontAwesomeIcon icon={saving ? faSpinner : faSave} spin={saving} />
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Form Controls */}
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label htmlFor="noteType">Note Type:</label>
            <select
              id="noteType"
              value={note.note_type}
              onChange={(e) => handleInputChange('note_type', e.target.value)}
              className={styles.select}
            >
              <option value="personal">Personal</option>
              <option value="contact">Contact</option>
              <option value="group">Group</option>
            </select>
          </div>

          <div className={styles.controlGroup}>
            <label htmlFor="noteColor">Color:</label>
            <select
              id="noteColor"
              value={note.color}
              onChange={(e) => handleInputChange('color', e.target.value)}
              className={styles.select}
            >
              <option value="pink">Pink</option>
              <option value="blue">Blue</option>
              <option value="yellow">Yellow</option>
              <option value="green">Green</option>
              <option value="purple">Purple</option>
            </select>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={note.is_important}
                onChange={(e) => handleInputChange('is_important', e.target.checked)}
                className={styles.checkbox}
              />
              <FontAwesomeIcon icon={faStar} className={styles.starIcon} />
              Mark as Important
            </label>
          </div>
        </div>

        {/* Note Card Preview and Editor */}
        <div className={styles.editorContainer}>
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
                <div className={styles.noteType} style={{ backgroundColor: getNoteTypeColor(note.note_type) }}>
                  {note.note_type}
                </div>
                {note.is_important && (
                  <FontAwesomeIcon icon={faStar} className={styles.importantIcon} />
                )}
              </div>
              
              {/* Editable title */}
              <input
                type="text"
                value={note.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter note title..."
                className={styles.noteTitle}
                maxLength={100}
              />
            </div>
            
            {/* Lined paper content area */}
            <div className={styles.notepadContent}>
              <div className={styles.contentLines}>
                <textarea
                  value={note.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  placeholder="Write your note content here..."
                  className={styles.noteContentTextarea}
                  rows={15}
                />
              </div>
            </div>
            
            {/* Bottom section with current date */}
            <div className={styles.noteFooter}>
              <span className={styles.noteDate}>
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
              <div className={styles.noteActions}>
                <FontAwesomeIcon icon={getNoteTypeIcon(note.note_type)} className={styles.typeIcon} />
              </div>
            </div>
            
            {/* Paper shadow effect */}
            <div className={styles.paperShadow1}></div>
            <div className={styles.paperShadow2}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
