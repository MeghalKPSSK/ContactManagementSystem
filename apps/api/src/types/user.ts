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
  profileImage?: string;
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
