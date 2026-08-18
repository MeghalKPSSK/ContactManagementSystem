export interface TagsDistribution {
  counts: number[];
  labels: string[];
}

export interface FavoritesCount {
  favorite: number;
  regular: number;
}

export interface DashboardContact {
  uid: string | null;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  is_favorite: boolean;
  tags: Array<{ uid: string | null; name: string }>;
}

export interface GroupsStatistics {
  group_data: Array<{ name: string; count: number }>;
  tag_data: Array<{ name: string; count: number }>;
}
