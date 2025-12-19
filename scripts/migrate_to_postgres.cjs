const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// PostgreSQL 연결 설정 (server.cjs와 동일)
const pool = new Pool({
    user: 'myuser',
    host: 'localhost',
    database: 'f1simulator',
    password: 'Tmdxor12!',
    port: 5432,
});

const DB_FILE = path.join(__dirname, 'db_fallback.json');

async function migrate() {
    let client;
    try {
        console.log('[Migration] Starting migration from JSON to PostgreSQL...');

        // JSON 파일 읽기
        if (!fs.existsSync(DB_FILE)) {
            console.error('[Migration] db_fallback.json not found!');
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        console.log(`[Migration] Found ${data.posts.length} posts and ${data.comments.length} comments`);

        // PostgreSQL 연결 확인
        client = await pool.connect();
        console.log('[Migration] Connected to PostgreSQL');

        // 테이블 삭제 및 생성 (최신 스키마 반영 보장)
        console.log('[Migration] Dropping and recreating tables to ensure schema sync...');
        await client.query(`
      DROP TABLE IF EXISTS comments CASCADE;
      DROP TABLE IF EXISTS posts CASCADE;

      CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        author VARCHAR(100),
        team_id VARCHAR(50),
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE comments (
        id SERIAL PRIMARY KEY,
        post_id INT REFERENCES posts(id) ON DELETE CASCADE,
        content TEXT,
        author VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // 기존 데이터 삭제 (선택사항 - 주석 처리하면 중복 방지)
        console.log('[Migration] Clearing existing data...');
        await client.query('TRUNCATE posts, comments RESTART IDENTITY CASCADE');

        // Posts 마이그레이션
        console.log('[Migration] Migrating posts...');
        for (const post of data.posts) {
            await client.query(
                `INSERT INTO posts (id, title, content, author, team_id, views, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [post.id, post.title, post.content, post.author, post.team_id, post.views, post.created_at]
            );
        }

        // Comments 마이그레이션
        console.log('[Migration] Migrating comments...');
        for (const comment of data.comments) {
            await client.query(
                `INSERT INTO comments (id, post_id, content, author, created_at) 
         VALUES ($1, $2, $3, $4, $5)`,
                [comment.id, comment.post_id, comment.content, comment.author, comment.created_at]
            );
        }

        // Sequence 업데이트 (다음 ID가 올바르게 생성되도록)
        const maxPostId = Math.max(...data.posts.map(p => p.id));
        const maxCommentId = Math.max(...data.comments.map(c => c.id));

        await client.query(`SELECT setval('posts_id_seq', $1, true)`, [maxPostId]);
        await client.query(`SELECT setval('comments_id_seq', $1, true)`, [maxCommentId]);

        console.log('[Migration] ✅ Migration completed successfully!');

        // 결과 확인
        const postCount = await client.query('SELECT COUNT(*) FROM posts');
        const commentCount = await client.query('SELECT COUNT(*) FROM comments');
        console.log(`[Migration] Verified: ${postCount.rows[0].count} posts, ${commentCount.rows[0].count} comments in PostgreSQL`);

    } catch (err) {
        console.error('[Migration] ❌ Error:', err.message);
        console.error('[Migration] Full error:', err);
    } finally {
        if (client) client.release();
        await pool.end();
        console.log('[Migration] Connection closed');
    }
}

migrate().catch(console.error);
