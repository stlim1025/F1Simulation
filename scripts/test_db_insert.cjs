const { Client } = require('pg');

const client = new Client({
    user: 'myuser',
    host: '13.238.218.144',
    database: 'f1simulator',
    password: 'Tmdxor12!',
    port: 5432,
});

async function testInsert() {
    console.log('Testing INSERT permissions...');
    try {
        await client.connect();

        // 1. Check table structure
        const schema = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'posts'");
        console.log('Table Schema:', schema.rows);

        // 2. Try INSERT
        const res = await client.query(
            "INSERT INTO posts (title, content, author) VALUES ($1, $2, $3) RETURNING *",
            ['Test Title', 'Test Content', 'TestUser']
        );
        console.log('✅ INSERT successful:', res.rows[0]);

        // 3. Clean up
        await client.query("DELETE FROM posts WHERE id = $1", [res.rows[0].id]);
        console.log('✅ DELETE successful (cleanup)');

        await client.end();
    } catch (err) {
        console.error('❌ INSERT Failed:', err);
        process.exit(1);
    }
}

testInsert();
