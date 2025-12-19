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

        // 게시글 확인
        const postsResult = await client.query('SELECT * FROM posts ORDER BY created_at DESC');
        console.log(`📝 Posts (${postsResult.rows.length} total):`);
        console.log('─'.repeat(80));
        postsResult.rows.forEach(post => {
            console.log(`ID: ${post.id} | Title: ${post.title} | Author: ${post.author} | Views: ${post.views}`);
            console.log(`Team: ${post.team_id || 'None'} | Created: ${post.created_at}`);
            console.log('─'.repeat(80));
        });

        // 댓글 확인
        const commentsResult = await client.query('SELECT * FROM comments ORDER BY created_at ASC');
        console.log(`\n💬 Comments (${commentsResult.rows.length} total):`);
        console.log('─'.repeat(80));
        commentsResult.rows.forEach(comment => {
            console.log(`ID: ${comment.id} | Post ID: ${comment.post_id} | Author: ${comment.author}`);
            console.log(`Content: ${comment.content}`);
            console.log(`Created: ${comment.created_at}`);
            console.log('─'.repeat(80));
        });

        client.release();
        await pool.end();

        console.log('\n✅ Verification complete!');
    } catch (err) {
        console.error('❌ Error:', err.message);
        await pool.end();
    }
}

verify();
