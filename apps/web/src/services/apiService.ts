import configService from './configService';
import type {
  ApiResponse,
  Contact,
  ContactAttributesResponse,
  ContactResponse,
  ContactsListResponse,
  CustomAttributesResponse,
  GenericMessageResponse,
  GroupResponse,
  GroupsListResponse,
  NoteResponse,
  NotesListResponse,
  UserResponse,
  StoredUser,
} from '../types';

export interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

export interface RequestOptions extends RequestInit {
  body?: BodyInit | null;
}

export interface UpdateUserData extends Omit<Partial<StoredUser>, 'profileImage'> {
  profileImage?: File | string | null;
}

// API service to handle all API calls with centralized config
class ApiService {
  async fetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const config = configService.getConfig();
    const url = `${config.apiUrl}${endpoint}`;

    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, { ...options, headers });
    const data = (await response.json()) as T & { message?: string };

    if (!response.ok) {
      const errorMessage = data.message || `HTTP error! status: ${response.status}`;
      const error = new Error(errorMessage) as ApiError;
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  async getUserById(userId: string): Promise<UserResponse> {
    return this.fetch<UserResponse>(`/users/user/${userId}`);
  }

  async updateUser(userId: string, userData: UpdateUserData): Promise<UserResponse> {
    const formData = new FormData();

    Object.keys(userData).forEach((key) => {
      const value = userData[key as keyof UpdateUserData];
      if (key !== 'profileImage' && value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    if (userData.profileImage instanceof File) {
      formData.append('profileImage', userData.profileImage);
    }

    return this.fetch<UserResponse>(`/users/updateUser/${userId}`, {
      method: 'PUT',
      body: formData,
    });
  }

  async changePassword(userId: string, passwordData: Record<string, string>): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>(`/users/changePassword/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }

  async updateUserPlan(userId: string, plan: string): Promise<UserResponse> {
    return this.fetch<UserResponse>(`/users/updatePlan/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ plan }),
    });
  }

  async loginUser(credentials: Record<string, string>): Promise<UserResponse> {
    return this.fetch<UserResponse>('/users/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async registerUser(userData: Record<string, string>): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>('/users/registerUser', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getContacts(userId: string): Promise<ContactsListResponse> {
    return this.fetch<ContactsListResponse>(`/contacts/contactsList/${userId}`);
  }

  async createContact(contactData: Partial<Contact>): Promise<ContactResponse> {
    return this.fetch<ContactResponse>('/contacts/createContact', {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  }

  async updateContact(contactId: string, contactData: Partial<Contact>): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>(`/contacts/updateContact/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(contactData),
    });
  }

  async deleteContact(contactId: string): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>(`/contacts/deleteContact/${contactId}`, { method: 'DELETE' });
  }

  async starContact(contactId: string): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>(`/contacts/starContact/${contactId}`, { method: 'PUT' });
  }

  async unstarContact(contactId: string): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>(`/contacts/unstarContact/${contactId}`, { method: 'PUT' });
  }

  async getGroups(userId: string): Promise<GroupsListResponse> {
    return this.fetch<GroupsListResponse>(`/groups/groupsList/${userId}`);
  }

  async getGroupById(groupId: string): Promise<GroupResponse> {
    return this.fetch<GroupResponse>(`/groups/group/${groupId}`);
  }

  async createGroup(groupData: Record<string, unknown>): Promise<GroupResponse> {
    return this.fetch<GroupResponse>('/groups/createGroup', {
      method: 'POST',
      body: JSON.stringify(groupData),
    });
  }

  async updateGroup(groupId: string, groupData: Record<string, unknown>): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>(`/groups/updateGroup/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(groupData),
    });
  }

  async deleteGroup(groupId: string): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>(`/groups/deleteGroup/${groupId}`, { method: 'DELETE' });
  }

  async addGroupMember(groupId: string, memberData: Record<string, unknown>): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>(`/groups/addMember/${groupId}`, {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  async removeGroupMember(groupId: string, memberId: string): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>(`/groups/removeMember/${groupId}/${memberId}`, { method: 'DELETE' });
  }

  async getDashboardData(userId: string): Promise<ApiResponse> {
    return this.fetch<ApiResponse>(`/dashboard/stats/${userId}`);
  }

  async getNotesList(userId: string, filters: Record<string, string> = {}, page = 1, pageSize = 10): Promise<NotesListResponse> {
    const queryParams = new URLSearchParams({ userId, page: String(page), pageSize: String(pageSize) });
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') queryParams.append(key, String(value));
    });
    return this.fetch<NotesListResponse>(`/notes/notesList?${queryParams.toString()}`);
  }

  async createNote(noteData: Record<string, unknown>): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>('/notes/createNote', { method: 'POST', body: JSON.stringify(noteData) });
  }

  async updateNote(noteId: string, noteData: Record<string, unknown>): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>(`/notes/updateNote/${noteId}`, { method: 'PUT', body: JSON.stringify(noteData) });
  }

  async deleteNote(noteId: string): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>(`/notes/deleteNote/${noteId}`, { method: 'DELETE' });
  }

  async getNoteById(noteId: string): Promise<NoteResponse> {
    return this.fetch<NoteResponse>(`/notes/note/${noteId}`);
  }

  async updateNoteColor(noteId: string, color: string): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>(`/notes/updateColor/${noteId}`, { method: 'PATCH', body: JSON.stringify({ color }) });
  }

  async addHighlight(noteId: string, highlightData: Record<string, unknown>): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>(`/notes/addHighlight/${noteId}`, { method: 'POST', body: JSON.stringify(highlightData) });
  }

  async removeHighlight(noteId: string, highlightData: Record<string, unknown>): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>(`/notes/removeHighlight/${noteId}`, { method: 'DELETE', body: JSON.stringify(highlightData) });
  }

  async getNoteHighlights(noteId: string): Promise<ApiResponse> {
    return this.fetch<ApiResponse>(`/notes/getHighlights/${noteId}`);
  }

  async getCustomAttributes(userId: string): Promise<CustomAttributesResponse> {
    return this.fetch<CustomAttributesResponse>(`/contacts/customAttributes?${new URLSearchParams({ userId })}`);
  }

  async createCustomAttribute(definition: Record<string, unknown>): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>('/contacts/customAttributes', { method: 'POST', body: JSON.stringify(definition) });
  }

  async updateCustomAttribute(attrId: string, patch: Record<string, unknown>): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>(`/contacts/customAttributes/${attrId}`, { method: 'PUT', body: JSON.stringify(patch) });
  }

  async getContactAttributes(contactId: string): Promise<ContactAttributesResponse> {
    return this.fetch<ContactAttributesResponse>(`/contacts/contact/${contactId}/attributes`);
  }

  async upsertContactAttributes(contactId: string, values: unknown[]): Promise<GenericMessageResponse> {
    return this.fetch<GenericMessageResponse>(`/contacts/contact/${contactId}/attributes`, { method: 'PUT', body: JSON.stringify({ values }) });
  }

  getImageUrl(imagePath: string | null | undefined): string | null {
    if (!imagePath) return null;
    return `${configService.getConfig().baseUrl}${imagePath}`;
  }
}

const apiService = new ApiService();
export default apiService;
