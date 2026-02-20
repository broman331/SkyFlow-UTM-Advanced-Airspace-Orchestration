/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    // Enable the PostGIS Extension
    pgm.createExtension('postgis', { ifNotExists: true });

    // Users Table
    pgm.createTable('users', {
        id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
        email: { type: 'varchar(255)', notNull: true, unique: true },
        password_hash: { type: 'varchar(255)', notNull: true },
        role: { type: 'varchar(50)', notNull: true, default: 'PILOT' },
        created_at: { type: 'timestamp with time zone', default: pgm.func('current_timestamp') }
    });

    // Active Flight Paths
    pgm.createTable('active_flight_paths', {
        id: { type: 'serial', primaryKey: true },
        flight_id: { type: 'varchar(50)', notNull: true, unique: true },
        pilot_id: { type: 'varchar(50)', notNull: true },
        geom: { type: 'geometry(LineString, 4326)', notNull: true },
        start_time: { type: 'timestamp with time zone', notNull: true },
        end_time: { type: 'timestamp with time zone', notNull: true }
    });
    pgm.createIndex('active_flight_paths', 'geom', { method: 'gist' });

    // No Fly Zones
    pgm.createTable('no_fly_zones', {
        id: { type: 'serial', primaryKey: true },
        zone_id: { type: 'varchar(50)', notNull: true, unique: true },
        zone_name: { type: 'varchar(255)', notNull: false },
        zone_type: { type: 'varchar(50)', notNull: false, default: 'STATIC' },
        geom: { type: 'geometry(Polygon, 4326)', notNull: true },
        max_altitude: { type: 'integer', default: 0 },
        active: { type: 'boolean', default: true },
        active_from: { type: 'timestamp with time zone', default: pgm.func('current_timestamp') },
        active_to: { type: 'timestamp with time zone', notNull: false }
    });
    pgm.createIndex('no_fly_zones', 'geom', { method: 'gist' });

    // Create the default Admin User
    // Note: In real life this would not be hardcoded in migrations, but via a CLI seeder
    const bcrypt = require('bcrypt');
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('adminpassword123', salt);

    pgm.sql(`
        INSERT INTO users (email, password_hash, role) 
        VALUES ('admin@utm.local', '${hash}', 'ADMIN')
        ON CONFLICT (email) DO NOTHING;
    `);

    // Seed mock No Fly Zone (Central Park)
    pgm.sql(`
        INSERT INTO no_fly_zones (zone_id, geom)
        VALUES ('NFZ-CENTRAL-PARK', ST_GeomFromGeoJSON('{
            "type": "Polygon",
            "coordinates": [[
                [-73.9818, 40.7681],
                [-73.9580, 40.8006],
                [-73.9493, 40.7968],
                [-73.9730, 40.7643],
                [-73.9818, 40.7681]
            ]]
        }'))
        ON CONFLICT (zone_id) DO NOTHING;
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropTable('no_fly_zones');
    pgm.dropTable('active_flight_paths');
    pgm.dropTable('users');
    pgm.dropExtension('postgis');
};
