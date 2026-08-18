// Shared domain types used across the client app.

export interface AppConfig {
  apiUrl: string;
  baseUrl: string;
  [key: string]: unknown;
}

export interface StoredUser {
  uid: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string;
  username: string;
  profileImage?: string | null;
  status?: string;
  registeredOn?: string;
  modifiedOn?: string;
  plan?: string;
  role?: string;
  lastLogin?: string;
}

export interface Tag {
  uid: string;
  name: string;
}

export interface Contact {
  uid: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  alt_phone?: string | null;
  mobile?: string | null;
  email: string | null;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  company?: string | null;
  job_title?: string | null;
  is_favorite: boolean;
  notes?: string | null;
  status?: string;
  createdOn?: string;
  modifiedOn?: string;
  tags?: Tag[];
}

export interface GroupMember {
  uid: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
}

export interface Group {
  uid: string;
  name: string;
  description: string | null;
  group_icon: string | null;
  user_id?: string;
  createdOn?: string;
  modifiedOn?: string;
  group_members?: number;
  members?: GroupMember[];
}

export type NoteType = 'personal' | 'contact' | 'group';
export type NoteColor = 'pink' | 'blue' | 'green' | 'yellow' | 'purple';

export interface Note {
  uid: string;
  title: string;
  content?: string;
  content_preview?: string;
  note_type: string;
  color: string;
  contact_id?: string | null;
  group_id?: string | null;
  is_important: boolean;
  createdOn?: string;
  modifiedOn?: string;
  keywords?: string[];
}

export interface NotesStats {
  total_notes: number;
  important_notes: number;
  personal_notes: number;
  contact_notes: number;
  group_notes: number;
}

export interface PaginationInfo {
  current: number;
  pageSize: number;
  total: number;
  totalPages?: number;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface GenericMessageResponse {
  success: boolean;
  message?: string;
}

export interface UserResponse extends GenericMessageResponse {
  user: StoredUser;
}

export interface UsersListResponse extends GenericMessageResponse {
  users: StoredUser[];
}

export interface ContactsListResponse extends GenericMessageResponse {
  contacts: Contact[];
  pagination: PaginationInfo;
}

export interface ContactResponse extends GenericMessageResponse {
  contact: Contact;
}

export interface GroupsListResponse extends GenericMessageResponse {
  groups: Group[];
  pagination: PaginationInfo;
}

export interface GroupResponse extends GenericMessageResponse {
  group: Group;
}

export interface NotesListResponse extends GenericMessageResponse {
  notes: Note[];
  pagination: PaginationInfo;
}

export interface NoteResponse extends GenericMessageResponse {
  note: Note;
}

export interface NotesStatsResponse extends GenericMessageResponse {
  stats: NotesStats;
}

export interface TagsResponse extends GenericMessageResponse {
  tags: Tag[];
}

export interface TagResponse extends GenericMessageResponse {
  tag: Tag;
}

export interface CustomAttributesResponse extends GenericMessageResponse {
  attributes: CustomAttributeDefinition[];
}

export interface ContactAttributesResponse extends GenericMessageResponse {
  attributes: ContactAttributeValue[];
}

export interface TagsDistributionResponse extends GenericMessageResponse {
  counts: number[];
  labels: string[];
}

export interface FavoritesCountResponse extends GenericMessageResponse {
  favorite: number;
  regular: number;
}

export interface GroupsStatsResponse extends GenericMessageResponse {
  data: {
    group_data: Array<{ name: string; count: number }>;
    tag_data: Array<{ name: string; count: number }>;
  };
}

export interface DashboardContactsResponse extends GenericMessageResponse {
  contacts: Contact[];
  total: number;
}

export type AttributeType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'radio';

export interface CustomAttributeDefinition {
  uid: string;
  key_name: string;
  label: string;
  type: AttributeType;
  options: string[] | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface ContactAttributeValue {
  key_name: string;
  label: string;
  type: AttributeType;
  options: string[] | null;
  value: string | number | boolean | null;
}
