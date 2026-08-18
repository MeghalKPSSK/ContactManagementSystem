import type { AppConfig } from './types';

// Ad-hoc globals a couple of components stash the loaded runtime config on.
export {};

declare global {
  interface Window {
    apiConfig?: AppConfig;
    groupDetailsConfig?: AppConfig;
  }
}
