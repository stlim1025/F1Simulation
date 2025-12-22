const { Client } = require('pg');

const client = new Client({
    user: 'myuser',
    host: '13.238.218.144',
    database: 'f1simulator',
    password: 'Tmdxor12!',
    port: 5432,
});

async function checkSchema() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const schema = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'comments' ORDER BY ordinal_position");
        console.log('Comments Table Schema:');
        schema.rows.forEach(row => console.log(` - ${row.column_name}: ${row.data_type} (Nullable: ${row.is_nullable})`));

        const constraints = await client.query(`
            SELECT
                tc.constraint_name, tc.table_name, kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
            WHERE constraint_type = 'FOREIGN KEY' AND tc.table_name='comments';
        `);
        console.log('Comments Table Foreign Keys:', constraints.rows);

        await client.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkSchema();
