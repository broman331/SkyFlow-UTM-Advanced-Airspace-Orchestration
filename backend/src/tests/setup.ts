import { dbPool } from '../db';

beforeAll(async () => {
    // Tests are setting up
});

afterAll(async () => {
    // Graceful closing of database pool connections after testing
    await dbPool.end();
});

beforeEach(async () => {
    // Purging database tables strictly before each test executes
    // Preserves database idempotency per test run
    await dbPool.query('TRUNCATE active_flight_paths, no_fly_zones, users RESTART IDENTITY CASCADE;');
});
