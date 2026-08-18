export interface ProfileUpdateDetail {
  user: unknown;
}

export const dispatchProfileUpdate = (userData: unknown): void => {
  window.dispatchEvent(new CustomEvent<ProfileUpdateDetail>('profileUpdated', { detail: { user: userData } }));
  console.log('Profile update event dispatched:', userData);
};

export const addProfileUpdateListener = (callback: (detail: ProfileUpdateDetail) => void): (() => void) => {
  const handleProfileUpdate = (event: Event): void => {
    callback((event as CustomEvent<ProfileUpdateDetail>).detail);
  };

  window.addEventListener('profileUpdated', handleProfileUpdate);
  return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
};
