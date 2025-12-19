const { Client } = require('pg');

const client = new Client({
    user: 'myuser',
    host: '13.238.218.144',
    database: 'f1simulator',
    password: 'Tmdxor12!',
    port: 5432,
});

async function initDB() {
    try {
        await client.connect();
        console.log('Connected to DB. Creating table...');

        await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        author VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Table "posts" created or already exists.');
        await client.end();
    } catch (err) {
        console.error('❌ Failed to init DB:', err);
        process.exit(1);
    }
}

initDB();
