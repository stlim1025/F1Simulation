const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.set('trust proxy', 1); // Nginx 프록시 신뢰 설정

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

const io = new Server(server, {
  cors: { origin: "*" } // Allow all origins for dev
});

// --- DATABASE LAYER (Postgres with Fallback) ---
let dbType = 'memory'; // 'postgres' or 'memory'
let pool = null;

// JSON DB File Path (for persistence without Postgres)
const DB_FILE = path.join(__dirname, 'db_fallback.json');

// In-memory data store
let localDb = {
  posts: [],
  comments: []
};

// Load local DB if exists
if (fs.existsSync(DB_FILE)) {
  try {
    localDb = JSON.parse(fs.readFileSync(DB_FILE));
    console.log('[DB] Loaded local fallback database.');
  } catch (e) {
    console.error('[DB] Failed to load local DB:', e);
  }
}

// Save local DB helper
const saveLocalDb = () => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(localDb, null, 2));
  } catch (err) {
    // Silent fail in production or production logging
  }
};

// Initialize Postgres
try {
  pool = new Pool({
    user: 'myuser',
    host: 'localhost',
    database: 'f1simulator',
    password: 'Tmdxor12!',
    port: 5432,
    connectionTimeoutMillis: 5000 // 5초로 증가
  });

  pool.connect()
    .then(client => {
      console.log('[DB] ✅ Connected to PostgreSQL');
      dbType = 'postgres';

      // Init Tables
      client.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT,
          author VARCHAR(100),
          team_id VARCHAR(50),
          views INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          post_id INT REFERENCES posts(id) ON DELETE CASCADE,
          content TEXT,
          author VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `).then(() => {
        console.log('[DB] Tables initialized');
        client.release();
      })
        .catch(err => {
          console.error('[DB] Table Init Error:', err.message);
          client.release();
        });
    })
    .catch(err => {
      console.log('[DB] ❌ PostgreSQL connection failed:', err.message);
      console.log('[DB] Using In-Memory/JSON DB as fallback.');
      dbType = 'memory';
    });
} catch (e) {
  console.log('[DB] ❌ PostgreSQL config error:', e.message);
  console.log('[DB] Using In-Memory/JSON DB as fallback.');
}

// --- API ROUTES ---

// Health Check & Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    dbType: dbType,
    time: new Date().toISOString()
  });
});

// GET All Posts
app.get('/api/posts', async (req, res) => {
  const { teamId } = req.query;

  if (dbType === 'postgres') {
    try {
      let query = 'SELECT * FROM posts';
      let params = [];
      if (teamId && teamId !== 'ALL') {
        query += ' WHERE team_id = $1';
        params.push(teamId);
      }
      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Database query failed' });
    }
  } else {
    // Local DB
    let posts = localDb.posts;
    if (teamId && teamId !== 'ALL') {
      posts = posts.filter(p => p.team_id === teamId);
    }
    // Sort desc
    posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(posts);
  }
});

// GET Single Post (with increments view)
app.get('/api/posts/:id', async (req, res) => {
  const id = req.params.id;

  if (dbType === 'postgres') {
    try {
      await pool.query('UPDATE posts SET views = views + 1 WHERE id = $1', [id]);
      const postRes = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
      const commentsRes = await pool.query('SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at ASC', [id]);

      if (postRes.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

      res.json({
        ...postRes.rows[0],
        comments: commentsRes.rows
      });
    } catch (err) {
      console.error(`[DB] ❌ GET /api/posts/${id} error:`, err);
      res.status(500).json({ error: 'Database query failed', message: err.message });
    }
  } else {
    const post = localDb.posts.find(p => p.id == id); // == for string/number match
    if (!post) return res.status(404).json({ error: 'Post not found' });

    post.views = (post.views || 0) + 1;
    const comments = localDb.comments.filter(c => c.post_id == id);
    saveLocalDb();

    res.json({ ...post, comments });
  }
});

// CREATE Post
app.post('/api/posts', async (req, res) => {
  const { title, content, author, teamId } = req.body;

  if (dbType === 'postgres') {
    try {
      const result = await pool.query(
        'INSERT INTO posts (title, content, author, team_id, views) VALUES ($1, $2, $3, $4, 0) RETURNING *',
        [title, content, author, teamId || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Post creation failed' });
    }
  } else {
    const newPost = {
      id: localDb.posts.length + 1,
      title,
      content,
      author,
      team_id: teamId || null,
      views: 0,
      created_at: new Date().toISOString()
    };
    localDb.posts.push(newPost);
    saveLocalDb();
    res.status(201).json(newPost);
  }
});

// CREATE Comment
app.post('/api/comments', async (req, res) => {
  const { postId, content, author } = req.body;

  if (dbType === 'postgres') {
    try {
      const result = await pool.query(
        'INSERT INTO comments (post_id, content, author) VALUES ($1, $2, $3) RETURNING *',
        [postId, content, author]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Comment creation failed' });
    }
  } else {
    const newComment = {
      id: localDb.comments.length + 1,
      post_id: postId,
      content,
      author,
      created_at: new Date().toISOString()
    };
    localDb.comments.push(newComment);
    saveLocalDb();
    res.status(201).json(newComment);
  }
});


// --- REAL-TIME MULTIPLAYER (Socket.io) ---

const logs = []; // In-memory connection logs

const rooms = new Map(); // roomId -> Room Object

io.on('connection', (socket) => {
  // 1. Lobby & Room Management
  socket.on('getLobby', () => {
    socket.emit('lobbyUpdate', Array.from(rooms.values()));
  });

  socket.on('createRoom', ({ name, trackId, player }) => {
    // Log connection info
    logs.push({
      id: socket.id,
      nickname: player.nickname,
      ip: clientIp,
      ua: userAgent,
      time: new Date().toISOString(),
      action: 'create_room'
    });

    const roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    const newRoom = {
      id: roomId,
      name,
      trackId,
      hostId: socket.id,
      players: [{ ...player, id: socket.id, isReady: true, x: 0, y: 0, rotation: 0, lap: 0, finished: false }],
      status: 'lobby',
      createdAt: Date.now()
    };
    rooms.set(roomId, newRoom);
    socket.join(roomId);
    socket.emit('roomJoined', newRoom);
    io.emit('lobbyUpdate', Array.from(rooms.values()));
    console.log(`[Room] Created ${roomId} by ${player.nickname}`);
  });

  socket.on('joinRoom', ({ roomId, player }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('error', 'Room not found');
    if (room.players.length >= 4) return socket.emit('error', 'Room full');

    if (room.players.some(p => p.nickname === player.nickname)) {
      // Simple nickname dup check
      // return socket.emit('error', 'Nickname already taken in this room');
    }

    // Log connection info
    logs.push({
      id: socket.id,
      nickname: player.nickname,
      ip: clientIp,
      ua: userAgent,
      time: new Date().toISOString(),
      action: 'join_room',
      roomId
    });

    const newPlayer = { ...player, id: socket.id, isReady: false, x: 0, y: 0, rotation: 0, lap: 0, finished: false };
    room.players.push(newPlayer);
    socket.join(roomId);

    io.to(roomId).emit('roomUpdate', room);
    socket.emit('roomJoined', room);
    io.emit('lobbyUpdate', Array.from(rooms.values()));
    console.log(`[Room] ${player.nickname} joined ${roomId}`);
  });

  socket.on('leaveRoom', () => {
    handleDisconnect(socket);
  });

  socket.on('updateReady', ({ roomId, isReady }) => {
    const room = rooms.get(roomId);
    if (room) {
      const p = room.players.find(p => p.id === socket.id);
      if (p) {
        p.isReady = isReady;
        io.to(roomId).emit('roomUpdate', room);
      }
    }
  });

  socket.on('startRace', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.hostId === socket.id) {
      room.status = 'racing';
      // Reset players for race
      room.players.forEach(p => {
        p.finished = false;
        p.finishTime = null;
      });
      io.to(roomId).emit('raceStarted', room);
      io.emit('lobbyUpdate', Array.from(rooms.values()));
      console.log(`[Race] Started in ${roomId}`);
    }
  });

  // 2. Real-time Racing Logic
  socket.on('playerMove', ({ roomId, x, y, rotation, speed }) => {
    // Broadcast movement to others in room ONLY (optimization)
    socket.to(roomId).emit('playerMoved', { id: socket.id, x, y, rotation, speed });

    // Update server state (optional, for result verification)
    const room = rooms.get(roomId);
    if (room) {
      const p = room.players.find(p => p.id === socket.id);
      if (p) {
        p.x = x;
        p.y = y;
        p.rotation = rotation;
        p.speed = speed;
      }
    }
  });

  socket.on('finishRace', ({ roomId, time }) => {
    const room = rooms.get(roomId);
    if (room) {
      const p = room.players.find(p => p.id === socket.id);
      if (p && !p.finished) {
        p.finished = true;
        p.finishTime = time;
        io.to(roomId).emit('playerFinished', { id: socket.id, time, nickname: p.nickname });

        // Check if all finished
        if (room.players.every(pl => pl.finished)) {
          room.status = 'finished';
          io.to(roomId).emit('roomUpdate', room);
          console.log(`[Race] All finished in ${roomId}`);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    handleDisconnect(socket);
  });
});

function handleDisconnect(socket) {
  // Find room where player was
  for (const [roomId, room] of rooms.entries()) {
    const idx = room.players.findIndex(p => p.id === socket.id);
    if (idx !== -1) {
      // Remove player
      room.players.splice(idx, 1);

      if (room.players.length === 0) {
        rooms.delete(roomId); // Delete empty room
      } else {
        // If host left, assign new host
        if (room.hostId === socket.id) {
          room.hostId = room.players[0].id;
        }
        io.to(roomId).emit('roomUpdate', room);
      }
      io.emit('lobbyUpdate', Array.from(rooms.values()));
      break;
    }
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`F1 Server (Postgres+Socket.io) running on port ${PORT}`);
});
