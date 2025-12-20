const { Pool } = require('pg');

const pool = new Pool({
    user: 'myuser',
    host: 'localhost',
    database: 'f1simulator',
    password: 'Tmdxor12!',
    port: 5432,
});

async function init() {
    try {
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL');

        await client.query(`
            CREATE TABLE IF NOT EXISTS access_logs (
                id SERIAL PRIMARY KEY,
                socket_id VARCHAR(50),
                nickname VARCHAR(50),
                ip VARCHAR(50),
                user_agent TEXT,
                action VARCHAR(50),
                room_id VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                room_id VARCHAR(50),
                nickname VARCHAR(50),
                team_id VARCHAR(50),
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS simulation_records (
                id SERIAL PRIMARY KEY,
                nickname VARCHAR(50),
                team_id VARCHAR(100),
                driver_id VARCHAR(100),
                track_id VARCHAR(100),
                setup JSONB,
                lap_time FLOAT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS race_records (
                id SERIAL PRIMARY KEY,
                room_id VARCHAR(50),
                nickname VARCHAR(50),
                team_id VARCHAR(100),
                track_id VARCHAR(100),
                lap_time FLOAT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ New tables initialized!');

        client.release();
        await pool.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
        await pool.end();
    }
}

init();
