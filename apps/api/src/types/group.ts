export interface GroupSavePayload {
  user_id: string;
  name: string;
  description?: string;
  group_icon?: string;
}

export interface GroupUpdatePayload {
  name?: string;
  description?: string;
  group_icon?: string;
}

export interface GroupMemberSummary {
  uid: string | null;
  firstName: string;
  lastName: string | null;
  email: string | null;
}

export interface GroupDetail {
  uid: string | null;
  name: string;
  description: string | null;
  group_icon: string | null;
  user_id: string | null;
  members: GroupMemberSummary[];
  membersTotal: number;
}

export interface GroupSummary {
  uid: string | null;
  name: string;
  createdOn: Date;
  modifiedOn: Date;
  group_icon: string | null;
  description: string | null;
  user_id: string | null;
  group_members: number;
}
