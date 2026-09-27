import { Prisma } from '@prisma/client';
import { AppUserModel } from '../models/userModel';
import { CustomAttributeModel } from '../models/customAttributesModel';
import * as passCrypto from '../utils/passCrypto';
import { encryptId, decryptId, decryptIdToNumber } from '../utils/dbEncryption';
import { AppError } from '../utils/errors';
import type {
  RegisterUserPayload,
  LoginPayload,
  UpdateUserPayload,
  UserDto,
  UserPreferences,
  SidebarItemKey,
  DashboardChartTypes,
} from '../types/user';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{6,12}$/;
const SIDEBAR_ITEM_KEYS: SidebarItemKey[] = ['dragon', 'dashboard', 'contacts', 'notes', 'profile', 'groups', 'settings'];
const normalizeProfileImageRef = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/uploads/')) return value;
  if (value.includes('/uploads/')) {
    return value.slice(value.indexOf('/uploads/'));
  }
  return `/uploads/profiles/${value}`;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  themeMode: 'light',
  primaryColor: '#138b7c',
  secondaryColor: '#087568',
  backgroundColor: '#f2f7f5',
  surfaceColor: '#ffffff',
  textColor: '#203a39',
  sidebarOrder: [...SIDEBAR_ITEM_KEYS],
  dashboardChartTypes: { tags: 'donut', favorites: 'bar', groups: 'mixed' },
  dashboardColors: ['#138b7c', '#d78248', '#4a92a4', '#b85f69', '#809958', '#af85bc'],
};

const normalizePreferences = (value: unknown): UserPreferences => {
  const candidate = value && typeof value === 'object' ? value as Partial<UserPreferences> : {};
  const validColor = (color: unknown, fallback: string) =>
    typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
  const requestedOrder = Array.isArray(candidate.sidebarOrder)
    ? candidate.sidebarOrder.filter((key): key is SidebarItemKey => SIDEBAR_ITEM_KEYS.includes(key as SidebarItemKey))
    : [];
  const sidebarOrder = [...new Set(requestedOrder)];

  SIDEBAR_ITEM_KEYS.forEach((key) => {
    if (!sidebarOrder.includes(key)) sidebarOrder.push(key);
  });

  const chartTypeCandidate = candidate.dashboardChartTypes as Partial<DashboardChartTypes> | undefined;
  const chartTypeDefaults = DEFAULT_USER_PREFERENCES.dashboardChartTypes;
  const dashboardChartTypes: DashboardChartTypes = {
    tags: chartTypeCandidate?.tags === 'pie' || chartTypeCandidate?.tags === 'donut' ? chartTypeCandidate.tags : chartTypeDefaults.tags,
    favorites: chartTypeCandidate?.favorites === 'bar' || chartTypeCandidate?.favorites === 'line'
      ? chartTypeCandidate.favorites
      : chartTypeDefaults.favorites,
    groups: ['mixed', 'line', 'bar', 'area'].includes(String(chartTypeCandidate?.groups))
      ? chartTypeCandidate?.groups as DashboardChartTypes['groups']
      : chartTypeDefaults.groups,
  };
  const dashboardColors = DEFAULT_USER_PREFERENCES.dashboardColors.map((fallback, index) =>
    validColor(candidate.dashboardColors?.[index], fallback)
  );
  const themeMode = candidate.themeMode === 'dark' ? 'dark' : 'light';

  return {
    themeMode,
    primaryColor: validColor(candidate.primaryColor, DEFAULT_USER_PREFERENCES.primaryColor),
    secondaryColor: validColor(candidate.secondaryColor, DEFAULT_USER_PREFERENCES.secondaryColor),
    backgroundColor: validColor(candidate.backgroundColor, DEFAULT_USER_PREFERENCES.backgroundColor),
    surfaceColor: validColor(candidate.surfaceColor, DEFAULT_USER_PREFERENCES.surfaceColor),
    textColor: validColor(candidate.textColor, DEFAULT_USER_PREFERENCES.textColor),
    sidebarOrder,
    dashboardChartTypes,
    dashboardColors,
  };
};

