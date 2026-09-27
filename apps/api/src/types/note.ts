export type NoteType = 'personal' | 'contact' | 'group';
export type NoteColor = 'pink' | 'blue' | 'green' | 'yellow' | 'purple';
export type NoteFontFamily =
  | 'handwritten' | 'sans' | 'serif' | 'mono' | 'rounded' | 'humanist'
  | 'book' | 'editorial' | 'geometric' | 'cursive' | 'slab' | 'system';

export interface NoteDrawingPoint {
  x: number;
  y: number;
}

export interface NoteDrawingStroke {
  color: string;
  width: number;
  points: NoteDrawingPoint[];
}

export interface NoteDrawing {
  strokes: NoteDrawingStroke[];
}

export interface NoteCreatePayload {
  user_id: string;
  title: string;
  title_formatting?: unknown | null;
  content: string;
  note_type?: NoteType;
  contact_id?: string | null;
  group_id?: string | null;
  color?: NoteColor;
  font_family?: NoteFontFamily;
  drawing_data?: NoteDrawing | null;
  is_important?: boolean;
  keywords?: Array<string | { keyword: string }>;
}

export interface NoteUpdatePayload {
  title: string;
  title_formatting?: unknown | null;
  content: string;
  note_type?: NoteType;
  contact_id?: string | null;
  group_id?: string | null;
  color?: NoteColor;
  font_family?: NoteFontFamily;
  drawing_data?: NoteDrawing | null;
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
  title_formatting: unknown | null;
  content: string;
  note_type: string;
  contact_id: string | null;
  group_id: string | null;
  color: string;
  font_family: string;
  drawing_data: NoteDrawing | null;
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
  title_formatting: unknown | null;
  content_preview: string;
  note_type: string;
  contact_id: string | null;
  group_id: string | null;
  color: string;
  font_family: string;
  drawing_data: NoteDrawing | null;
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
