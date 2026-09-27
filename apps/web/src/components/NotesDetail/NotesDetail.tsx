// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
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
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faSearch,
  faRotateLeft,
  faTrash,
  faBold,
  faItalic,
  faUnderline,
  faStrikethrough
} from '@fortawesome/free-solid-svg-icons';
import apiService from '../../services/apiService';
import { NOTE_FONT_OPTIONS, NOTE_FONT_STACKS } from '../../utils/noteAppearance';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

export default function NotesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isEditMode = id && id !== '';
  const requestedType = searchParams.get('note_type');
  const requestedContactId = searchParams.get('contact_id') || '';
  const requestedGroupId = searchParams.get('group_id') || '';
  const contextLocked = !isEditMode && (
    (requestedType === 'contact' && requestedContactId) ||
    (requestedType === 'group' && requestedGroupId)
  );
  const contextEntityLabel = location.state?.noteEntityLabel || '';
  const returnTo = location.state?.returnTo;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  useBodyScrollLock(showUnsavedWarning);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [associationQuery, setAssociationQuery] = useState('');
  const [associationResults, setAssociationResults] = useState([]);
  const [associationLoading, setAssociationLoading] = useState(false);
  const [associationMessage, setAssociationMessage] = useState('');
  const [selectedAssociation, setSelectedAssociation] = useState(null);
  const [editorMode, setEditorMode] = useState('write');
  const [brushColor, setBrushColor] = useState('#203a39');
  const [brushSize, setBrushSize] = useState(4);
  const [, setEditorSelectionVersion] = useState(0);
  // Tracks which surface (title or body) currently owns the cursor, so a single
  // formatting toolbar can act on it - similar to Word's single ribbon.
  const [activeSurface, setActiveSurface] = useState('title');
  
  const canvasRef = useRef(null);
  const activeStrokeRef = useRef(null);
  const initialNoteRef = useRef(null);
  const pendingEditorTitleRef = useRef(null);
  const pendingEditorContentRef = useRef(null);
  const rememberedSelectionRef = useRef({ title: null, body: null });

  const rememberSelection = (surface, activeEditor) => {
    if (!activeEditor) return;
    const { from, to } = activeEditor.state.selection;
    rememberedSelectionRef.current[surface] = { from, to };
  };

  const titleEditor = useEditor({
    extensions: [StarterKit, TextStyle, Color, FontFamily],
    content: '',
    editorProps: {
      attributes: {
        class: styles.richTitleEditor,
        'aria-label': 'Note title',
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      const titleText = activeEditor.getText({ blockSeparator: ' ' }).trim();
      const titleFormatting = activeEditor.getJSON();
      setNote((previous) => ({ ...previous, title: titleText, title_formatting: titleFormatting }));
      if (validationErrors.title && titleText) {
        setValidationErrors((previous) => ({ ...previous, title: '' }));
      }
    },
    onSelectionUpdate: ({ editor: activeEditor }) => {
      rememberSelection('title', activeEditor);
      setEditorSelectionVersion((version) => version + 1);
    },
    onFocus: ({ editor: activeEditor }) => {
      setActiveSurface('title');
      rememberSelection('title', activeEditor);
    },
  });

  const editor = useEditor({
    extensions: [StarterKit, TextStyle, Color, FontFamily],
    content: '',
    editorProps: {
      attributes: {
        class: styles.richTextEditor,
        'aria-label': 'Note content',
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      const html = activeEditor.isEmpty ? '' : activeEditor.getHTML();
      setNote((previous) => previous.content === html ? previous : { ...previous, content: html });
      if (validationErrors.content && activeEditor.getText().trim()) {
        setValidationErrors((previous) => ({ ...previous, content: '' }));
      }
    },
    onSelectionUpdate: ({ editor: activeEditor }) => {
      rememberSelection('body', activeEditor);
      setEditorSelectionVersion((version) => version + 1);
    },
    onFocus: ({ editor: activeEditor }) => {
      setActiveSurface('body');
      rememberSelection('body', activeEditor);
    },
  });

  // The single toolbar always acts on whichever editor currently owns the cursor.
  const activeFormattingEditor = activeSurface === 'title' ? titleEditor : editor;
  
  const [note, setNote] = useState(() => {
    const requestedType = searchParams.get('note_type');
    return {
      title: '',
      title_formatting: null,
      content: '',
      note_type: ['personal', 'contact', 'group'].includes(requestedType) ? requestedType : 'personal',
      contact_id: searchParams.get('contact_id') || '',
      group_id: searchParams.get('group_id') || '',
      color: 'blue',
      font_family: 'handwritten',
      drawing_data: { strokes: [] },
      is_important: false,
      keywords: []
    };
  });

  // Text alignment state
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

  useEffect(() => {
    if (!editor || pendingEditorContentRef.current === null) return;
    editor.commands.setContent(pendingEditorContentRef.current, { emitUpdate: false });
    pendingEditorContentRef.current = null;
  }, [editor, loading]);

  useEffect(() => {
    if (!titleEditor || pendingEditorTitleRef.current === null) return;
    titleEditor.commands.setContent(pendingEditorTitleRef.current, { emitUpdate: false });
    pendingEditorTitleRef.current = null;
  }, [titleEditor, loading]);

  const plainNoteText = () => editor?.getText().trim() || note.content.replace(/<[^>]*>/g, ' ').trim();

  const applyFontFamily = (fontFamily) => {
    handleInputChange('font_family', fontFamily);
  };

  const runToolbarCommand = (targetEditor, surface, commandBuilder) => {
    if (!targetEditor) return;

    const rememberedSelection = rememberedSelectionRef.current[surface];
    let chain = targetEditor.chain().focus(undefined, { scrollIntoView: false });
    if (rememberedSelection) {
      chain = chain.setTextSelection(rememberedSelection);
    }

    const didRun = commandBuilder(chain).run();
    if (didRun) {
      rememberSelection(surface, targetEditor);
    }
  };

  const applyTextColorTo = (targetEditor, surface, color) => {
    runToolbarCommand(targetEditor, surface, (chain) => chain.setColor(color));
  };

  // Touch taps on the toolbar must not steal focus/selection from the editor -
  // mousedown alone isn't reliable on touch browsers, so also guard touchstart/pointerdown.
  const preventFormattingBlur = (event) => event.preventDefault();

  const renderFormattingToolbar = (targetEditor, surface, className = styles.richTextToolbar) => (
    targetEditor && (
      <div className={className} role="toolbar" aria-label="Selected text formatting">
        <span className={styles.toolbarContext}>{surface === 'title' ? 'Title' : 'Body'}</span>
        <button type="button" className={targetEditor.isActive('bold') ? styles.toolbarActive : ''} onMouseDown={preventFormattingBlur} onTouchStart={preventFormattingBlur} onPointerDown={preventFormattingBlur} onClick={() => runToolbarCommand(targetEditor, surface, (chain) => chain.toggleBold())} title="Bold" aria-label="Bold">
          <FontAwesomeIcon icon={faBold} />
        </button>
        <button type="button" className={targetEditor.isActive('italic') ? styles.toolbarActive : ''} onMouseDown={preventFormattingBlur} onTouchStart={preventFormattingBlur} onPointerDown={preventFormattingBlur} onClick={() => runToolbarCommand(targetEditor, surface, (chain) => chain.toggleItalic())} title="Italic" aria-label="Italic">
          <FontAwesomeIcon icon={faItalic} />
        </button>
        <button type="button" className={targetEditor.isActive('underline') ? styles.toolbarActive : ''} onMouseDown={preventFormattingBlur} onTouchStart={preventFormattingBlur} onPointerDown={preventFormattingBlur} onClick={() => runToolbarCommand(targetEditor, surface, (chain) => chain.toggleUnderline())} title="Underline" aria-label="Underline">
          <FontAwesomeIcon icon={faUnderline} />
        </button>
        <button type="button" className={targetEditor.isActive('strike') ? styles.toolbarActive : ''} onMouseDown={preventFormattingBlur} onTouchStart={preventFormattingBlur} onPointerDown={preventFormattingBlur} onClick={() => runToolbarCommand(targetEditor, surface, (chain) => chain.toggleStrike())} title="Strikethrough" aria-label="Strikethrough">
          <FontAwesomeIcon icon={faStrikethrough} />
        </button>
        <label className={styles.textColorControl} title="Selected text color">
          <span>A</span>
          <input type="color" defaultValue="#203a39" onChange={(event) => applyTextColorTo(targetEditor, surface, event.target.value)} aria-label="Selected text color" />
        </label>
      </div>
    )
  );

  const getDrawingPoint = (event) => {
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  };

  const drawStrokeSegment = (stroke, start, end) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const bounds = canvas.getBoundingClientRect();
    if (!context || !bounds.width || !bounds.height) return;

    const scaleX = canvas.width / bounds.width;
    const scaleY = canvas.height / bounds.height;
    context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;
    context.lineWidth = stroke.width;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(start.x * bounds.width, start.y * bounds.height);
    context.lineTo(end.x * bounds.width, end.y * bounds.height);
    context.stroke();
    if (start.x === end.x && start.y === end.y) {
      context.beginPath();
      context.arc(start.x * bounds.width, start.y * bounds.height, stroke.width / 2, 0, Math.PI * 2);
      context.fill();
    }
  };

  const handleCanvasPointerDown = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const point = getDrawingPoint(event);
    activeStrokeRef.current = { color: brushColor, width: Number(brushSize), points: [point] };
    drawStrokeSegment(activeStrokeRef.current, point, point);
  };

  const handleCanvasPointerMove = (event) => {
    const activeStroke = activeStrokeRef.current;
    if (!activeStroke) return;
    const point = getDrawingPoint(event);
    const lastPoint = activeStroke.points[activeStroke.points.length - 1];
    drawStrokeSegment(activeStroke, lastPoint, point);
    activeStrokeRef.current = { ...activeStroke, points: [...activeStroke.points, point] };
  };

  const handleCanvasPointerUp = () => {
    const completedStroke = activeStrokeRef.current;
    if (!completedStroke) return;
    activeStrokeRef.current = null;
    setNote((previous) => ({
      ...previous,
      drawing_data: { strokes: [...(previous.drawing_data?.strokes || []), completedStroke] },
    }));
  };

  const redrawDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * pixelRatio);
    canvas.height = Math.round(bounds.height * pixelRatio);
    const strokes = note.drawing_data?.strokes || [];
    strokes.forEach((stroke) => {
      if (stroke.points.length === 1) drawStrokeSegment(stroke, stroke.points[0], stroke.points[0]);
      for (let index = 1; index < stroke.points.length; index += 1) {
        drawStrokeSegment(stroke, stroke.points[index - 1], stroke.points[index]);
      }
    });
  };

  useEffect(() => {
    if (editorMode !== 'draw' || !canvasRef.current) return undefined;
    const canvas = canvasRef.current;
    const observer = new ResizeObserver(redrawDrawing);
    observer.observe(canvas);
    redrawDrawing();
    return () => observer.disconnect();
  }, [editorMode, note.drawing_data]);

  const undoLastStroke = () => {
    setNote((previous) => ({
      ...previous,
      drawing_data: { strokes: (previous.drawing_data?.strokes || []).slice(0, -1) },
    }));
  };

  const clearDrawing = () => {
    activeStrokeRef.current = null;
    setNote((previous) => ({ ...previous, drawing_data: { strokes: [] } }));
  };

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

  useEffect(() => {
    if (isEditMode) return;

    const requestedType = searchParams.get('note_type');
    if (!['personal', 'contact', 'group'].includes(requestedType)) return;

    setNote((prev) => ({
      ...prev,
      note_type: requestedType,
      contact_id: requestedType === 'contact' ? searchParams.get('contact_id') || '' : '',
      group_id: requestedType === 'group' ? searchParams.get('group_id') || '' : '',
    }));
  }, [isEditMode, searchParams]);

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
            title_formatting: response.note.title_formatting || null,
            content: response.note.content || '',
            note_type: response.note.note_type || 'personal',
            contact_id: response.note.contact_id || '',
            group_id: response.note.group_id || '',
            color: response.note.color || 'blue',
            font_family: response.note.font_family || 'handwritten',
            drawing_data: response.note.drawing_data || { strokes: [] },
            is_important: response.note.is_important === 1 || response.note.is_important === true,
            keywords: response.note.keywords || []
          };
          
          setNote(noteData);
          pendingEditorContentRef.current = noteData.content;
          pendingEditorTitleRef.current = noteData.title_formatting || noteData.title;
          if (noteData.note_type === 'contact' && noteData.contact_id) {
            const label = [response.note.contact_first_name, response.note.contact_last_name].filter(Boolean).join(' ');
            setSelectedAssociation({ id: noteData.contact_id, label: label || 'Selected contact' });
          } else if (noteData.note_type === 'group' && noteData.group_id) {
            setSelectedAssociation({ id: noteData.group_id, label: response.note.group_name || 'Selected group' });
          }
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

  // Focus the title editor when creating a new note
  useEffect(() => {
    if (!isEditMode && !loading && titleEditor) {
      titleEditor.commands.focus();
    }
  }, [isEditMode, loading, titleEditor]);

  const validateNote = () => {
    const errors = {};
    
    const titleText = titleEditor?.getText({ blockSeparator: ' ' }).trim() || note.title.trim();
    if (!titleText) {
      errors.title = 'Title is required';
    } else if (titleText.length < 3) {
      errors.title = 'Title must be at least 3 characters';
    } else if (titleText.length > 100) {
      errors.title = 'Title must be less than 100 characters';
    }
    
    if (!plainNoteText()) {
      errors.content = 'Content is required';
    }

    if (note.note_type === 'contact' && !note.contact_id) {
      errors.contact_id = 'Select a contact for this note';
    }

    if (note.note_type === 'group' && !note.group_id) {
      errors.group_id = 'Select a group for this note';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (isAutoSave = false) => {
    if (!validateNote()) {
      if (!isAutoSave) {
        // Focus first field with error
        if (validationErrors.title && titleEditor) {
          titleEditor.commands.focus();
        } else if (validationErrors.content) {
          editor?.commands.focus();
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

      // Extract hashtags from content
      const contentHashtags = extractHashtags(editor?.getText() || note.content.replace(/<[^>]*>/g, ' '));

      const noteData = {
        title: (titleEditor?.getText({ blockSeparator: ' ' }) || note.title).trim(),
        title_formatting: titleEditor?.getJSON() || note.title_formatting || null,
        content: note.content.trim(),
        note_type: note.note_type,
        contact_id: note.note_type === 'contact' ? note.contact_id : null,
        group_id: note.note_type === 'group' ? note.group_id : null,
        color: note.color,
        font_family: note.font_family,
        drawing_data: note.drawing_data,
        is_important: note.is_important ? 1 : 0,
        user_id: userId,
        keywords: contentHashtags
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
      navigateToOrigin();
    }
  };

  const navigateToOrigin = () => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(returnTo || '/notes');
    }
  };

  const confirmLeave = () => {
    setShowUnsavedWarning(false);
    navigateToOrigin();
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

  const handleNoteTypeChange = (noteType) => {
    setNote((prev) => ({
      ...prev,
      note_type: noteType,
      contact_id: '',
      group_id: '',
    }));
    setSelectedAssociation(null);
    setAssociationQuery('');
    setAssociationResults([]);
    setAssociationMessage('');
    setValidationErrors((prev) => ({ ...prev, contact_id: '', group_id: '' }));
  };

  const searchAssociations = async () => {
    const query = associationQuery.trim();
    if (query.length < 4) {
      setAssociationResults([]);
      setAssociationMessage('Enter at least 4 characters, then press Enter.');
      return;
    }

    const userId = getUserId();
    if (!userId) return;

    setAssociationLoading(true);
    setAssociationMessage('');
    try {
      const params = new URLSearchParams({ userId, filter: query, page: '1', pageSize: '10' });
      const endpoint = note.note_type === 'contact' ? '/contacts/contactsList' : '/groups/groupsList';
      const response = await apiService.fetch(`${endpoint}?${params}`);
      const results = note.note_type === 'contact' ? response.contacts || [] : response.groups || [];
      setAssociationResults(results);
      if (results.length === 0) setAssociationMessage('No matches found.');
    } catch (searchError) {
      console.error('Error searching note associations:', searchError);
      setAssociationMessage('Search failed. Try again.');
    } finally {
      setAssociationLoading(false);
    }
  };

  const selectAssociation = (entity) => {
    const label = note.note_type === 'contact'
      ? [entity.firstName, entity.lastName].filter(Boolean).join(' ')
      : entity.name;
    const selected = { id: entity.uid, label: label || (note.note_type === 'contact' ? 'Contact' : 'Group') };

    setSelectedAssociation(selected);
    setNote((prev) => ({
      ...prev,
      contact_id: note.note_type === 'contact' ? entity.uid : '',
      group_id: note.note_type === 'group' ? entity.uid : '',
    }));
    setAssociationQuery('');
    setAssociationResults([]);
    setAssociationMessage('');
    setValidationErrors((prev) => ({ ...prev, contact_id: '', group_id: '' }));
  };

  const clearAssociation = () => {
    setSelectedAssociation(null);
    setNote((prev) => ({ ...prev, contact_id: '', group_id: '' }));
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
                    aria-label="Note color"
                  >
                    <option value="blue">Blue</option>
                    <option value="pink">Pink</option>
                    <option value="yellow">Yellow</option>
                    <option value="green">Green</option>
                    <option value="purple">Purple</option>
                  </select>

                  <select
                    value={note.font_family}
                    onChange={(event) => applyFontFamily(event.target.value)}
                    className={`${styles.colorSelect} ${styles.fontSelect}`}
                    title="Select note font"
                    aria-label="Note font"
                  >
                    {NOTE_FONT_OPTIONS.map((font) => (
                      <option key={font.value} value={font.value}>{font.label}</option>
                    ))}
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

              <div className={styles.associationFields}>
                {contextLocked ? (
                  <div className={styles.associationField}>
                    <span>Note destination</span>
                    <div className={styles.associationContext}>
                      <FontAwesomeIcon icon={note.note_type === 'contact' ? faAddressBook : faUsers} />
                      <strong>{note.note_type === 'contact' ? 'Contact' : 'Group'}</strong>
                      <span>{contextEntityLabel || 'Linked from this record'}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <label className={styles.associationField}>
                      <span>Category</span>
                      <select
                        value={note.note_type}
                        onChange={(event) => handleNoteTypeChange(event.target.value)}
                        aria-label="Note category"
                      >
                        <option value="personal">Personal</option>
                        <option value="contact">Contact</option>
                        <option value="group">Group</option>
                      </select>
                    </label>

                    {note.note_type !== 'personal' && (
                      <div className={styles.associationField}>
                        <span>{note.note_type === 'contact' ? 'Find contact' : 'Find group'}</span>
                        {selectedAssociation ? (
                          <div className={styles.associationSelected}>
                            <span>{selectedAssociation.label}</span>
                            <button type="button" onClick={clearAssociation} aria-label="Change linked record">
                              <FontAwesomeIcon icon={faTimes} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className={styles.associationSearch}>
                              <input
                                type="search"
                                value={associationQuery}
                                onChange={(event) => {
                                  setAssociationQuery(event.target.value);
                                  setAssociationResults([]);
                                  setAssociationMessage('');
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    searchAssociations();
                                  }
                                }}
                                placeholder={`Type 4+ characters to find a ${note.note_type}`}
                                aria-label={`Search ${note.note_type}s`}
                                aria-controls="association-results"
                              />
                              <button type="button" onClick={searchAssociations} disabled={associationLoading} aria-label="Search linked records">
                                <FontAwesomeIcon icon={faSearch} spin={associationLoading} />
                              </button>
                            </div>
                            {associationMessage && <small>{associationMessage}</small>}
                            {associationResults.length > 0 && (
                              <div className={styles.associationResults} id="association-results" role="listbox">
                                {associationResults.map((entity) => {
                                  const label = note.note_type === 'contact'
                                    ? [entity.firstName, entity.lastName].filter(Boolean).join(' ')
                                    : entity.name;
                                  const detail = note.note_type === 'contact' ? entity.email : entity.description;
                                  return (
                                    <button
                                      type="button"
                                      key={entity.uid}
                                      role="option"
                                      aria-selected="false"
                                      onClick={() => selectAssociation(entity)}
                                    >
                                      <span>{label}</span>
                                      {detail && <small>{detail}</small>}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                        {note.note_type === 'contact' && validationErrors.contact_id && <small>{validationErrors.contact_id}</small>}
                        {note.note_type === 'group' && validationErrors.group_id && <small>{validationErrors.group_id}</small>}
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Editable title */}
              <div className={styles.titleContainer}>
                <div
                  className={`${styles.richTitleSurface} ${validationErrors.title ? styles.hasError : ''}`}
                  style={{ fontFamily: NOTE_FONT_STACKS[note.font_family] || NOTE_FONT_STACKS.handwritten }}
                >
                  <EditorContent editor={titleEditor} />
                  {titleEditor?.isEmpty && <span className={styles.richTitlePlaceholder}>Enter note title...</span>}
                </div>
                {validationErrors.title && (
                  <p className={styles.errorText}>
                    <FontAwesomeIcon icon={faExclamationCircle} />
                    {validationErrors.title}
                  </p>
                )}
              </div>
            </div>
            
            {/* Lined paper content area */}
            <div className={styles.notepadContent}>
              <div className={styles.contentLines}>
                <div className={styles.editorModeBar}>
                  <div className={styles.modeToggle} role="group" aria-label="Note editor mode">
                    <button
                      type="button"
                      className={editorMode === 'write' ? styles.modeActive : ''}
                      onClick={() => setEditorMode('write')}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      className={editorMode === 'draw' ? styles.modeActive : ''}
                      onClick={() => setEditorMode('draw')}
                    >
                      Draw
                    </button>
                  </div>

                  {editorMode === 'write' && renderFormattingToolbar(activeFormattingEditor, activeSurface)}

                  {editorMode === 'draw' && (
                    <div className={styles.drawingTools}>
                      <label className={styles.brushColorControl} title="Brush color">
                        <span>Ink</span>
                        <input type="color" value={brushColor} onChange={(event) => setBrushColor(event.target.value)} aria-label="Brush color" />
                      </label>
                      <label className={styles.brushSizeControl}>
                        <span>Size</span>
                        <input type="range" min="1" max="16" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} aria-label="Brush size" />
                        <span>{brushSize}</span>
                      </label>
                      <button type="button" onClick={undoLastStroke} disabled={!note.drawing_data?.strokes?.length} title="Undo last stroke">
                        <FontAwesomeIcon icon={faRotateLeft} />
                      </button>
                      <button type="button" onClick={clearDrawing} disabled={!note.drawing_data?.strokes?.length} title="Clear drawing">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.textareaContainer}>
                  {editorMode === 'write' ? (
                    <div
                      className={`${styles.richTextSurface} ${validationErrors.content ? styles.hasError : ''}`}
                      style={{ textAlign, fontFamily: NOTE_FONT_STACKS[note.font_family] || NOTE_FONT_STACKS.handwritten }}
                    >
                      <EditorContent editor={editor} />
                      {editor?.isEmpty && <span className={styles.richTextPlaceholder}>Write your note content here... Use #hashtags to create searchable keywords!</span>}
                    </div>
                  ) : (
                    <canvas
                      ref={canvasRef}
                      className={styles.drawingCanvas}
                      width={1200}
                      height={420}
                      aria-label="Draw on your note"
                      onPointerDown={handleCanvasPointerDown}
                      onPointerMove={handleCanvasPointerMove}
                      onPointerUp={handleCanvasPointerUp}
                      onPointerCancel={handleCanvasPointerUp}
                    />
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
