export interface RegisterUserPayload {
  firstName: string;
  lastName?: string;
  phone: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  loginUsername: string;
  loginPassword: string;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  username?: string;
  profileImage?: string | null;
}

export interface UserDto {
  uid: string | null;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string;
  username: string;
  profileImage?: string | null;
  status: string;
  registeredOn: Date;
  modifiedOn: Date;
  plan: string;
  role: string;
  lastLogin?: Date | null;
}

export type SidebarItemKey = 'dragon' | 'dashboard' | 'contacts' | 'notes' | 'profile' | 'groups' | 'settings';
export type ThemeMode = 'light' | 'dark';
export type TagsChartType = 'pie' | 'donut';
export type FavoritesChartType = 'bar' | 'line';
export type GroupsChartType = 'mixed' | 'line' | 'bar' | 'area';

export interface DashboardChartTypes {
  tags: TagsChartType;
  favorites: FavoritesChartType;
  groups: GroupsChartType;
}

export interface UserPreferences {
  themeMode: ThemeMode;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  sidebarOrder: SidebarItemKey[];
  dashboardChartTypes: DashboardChartTypes;
  dashboardColors: string[];
}
