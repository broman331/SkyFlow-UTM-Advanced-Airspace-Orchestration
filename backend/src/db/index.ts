import { Pool } from 'pg';

export const dbPool = new Pool({
    // Read from the docker-compose environment vars
    connectionString: process.env.DATABASE_URL || 'postgres://utm_admin:utm_password@localhost:5432/utm_database',
});

// Test connection on boot
dbPool.connect((err, client, release) => {
    if (err) {
        console.error('Error acquiring client for PostGIS DB:', err.stack);
    } else {
        console.log('Successfully connected to PostGIS database');
        release();
    }
});
