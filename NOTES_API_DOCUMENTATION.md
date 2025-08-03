# Notes System API Documentation

## 📝 Overview
The Notes system allows users to create, manage, and organize notes in three categories:
- **Personal Notes**: General notes not linked to any contact or group
- **Contact Notes**: Notes associated with specific contacts
- **Group Notes**: Notes associated with specific groups

## 🗃️ Database Schema

### Notes Table
```sql
CREATE TABLE notes (
    pk_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    note_type ENUM('personal', 'contact', 'group') DEFAULT 'personal',
    contact_id INT NULL,
    group_id INT NULL,
    is_important BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    createdOn DATETIME DEFAULT CURRENT_TIMESTAMP,
    modifiedOn DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Note Keywords Table
```sql
CREATE TABLE note_keywords (
    pk_id INT AUTO_INCREMENT PRIMARY KEY,
    note_id INT NOT NULL,
    keyword VARCHAR(100) NOT NULL,
    createdOn DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 API Endpoints

### 1. Create Note
**POST** `/api/notes/createNote`

**Request Body:**
```json
{
    "user_id": "encrypted_user_id",
    "title": "Meeting Notes",
    "content": "Discussion about project timeline and deliverables...",
    "note_type": "personal|contact|group",
    "contact_id": "encrypted_contact_id", // Optional, required for contact notes
    "group_id": "encrypted_group_id",     // Optional, required for group notes
    "is_important": false,                // Optional, default false
    "keywords": ["meeting", "project", "timeline"] // Optional array
}
```

**Response:**
```json
{
    "success": true,
    "uid": "encrypted_note_id",
    "message": "Note created successfully"
}
```

### 2. Get Notes List
**GET** `/api/notes/notesList`

**Query Parameters:**
- `userId` (required): Encrypted user ID
- `note_type` (optional): Filter by note type (personal/contact/group)
- `contact_id` (optional): Filter by specific contact
- `group_id` (optional): Filter by specific group
- `search` (optional): Search in title and content
- `is_important` (optional): Filter important notes (true/false)
- `keyword` (optional): Filter by keyword
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 10)

**Response:**
```json
{
    "success": true,
    "notes": [
        {
            "uid": "encrypted_note_id",
            "title": "Meeting Notes",
            "content_preview": "Discussion about project timeline...",
            "note_type": "personal",
            "contact_id": null,
            "group_id": null,
            "is_important": false,
            "createdOn": "2025-08-03T10:30:00.000Z",
            "modifiedOn": "2025-08-03T10:30:00.000Z",
            "contact_first_name": null,
            "contact_last_name": null,
            "group_name": null
        }
    ],
    "pagination": {
        "current": 1,
        "pageSize": 10,
        "total": 25
    },
    "message": "Notes list retrieved successfully"
}
```

### 3. Get Note by ID
**GET** `/api/notes/note/:id`

**Response:**
```json
{
    "success": true,
    "note": {
        "uid": "encrypted_note_id",
        "user_id": "encrypted_user_id",
        "title": "Meeting Notes",
        "content": "Full content of the note...",
        "note_type": "contact",
        "contact_id": "encrypted_contact_id",
        "group_id": null,
        "is_important": true,
        "createdOn": "2025-08-03T10:30:00.000Z",
        "modifiedOn": "2025-08-03T10:30:00.000Z",
        "contact_first_name": "John",
        "contact_last_name": "Doe",
        "group_name": null,
        "keywords": ["meeting", "project", "timeline"]
    }
}
```

### 4. Update Note
**PUT** `/api/notes/updateNote/:id`

**Request Body:**
```json
{
    "title": "Updated Meeting Notes",
    "content": "Updated content...",
    "note_type": "personal",
    "contact_id": null,
    "group_id": null,
    "is_important": true,
    "keywords": ["meeting", "updated", "timeline"]
}
```

**Response:**
```json
{
    "success": true,
    "message": "Note updated successfully"
}
```

### 5. Delete Note
**DELETE** `/api/notes/deleteNote/:id`

**Response:**
```json
{
    "success": true,
    "message": "Note deleted successfully"
}
```

### 6. Get Notes Statistics
**GET** `/api/notes/notesStats/:userId`

**Response:**
```json
{
    "success": true,
    "stats": {
        "total_notes": 45,
        "important_notes": 12,
        "personal_notes": 25,
        "contact_notes": 15,
        "group_notes": 5
    },
    "message": "Notes statistics retrieved successfully"
}
```

### 7. Search Notes by Keyword
**GET** `/api/notes/searchNotes`

**Query Parameters:**
- `userId` (required): Encrypted user ID
- `keyword` (required): Search keyword
- `page` (optional): Page number
- `pageSize` (optional): Items per page

**Response:**
```json
{
    "success": true,
    "notes": [
        {
            "uid": "encrypted_note_id",
            "title": "Project Meeting",
            "content_preview": "Discussion about...",
            "note_type": "personal",
            "is_important": false,
            "createdOn": "2025-08-03T10:30:00.000Z",
            "matched_keywords": "meeting,project"
        }
    ],
    "pagination": {
        "current": 1,
        "pageSize": 10,
        "total": 8
    },
    "searchKeyword": "meeting",
    "message": "Notes search completed successfully"
}
```

### 8. Get Contact Notes
**GET** `/api/notes/contactNotes/:contactId`

**Query Parameters:**
- `userId` (required): Encrypted user ID
- `page` (optional): Page number
- `pageSize` (optional): Items per page

### 9. Get Group Notes
**GET** `/api/notes/groupNotes/:groupId`

**Query Parameters:**
- `userId` (required): Encrypted user ID
- `page` (optional): Page number
- `pageSize` (optional): Items per page

### 10. Toggle Note Importance
**PATCH** `/api/notes/toggleImportant/:id`

**Request Body:**
```json
{
    "is_important": true
}
```

**Response:**
```json
{
    "success": true,
    "message": "Note marked as important"
}
```

## 🔒 Security Features

1. **ID Encryption**: All database IDs are encrypted before sending to frontend
2. **Input Validation**: Required fields validation and data type checking
3. **Soft Delete**: Notes are marked as deleted instead of being permanently removed
4. **User Isolation**: Users can only access their own notes
5. **Constraint Validation**: Ensures proper note type relationships

## 📊 Use Cases

### Personal Notes
- General reminders and thoughts
- To-do lists and planning notes
- Meeting minutes not related to specific contacts

### Contact Notes
- Call logs and conversation history
- Follow-up reminders for specific contacts
- Personal observations about contacts

### Group Notes
- Group meeting minutes
- Project notes related to team groups
- Group activity planning and coordination

## 🎯 Key Features

1. **Flexible Note Types**: Support for personal, contact, and group notes
2. **Keyword System**: Searchable keywords for better organization
3. **Importance Marking**: Flag important notes for quick access
4. **Full-Text Search**: Search across titles and content
5. **Comprehensive Filtering**: Filter by type, importance, keywords, etc.
6. **Pagination Support**: Efficient handling of large note collections
7. **Rich Associations**: Link notes to contacts and groups with context
8. **Statistics Dashboard**: Overview of note distribution and usage
