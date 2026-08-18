export type NoteType = 'personal' | 'contact' | 'group';
export type NoteColor = 'pink' | 'blue' | 'green' | 'yellow' | 'purple';

export interface NoteCreatePayload {
  user_id: string;
  title: string;
  content: string;
  note_type?: NoteType;
  contact_id?: string | null;
  group_id?: string | null;
  color?: NoteColor;
  is_important?: boolean;
  keywords?: Array<string | { keyword: string }>;
}

export interface NoteUpdatePayload {
  title: string;
  content: string;
  note_type?: NoteType;
  contact_id?: string | null;
  group_id?: string | null;
  color?: NoteColor;
  is_important?: boolean;
  keywords?: Array<string | { keyword: string }>;
}

export interface NoteFilters {
  note_type?: NoteType;
  contact_id?: string;
  group_id?: string;
  search?: string;
  is_important?: boolean;
  keyword?: string;
}

export interface NoteDetail {
  uid: string | null;
  user_id: string | null;
  title: string;
  content: string;
  note_type: string;
  contact_id: string | null;
  group_id: string | null;
  color: string;
  is_important: boolean;
  createdOn: Date;
  modifiedOn: Date;
  contact_first_name: string | null;
  contact_last_name: string | null;
  group_name: string | null;
  keywords: string[];
}

export interface NoteSummary {
  uid: string | null;
  title: string;
  content_preview: string;
  note_type: string;
  contact_id: string | null;
  group_id: string | null;
  color: string;
  is_important: boolean;
  createdOn: Date;
  modifiedOn: Date;
  contact_first_name: string | null;
  contact_last_name: string | null;
  group_name: string | null;
}

export interface NoteSearchResult {
  uid: string | null;
  title: string;
  content_preview: string;
  note_type: string;
  is_important: boolean;
  createdOn: Date;
  matched_keywords: string;
}

export interface NotesStats {
  total_notes: number;
  important_notes: number;
  personal_notes: number;
  contact_notes: number;
  group_notes: number;
}
