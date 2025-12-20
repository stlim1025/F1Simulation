const { Pool } = require('pg');

const pool = new Pool({
    user: 'myuser',
    host: 'localhost',
    database: 'f1simulator',
    password: 'Tmdxor12!',
    port: 5432,
});

async function verify() {
    try {
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL\n');

        const tables = ['access_logs', 'chat_messages', 'simulation_records', 'race_records'];

        for (const table of tables) {
            try {
                const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`📦 Table '${table}': ✅ EXISTS (Rows: ${res.rows[0].count})`);
            } catch (e) {
                console.log(`📦 Table '${table}': ❌ ERROR (${e.message})`);
            }
        }

        client.release();
        await pool.end();
    } catch (err) {
        console.error('❌ Connection Error:', err.message);
        await pool.end();
    }
}

verify();