export const getUserPreferences = async (userId: string): Promise<UserPreferences> => {
  const decryptedId = decryptIdToNumber(userId);
  if (!decryptedId) throw new AppError('Invalid user ID', 400);

  const user = await AppUserModel.findFirst({
    where: { pk_id: decryptedId, is_deleted: false },
    select: { preferences: true },
  });
  if (!user) throw new AppError('User not found', 404);

  let storedPreferences = user.preferences;
  if (typeof storedPreferences === 'string') {
    try {
      storedPreferences = JSON.parse(storedPreferences);
    } catch {
      storedPreferences = null;
    }
  }

  return normalizePreferences(storedPreferences);
};

export const updateUserPreferences = async (userId: string, preferences: unknown): Promise<UserPreferences> => {
  const decryptedId = decryptIdToNumber(userId);
  if (!decryptedId) throw new AppError('Invalid user ID', 400);

  const userExists = await AppUserModel.findFirst({
    where: { pk_id: decryptedId, is_deleted: false },
    select: { pk_id: true },
  });
  if (!userExists) throw new AppError('User not found', 404);

  const normalized = normalizePreferences(preferences);
  await AppUserModel.update({
    where: { pk_id: decryptedId },
    data: { preferences: normalized as unknown as Prisma.InputJsonValue },
  });

  return normalized;
};

export const registerUser = async (userData: RegisterUserPayload): Promise<number> => {
  const { firstName, lastName, phone, email, username, password, confirmPassword } = userData;

  const existingUser = await AppUserModel.findFirst({
    where: { is_deleted: false, OR: [{ username }, { phone }, { email }] },
    select: { username: true, phone: true, email: true },
  });

  if (existingUser) {
    if (existingUser.username === username) throw new AppError('Username already exists', 400);
    if (existingUser.phone === phone) throw new AppError('Phone number already exists', 400);
    if (existingUser.email === email) throw new AppError('Email already exists', 400);
  }

  if (password !== confirmPassword) {
    throw new AppError('Passwords do not match', 400);
  } else if (password.length < 6 || password.length > 12) {
    throw new AppError('Password must be at least 6 and maximum 12 characters long', 400);
  } else if (!PASSWORD_REGEX.test(password)) {
    throw new AppError(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      400
    );
  }

  const hashedPassword = passCrypto.encrypt16Bit(password);
  const newUser = await AppUserModel.create({
    data: { firstName, lastName: lastName || null, phone, email, username, password: hashedPassword },
  });

  return newUser.pk_id;
};

export const loginUser = async (userData: LoginPayload): Promise<UserDto> => {
  const { loginUsername, loginPassword } = userData;
  const hashedPassword = passCrypto.encrypt16Bit(loginPassword);

  const user = await AppUserModel.findFirst({
    where: { username: loginUsername, password: hashedPassword, status: 'Active', is_deleted: false },
  });

  if (!user) {
    throw new AppError('Invalid username or password', 401);
  }

  const now = new Date();
  await AppUserModel.update({ where: { pk_id: user.pk_id }, data: { lastLogin: now } });

  return {
    uid: encryptId(user.pk_id),
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
    username: user.username,
    profileImage: normalizeProfileImageRef(user.profileImage),
    status: user.status,
    registeredOn: user.registeredOn,
    modifiedOn: user.modifiedOn,
    plan: user.plan || 'free',
    role: user.role || 'User',
    lastLogin: now,
  };
};

