export interface ContactCreatePayload {
  user_id: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  alt_phone?: string;
  mobile?: string;
  email?: string;
  address_line?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  company?: string;
  job_title?: string;
  is_favorite?: boolean;
  notes?: string;
  tags?: string[];
}

export interface ContactUpdatePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  alt_phone?: string;
  mobile?: string;
  email?: string;
  address_line?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  company?: string;
  job_title?: string;
  notes?: string;
  tags?: string[];
}

export interface ContactSummary {
  uid: string | null;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  status?: string;
  createdOn?: Date;
  is_favorite?: boolean;
  modifiedOn?: Date;
  'user.uid'?: string | null;
}

export interface ContactDetail {
  uid: string | null;
  user_id: string | null;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  alt_phone: string | null;
  mobile: string | null;
  email: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  company: string | null;
  job_title: string | null;
  is_favorite: boolean;
  notes: string | null;
  tags: ContactTag[];
}

export interface ContactTag {
  uid: string | null;
  name: string;
}

export interface ContactForSelection {
  uid: string | null;
  firstName: string;
  lastName: string | null;
  email: string | null;
}
