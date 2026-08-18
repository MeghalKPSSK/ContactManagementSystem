import type { AppConfig } from '../types';

// Configuration service to load config once and reuse throughout the app
class ConfigService {
  private config: AppConfig | null = null;
  private loading = false;
  private loadPromise: Promise<AppConfig> | null = null;

  async loadConfig(): Promise<AppConfig> {
    // If already loaded, return cached config
    if (this.config) {
      return this.config;
    }

    // If already loading, wait for the existing promise
    if (this.loading && this.loadPromise) {
      return this.loadPromise;
    }

    // Load config for the first time
    this.loading = true;
    this.loadPromise = this._fetchConfig();

    try {
      this.config = await this.loadPromise;
      this.loading = false;
      return this.config;
    } catch (error) {
      this.loading = false;
      this.loadPromise = null;
      throw error;
    }
  }

  private async _fetchConfig(): Promise<AppConfig> {
    try {
      const response = await fetch('/config.json');
      if (!response.ok) {
        throw new Error('Failed to load config');
      }
      const config = (await response.json()) as AppConfig;

      // Add derived URLs for convenience
      config.baseUrl = config.apiUrl.replace('/api', ''); // For static files

      return config;
    } catch (error) {
      console.error('Error loading config:', error);
      throw error;
    }
  }

  // Get config synchronously (only after it's been loaded)
  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Config not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  // Get API URL
  getApiUrl(): string {
    return this.getConfig().apiUrl;
  }

  // Get base URL for static files
  getBaseUrl(): string {
    return this.getConfig().baseUrl;
  }

  // Reset config (useful for testing or forced reload)
  reset(): void {
    this.config = null;
    this.loading = false;
    this.loadPromise = null;
  }
}

// Create singleton instance
const configService = new ConfigService();

export default configService;
