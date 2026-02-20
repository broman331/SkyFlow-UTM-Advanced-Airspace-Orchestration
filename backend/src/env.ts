import * as dotenv from 'dotenv';
import * as path from 'path';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '../.env';

// Preload environment variables before any other module reads process.env
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
