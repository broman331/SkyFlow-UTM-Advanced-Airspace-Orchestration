import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export default async () => {
    console.log('\n[JEST GLOBAL] Running database migrations for testing isolated DB...');
    // Ensure migrations run purely against the test DB 
    execSync('npm run migrate:up', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
};
