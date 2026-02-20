import { FullConfig } from '@playwright/test';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Import backend variables to grab test DB URL
dotenv.config({ path: path.join(import.meta.dirname, '../../.env') });

const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function globalSetup(config: FullConfig) {
    console.log('--- PLAYWRIGHT GLOBAL SETUP ---');
    console.log(`Connecting securely to DB: ${process.env.DATABASE_URL}`);

    // Wipe Database tables cleanly before entire E2E suite starts
    // Relying on backend schema assumptions.
    try {
        await dbPool.query('TRUNCATE TABLE users, no_fly_zones CASCADE;');
        console.log('Database explicitly wiped for sterile E2E Test execution.');
    } catch (err) {
        console.error('Failed to wipe database in global setup:', err);
    } finally {
        await dbPool.end();
    }
}

export default globalSetup;
