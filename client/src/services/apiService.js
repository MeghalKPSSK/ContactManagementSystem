import configService from './configService';

// API service to handle all API calls with centralized config
class ApiService {
    
    // Generic fetch wrapper
    async fetch(endpoint, options = {}) {
        const config = configService.getConfig();
        const url = `${config.apiUrl}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        // Don't set Content-Type for FormData
        if (options.body instanceof FormData) {
            delete defaultOptions.headers['Content-Type'];
        }

        const response = await fetch(url, {
            ...defaultOptions,
            ...options
        });

        // Always try to parse JSON response, even for errors
        const data = await response.json();

        if (!response.ok) {
            // If the response has a message, use it, otherwise use a generic error
            const errorMessage = data.message || `HTTP error! status: ${response.status}`;
            const error = new Error(errorMessage);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    }

    // User API methods
    async getUserById(userId) {
        return this.fetch(`/users/user/${userId}`);
    }

    async updateUser(userId, userData) {
        const formData = new FormData();
        
        // Add text fields
        Object.keys(userData).forEach(key => {
            if (key !== 'profileImage' && userData[key] !== undefined) {
                formData.append(key, userData[key]);
            }
        });

        // Add file if exists
        if (userData.profileImage instanceof File) {
            formData.append('profileImage', userData.profileImage);
        }

        return this.fetch(`/users/updateUser/${userId}`, {
            method: 'PUT',
            body: formData
        });
    }

    async changePassword(userId, passwordData) {
        return this.fetch(`/users/changePassword/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(passwordData)
        });
    }

    async loginUser(credentials) {
        return this.fetch('/users/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async registerUser(userData) {
        return this.fetch('/users/registerUser', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // Contact API methods
    async getContacts(userId) {
        return this.fetch(`/contacts/contactsList/${userId}`);
    }

    async createContact(contactData) {
        return this.fetch('/contacts/createContact', {
            method: 'POST',
            body: JSON.stringify(contactData)
        });
    }

    async updateContact(contactId, contactData) {
        return this.fetch(`/contacts/updateContact/${contactId}`, {
            method: 'PUT',
            body: JSON.stringify(contactData)
        });
    }

    async deleteContact(contactId) {
        return this.fetch(`/contacts/deleteContact/${contactId}`, {
            method: 'DELETE'
        });
    }

    async starContact(contactId) {
        return this.fetch(`/contacts/starContact/${contactId}`, {
            method: 'PUT'
        });
    }

    async unstarContact(contactId) {
        return this.fetch(`/contacts/unstarContact/${contactId}`, {
            method: 'PUT'
        });
    }

    // Group API methods
    async getGroups(userId) {
        return this.fetch(`/groups/groupsList/${userId}`);
    }

    async getGroupById(groupId) {
        return this.fetch(`/groups/group/${groupId}`);
    }

    async createGroup(groupData) {
        return this.fetch('/groups/createGroup', {
            method: 'POST',
            body: JSON.stringify(groupData)
        });
    }

    async updateGroup(groupId, groupData) {
        return this.fetch(`/groups/updateGroup/${groupId}`, {
            method: 'PUT',
            body: JSON.stringify(groupData)
        });
    }

    async deleteGroup(groupId) {
        return this.fetch(`/groups/deleteGroup/${groupId}`, {
            method: 'DELETE'
        });
    }

    async addGroupMember(groupId, memberData) {
        return this.fetch(`/groups/addMember/${groupId}`, {
            method: 'POST',
            body: JSON.stringify(memberData)
        });
    }

    async removeGroupMember(groupId, memberId) {
        return this.fetch(`/groups/removeMember/${groupId}/${memberId}`, {
            method: 'DELETE'
        });
    }

    // Dashboard API methods
    async getDashboardData(userId) {
        return this.fetch(`/dashboard/stats/${userId}`);
    }

    // Notes API methods
    async getNotesList(userId, filters = {}, page = 1, pageSize = 10) {
        const queryParams = new URLSearchParams({
            userId: userId.toString(),
            page: page.toString(),
            pageSize: pageSize.toString()
        });

        // Add filters to query params if they exist
        Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                queryParams.append(key, filters[key].toString());
            }
        });

        return this.fetch(`/notes/notesList?${queryParams.toString()}`);
    }

    async createNote(noteData) {
        return this.fetch('/notes/createNote', {
            method: 'POST',
            body: JSON.stringify(noteData)
        });
    }

    async updateNote(noteId, noteData) {
        return this.fetch(`/notes/updateNote/${noteId}`, {
            method: 'PUT',
            body: JSON.stringify(noteData)
        });
    }

    async deleteNote(noteId) {
        return this.fetch(`/notes/deleteNote/${noteId}`, {
            method: 'DELETE'
        });
    }

    async getNoteById(noteId) {
        return this.fetch(`/notes/note/${noteId}`);
    }

    async updateNoteColor(noteId, color) {
        return this.fetch(`/notes/updateColor/${noteId}`, {
            method: 'PATCH',
            body: JSON.stringify({ color })
        });
    }

    // Highlight API methods
    async addHighlight(noteId, highlightData) {
        return this.fetch(`/notes/addHighlight/${noteId}`, {
            method: 'POST',
            body: JSON.stringify(highlightData)
        });
    }

    async removeHighlight(noteId, highlightData) {
        return this.fetch(`/notes/removeHighlight/${noteId}`, {
            method: 'DELETE',
            body: JSON.stringify(highlightData)
        });
    }

    async getNoteHighlights(noteId) {
        return this.fetch(`/notes/getHighlights/${noteId}`);
    }

    // Utility methods
    getImageUrl(imagePath) {
        if (!imagePath) return null;
        const config = configService.getConfig();
        return `${config.baseUrl}${imagePath}`;
    }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
