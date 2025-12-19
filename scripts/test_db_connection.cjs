const { Client } = require('pg');

const client = new Client({
    user: 'myuser',
    host: 'localhost',
    database: 'f1simulator',
    password: 'Tmdxor12!',
    port: 5432,
});

async function testConnection() {
    console.log('Attempting to connect to PostgreSQL at localhost:5432...');
    try {
        await client.connect();
        console.log('✅ Connection successful!');

        const res = await client.query('SELECT NOW()');
        console.log('Database Time:', res.rows[0].now);

        // Check if table exists
        const tableRes = await client.query("SELECT to_regclass('public.posts')");
        console.log('Table "posts" exists:', !!tableRes.rows[0].to_regclass);

        await client.end();
    } catch (err) {
        console.error('❌ Connection failed:', err);
        process.exit(1);
    }
}

testConnection();
