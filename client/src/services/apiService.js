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

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
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
