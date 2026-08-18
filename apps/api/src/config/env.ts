import path from 'path';
import { config } from 'dotenv';

// The repository root is the single source of environment configuration.
config({ path: path.resolve(__dirname, '../../../../.env') });
