import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';

// Support both source (tsx) and compiled (dist) execution layouts.
const envCandidates = [
	path.resolve(process.cwd(), '.env'),
	path.resolve(__dirname, '../../../../.env'),
	path.resolve(__dirname, '../../../../../.env'),
];

const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));
if (envPath) {
	config({ path: envPath });
}
