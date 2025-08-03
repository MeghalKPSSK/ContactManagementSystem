import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './NotesDetail.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faStickyNote,
  faSave,
  faArrowLeft,
  faStar,
  faStarOfLife,
  faAddressBook,
  faUsers,
  faSpinner,
  faTimes,
  faExclamationCircle,
  faCheck,
  faHighlighter,
  faAlignLeft,
  faAlignCenter,
  faAlignRight
} from '@fortawesome/free-solid-svg-icons';
import apiService from '../../services/apiService';

export default function NotesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = id && id !== '';
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  
  const titleRef = useRef(null);
  const contentRef = useRef(null);
  const initialNoteRef = useRef(null);
  
  const [note, setNote] = useState({
    title: '',
    content: '',
    note_type: 'personal',
    color: 'blue',
    is_important: false,
    keywords: [] // Will contain both hashtags and highlights
  });

  // Highlighting functionality state
  const [showHighlightToolbar, setShowHighlightToolbar] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedRange, setSelectedRange] = useState(null);
  const [highlightColor, setHighlightColor] = useState('yellow');
  const [showHighlights, setShowHighlights] = useState(true);
  const [textAlign, setTextAlign] = useState('left');

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

  // Utility functions for hashtags
  const extractHashtags = (content) => {
    const hashtagRegex = /#[\w]+/g;
    const matches = content.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  };

  const renderTextWithHighlights = () => {
    if (!note.content || !note.keywords?.length) return note.content;

    const highlights = note.keywords
      .filter(k => k.isHighlight && k.start !== null && k.start !== undefined)
      .sort((a, b) => a.start - b.start);

    if (highlights.length === 0) return note.content;

    let result = [];
    let lastIndex = 0;

    highlights.forEach((highlight, index) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        result.push(note.content.substring(lastIndex, highlight.start));
      }
      
      // Add highlighted text
      const highlightedText = note.content.substring(highlight.start, highlight.end);
      result.push(
        <mark
          key={index}
          className={`${styles[`highlight${highlight.color?.charAt(0).toUpperCase() + highlight.color?.slice(1)}`] || styles.highlightYellow} ${styles.removableHighlight}`}
          onDoubleClick={() => removeHighlight(highlight.start, highlight.end)}
          title="Double-click to remove highlight"
        >
          {highlightedText}
        </mark>
      );
      
      lastIndex = highlight.end;
    });

    // Add remaining text
    if (lastIndex < note.content.length) {
      result.push(note.content.substring(lastIndex));
    }

    return result;
  };

  const handleTextSelection = () => {
    if (!contentRef.current) return;
    
    const textarea = contentRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end).trim();
    
    if (selectedText && start !== end) {
      setSelectedText(selectedText);
      setSelectedRange({ start, end });
      setShowHighlightToolbar(true);
    } else {
      setShowHighlightToolbar(false);
    }
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value || '';
    handleInputChange('content', newContent);
  };

  const addHighlight = () => {
    if (!selectedText || !selectedRange) return;

    const newKeyword = {
      keyword: selectedText,
      isHighlight: true,
      start: selectedRange.start,
      end: selectedRange.end,
      color: highlightColor
    };

    setNote(prev => ({
      ...prev,
      keywords: [...(prev.keywords || []), newKeyword]
    }));

    setShowHighlightToolbar(false);
    setSelectedText('');
    setSelectedRange(null);
    
    // Clear the selection
    if (contentRef.current) {
      contentRef.current.setSelectionRange(contentRef.current.selectionStart, contentRef.current.selectionStart);
    }
  };

  const cancelHighlight = () => {
    setShowHighlightToolbar(false);
    setSelectedText('');
    setSelectedRange(null);
    
    // Clear the selection
    if (contentRef.current) {
      contentRef.current.setSelectionRange(contentRef.current.selectionStart, contentRef.current.selectionStart);
    }
  };

  const removeHighlight = (start, end) => {
    setNote(prev => ({
      ...prev,
      keywords: (prev.keywords || []).filter(k => 
        !(k.isHighlight && k.start === start && k.end === end)
      )
    }));
  };

  // Auto-save functionality - disabled for now
  // useEffect(() => {
  //   if (!hasUnsavedChanges || !isEditMode) return;
  //   
  //   const autoSaveTimer = setTimeout(() => {
  //     handleSave(true); // Pass true for auto-save
  //   }, 30000); // Auto-save after 30 seconds of inactivity

  //   return () => clearTimeout(autoSaveTimer);
  // }, [hasUnsavedChanges, note]);

  // Track changes to detect unsaved modifications
  useEffect(() => {
    if (initialNoteRef.current) {
      const hasChanges = JSON.stringify(note) !== JSON.stringify(initialNoteRef.current);
      setHasUnsavedChanges(hasChanges);
    }
  }, [note]);

  // Warn user about unsaved changes when trying to leave
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Check if user is logged in on component mount
  useEffect(() => {
    const userId = getUserId();
    if (!userId) {
      setError('Please login to access notes');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }
  }, [navigate]);

  // Fetch note data if in edit mode
  useEffect(() => {
    const fetchNoteDetails = async () => {
      if (!isEditMode) return;
      
      try {
        setLoading(true);
        setError('');
        
        const response = await apiService.getNoteById(id);
        
        if (response.success && response.note) {
          const noteData = {
            title: response.note.title || '',
            content: response.note.content || '',
            note_type: response.note.note_type || 'personal',
            color: response.note.color || 'blue',
            is_important: response.note.is_important === 1 || response.note.is_important === true,
            keywords: response.note.keywords || []
          };
          
          setNote(noteData);
          initialNoteRef.current = { ...noteData };
        } else {
          throw new Error('Failed to load note');
        }
      } catch (error) {
        console.error('Error fetching note details:', error);
        setError('Failed to load note. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchNoteDetails();
  }, [id, isEditMode]);

  // Focus title input when creating new note
  useEffect(() => {
    if (!isEditMode && !loading && titleRef.current) {
      titleRef.current.focus();
    }
  }, [isEditMode, loading]);

  const validateNote = () => {
    const errors = {};
    
    if (!note.title.trim()) {
      errors.title = 'Title is required';
    } else if (note.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    } else if (note.title.trim().length > 100) {
      errors.title = 'Title must be less than 100 characters';
    }
    
    if (!note.content.trim()) {
      errors.content = 'Content is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (isAutoSave = false) => {
    if (!validateNote()) {
      if (!isAutoSave) {
        // Focus first field with error
        if (validationErrors.title && titleRef.current) {
          titleRef.current.focus();
        } else if (validationErrors.content && contentRef.current) {
          contentRef.current.focus();
        }
      }
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      const userId = getUserId();
      if (!userId) {
        setError('User session expired. Please login again.');
        return;
      }

      // Extract hashtags from content and combine with highlights
      const contentHashtags = extractHashtags(note.content);
      const hashtagKeywords = contentHashtags.map(tag => ({ keyword: tag }));
      const highlightKeywords = (note.keywords || []).filter(k => k.isHighlight)
        .map(k => ({
          keyword: k.keyword,
          highlight_start: k.start,
          highlight_end: k.end,
          highlight_color: k.color
        }));
      const allKeywords = [...hashtagKeywords, ...highlightKeywords];

      const noteData = {
        title: note.title.trim(),
        content: note.content.trim(),
        note_type: note.note_type,
        color: note.color,
        is_important: note.is_important ? 1 : 0,
        user_id: userId,
        keywords: allKeywords
      };

      let response;
      if (isEditMode) {
        response = await apiService.updateNote(id, noteData);
      } else {
        response = await apiService.createNote(noteData);
      }

      if (response.success) {
        initialNoteRef.current = { ...note };
        setHasUnsavedChanges(false);
        
        if (!isAutoSave) {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        }
      } else {
        throw new Error('Save operation failed');
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} note:`, error);
      setError(`Failed to ${isEditMode ? 'update' : 'save'} note. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      navigate('/notes');
    }
  };

  const confirmLeave = () => {
    setShowUnsavedWarning(false);
    navigate('/notes');
  };

  const cancelLeave = () => {
    setShowUnsavedWarning(false);
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
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
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
      {/* Error Banner */}
      {error && (
        <div className={styles.errorBanner}>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <span>{error}</span>
          <button onClick={() => setError('')} className={styles.closeError}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      )}

      {/* Success Banner */}
      {saveSuccess && (
        <div className={styles.successBanner}>
          <FontAwesomeIcon icon={faCheck} />
          <span>Note saved successfully!</span>
        </div>
      )}

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <FontAwesomeIcon icon={faExclamationCircle} />
              <h3>Unsaved Changes</h3>
            </div>
            <p className={styles.modalText}>
              You have unsaved changes. Are you sure you want to leave without saving?
            </p>
            <div className={styles.modalActions}>
              <button onClick={cancelLeave} className={styles.modalCancel}>
                Keep Editing
              </button>
              <button onClick={confirmLeave} className={styles.modalConfirm}>
                Leave Without Saving
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Highlight Toolbar */}
      {showHighlightToolbar && selectedText && (
        <div className={styles.highlightToolbar}>
          <div className={styles.toolbarContent}>
            <span className={styles.selectedTextPreview}>
              "{selectedText.length > 20 ? selectedText.substring(0, 20) + '...' : selectedText}"
            </span>
            <div className={styles.toolbarButtons}>
              <select
                value={highlightColor}
                onChange={(e) => setHighlightColor(e.target.value)}
                className={styles.toolbarColorSelect}
              >
                <option value="yellow">Yellow</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="pink">Pink</option>
                <option value="purple">Purple</option>
              </select>
              <button
                onClick={addHighlight}
                className={styles.highlightButton}
                title="Add highlight"
              >
                <FontAwesomeIcon icon={faHighlighter} />
                Highlight
              </button>
              <button
                onClick={cancelHighlight}
                className={styles.cancelButton}
                title="Cancel"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.editorContainer}>
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
                <div className={styles.headerLeft}>
                  <div className={styles.noteType} style={{ backgroundColor: getNoteTypeColor(note.note_type) }}>
                    {note.note_type}
                  </div>
                  {hasUnsavedChanges && (
                    <span className={styles.unsavedIndicator}>Unsaved changes</span>
                  )}
                </div>
                <div className={styles.headerControls}>
                  {/* Back Button */}
                  <button
                    type="button"
                    onClick={handleCancel}
                    className={`${styles.headerButton} ${styles.backButton}`}
                    title="Back to Notes"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} />
                  </button>
                  
                  {/* Color Selection */}
                  <select
                    value={note.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    className={styles.colorSelect}
                    title="Select note color"
                  >
                    <option value="blue">Blue</option>
                    <option value="pink">Pink</option>
                    <option value="yellow">Yellow</option>
                    <option value="green">Green</option>
                    <option value="purple">Purple</option>
                  </select>
                  
                  {/* Important Star Toggle */}
                  <button
                    type="button"
                    onClick={() => handleInputChange('is_important', !note.is_important)}
                    className={`${styles.starButton} ${note.is_important ? styles.important : ''}`}
                    title={note.is_important ? "Remove from important" : "Mark as important"}
                  >
                    <FontAwesomeIcon icon={faStar} />
                  </button>

                  {/* Highlight Controls */}
                  <div className={styles.highlightControls}>
                    {/* Toggle Highlights Visibility */}
                    <button
                      type="button"
                      onClick={() => setShowHighlights(!showHighlights)}
                      className={`${styles.headerButton} ${showHighlights ? styles.active : ''}`}
                      title={showHighlights ? "Hide highlights" : "Show highlights"}
                    >
                      <FontAwesomeIcon icon={faHighlighter} />
                    </button>

                    {/* Highlight Color Picker */}
                    <select
                      value={highlightColor}
                      onChange={(e) => setHighlightColor(e.target.value)}
                      className={styles.highlightColorSelect}
                      title="Select highlight color"
                    >
                      <option value="yellow">Yellow</option>
                      <option value="blue">Blue</option>
                      <option value="green">Green</option>
                      <option value="pink">Pink</option>
                      <option value="purple">Purple</option>
                    </select>
                  </div>

                  {/* Text Alignment Controls */}
                  <div className={styles.alignControls}>
                    <button
                      type="button"
                      onClick={() => setTextAlign('left')}
                      className={`${styles.headerButton} ${textAlign === 'left' ? styles.active : ''}`}
                      title="Align left"
                    >
                      <FontAwesomeIcon icon={faAlignLeft} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlign('center')}
                      className={`${styles.headerButton} ${textAlign === 'center' ? styles.active : ''}`}
                      title="Align center"
                    >
                      <FontAwesomeIcon icon={faAlignCenter} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlign('right')}
                      className={`${styles.headerButton} ${textAlign === 'right' ? styles.active : ''}`}
                      title="Align right"
                    >
                      <FontAwesomeIcon icon={faAlignRight} />
                    </button>
                  </div>
                  
                  {/* Save Button */}
                  <button
                    type="button"
                    onClick={() => handleSave(false)}
                    className={`${styles.headerButton} ${styles.saveButton}`}
                    disabled={saving || (!hasUnsavedChanges && isEditMode)}
                    title={saving ? "Saving..." : (isEditMode ? "Update Note" : "Save Note")}
                  >
                    <FontAwesomeIcon icon={saving ? faSpinner : faSave} spin={saving} />
                  </button>
                </div>
              </div>
              
              {/* Editable title */}
              <div className={styles.titleContainer}>
                <input
                  ref={titleRef}
                  type="text"
                  value={note.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter note title..."
                  className={`${styles.noteTitle} ${validationErrors.title ? styles.hasError : ''}`}
                  maxLength={100}
                />
                {validationErrors.title && (
                  <p className={styles.errorText}>
                    <FontAwesomeIcon icon={faExclamationCircle} />
                    {validationErrors.title}
                  </p>
                )}
                <div className={styles.charCount}>
                  {note.title.length}/100 characters
                </div>
              </div>
            </div>
            
            {/* Lined paper content area */}
            <div className={styles.notepadContent}>
              <div className={styles.contentLines}>
                <div className={styles.textareaContainer}>
                  <textarea
                    ref={contentRef}
                    value={note.content}
                    onChange={handleContentChange}
                    onMouseUp={handleTextSelection}
                    className={`${styles.noteContentTextarea} ${validationErrors.content ? styles.hasError : ''}`}
                    style={{ textAlign: textAlign }}
                    placeholder="Write your note content here..."
                    rows={7}
                  />
                  
                  {/* Highlight overlay that mirrors the textarea */}
                  {showHighlights && note.keywords?.filter(k => k.isHighlight).length > 0 && (
                    <div className={styles.highlightOverlay}>
                      {renderTextWithHighlights()}
                    </div>
                  )}
                </div>
                {validationErrors.content && (
                  <p className={styles.errorText}>
                    <FontAwesomeIcon icon={faExclamationCircle} />
                    {validationErrors.content}
                  </p>
                )}
              </div>
            </div>
            
            {/* Bottom section with current date */}
            <div className={styles.noteFooter}>
              <div className={styles.footerLeft}>
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
              </div>
              <div className={styles.footerRight}>
                <div className={styles.noteActions}>
                  <FontAwesomeIcon icon={getNoteTypeIcon(note.note_type)} className={styles.typeIcon} />
                </div>
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