export const getUserById = async (userId: string): Promise<UserDto | null> => {
  const decryptedId = decryptId(userId);
  if (!decryptedId) return null;

  const user = await AppUserModel.findFirst({
    where: { pk_id: Number(decryptedId), is_deleted: false },
  });

  if (!user) return null;

  return {
    uid: encryptId(user.pk_id),
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
    username: user.username,
    profileImage: normalizeProfileImageRef(user.profileImage),
    status: user.status,
    registeredOn: user.registeredOn,
    modifiedOn: user.modifiedOn,
    plan: user.plan || 'free',
    role: user.role || 'User',
  };
};

export const updateUser = async (
  userId: string,
  userData: UpdateUserPayload
): Promise<boolean> => {
  const { firstName, lastName, phone, email, username, profileImage } = userData;
  const decryptedId = decryptIdToNumber(userId);
  if (!decryptedId) throw new AppError('Invalid user ID', 400);

  const existingUser = await AppUserModel.findFirst({
    where: { pk_id: { not: decryptedId }, is_deleted: false, OR: [{ username }, { phone }, { email }] },
    select: { username: true, phone: true, email: true },
  });

  if (existingUser) {
    if (existingUser.username === username) throw new AppError('Username already exists', 400);
    if (existingUser.phone === phone) throw new AppError('Phone number already exists', 400);
    if (existingUser.email === email) throw new AppError('Email already exists', 400);
  }

  const updated = await AppUserModel.update({
    where: { pk_id: decryptedId },
    data: {
      firstName,
      lastName: lastName || null,
      phone,
      email,
      username,
      modifiedOn: new Date(),
      ...(profileImage !== undefined ? { profileImage } : {}),
    },
  });

  return !!updated;
};

export const getUsersList = async (): Promise<UserDto[]> => {
  const users = await AppUserModel.findMany({ where: { is_deleted: false }, orderBy: { pk_id: 'desc' } });

  return users.map((user) => ({
    uid: encryptId(user.pk_id),
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
    username: user.username,
    status: user.status,
    registeredOn: user.registeredOn,
    modifiedOn: user.modifiedOn,
    plan: user.plan || 'free',
    role: user.role || 'User',
  }));
};

export const updatePlan = async (userId: string, plan: string): Promise<boolean> => {
  const normalized = (plan || '').toString().toLowerCase();
  const validPlans = new Set(['free', 'pro', 'enterprise']);
  if (!validPlans.has(normalized)) {
    throw new AppError('Invalid plan', 400);
  }

  const decryptedId = decryptIdToNumber(userId);
  if (!decryptedId) throw new AppError('Invalid user ID', 400);

  const activeAttrCount = await CustomAttributeModel.count({
    where: { user_id: decryptedId, is_active: true },
  });

  const limits: Record<string, number> = { free: 3, pro: 5, enterprise: 10 };
  const limit = limits[normalized] ?? 3;
  if (activeAttrCount > limit) {
    throw new AppError(
      `Cannot set plan to '${normalized}': you have ${activeAttrCount} active custom fields, limit is ${limit}. Deactivate some fields first.`,
      400
    );
  }

  const updated = await AppUserModel.update({
    where: { pk_id: decryptedId },
    data: { plan: normalized, modifiedOn: new Date() },
  });

  return !!updated;
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  const decryptedId = decryptIdToNumber(userId);
  if (!decryptedId) return false;

  const deleted = await AppUserModel.update({ where: { pk_id: decryptedId }, data: { is_deleted: true } });
  return !!deleted;
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> => {
  const decryptedId = decryptIdToNumber(userId);
  if (!decryptedId) return false;

  const hashedCurrentPass = passCrypto.encrypt16Bit(currentPassword);
  const user = await AppUserModel.findFirst({
    where: { pk_id: decryptedId, password: hashedCurrentPass },
  });

  if (!user) {
    return false;
  }

  if (!PASSWORD_REGEX.test(newPassword)) {
    throw new AppError(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      400
    );
  }

  const hashedNewPass = passCrypto.encrypt16Bit(newPassword);
  const updated = await AppUserModel.update({ where: { pk_id: decryptedId }, data: { password: hashedNewPass } });

  return !!updated;
};
