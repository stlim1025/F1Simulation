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
  comments: [],
  access_logs: [],
  chat_messages: [],
  simulation_records: [],
  race_records: []
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

  // Handle unexpected errors on idle clients
  pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle client:', err.message);
    if (err.message.includes('timeout') || err.message.includes('terminated')) {
      console.log('[DB] Switching to memory mode temporarily.');
      dbType = 'memory';
    }
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
      let query = `
        SELECT p.*, COUNT(c.id)::int as comment_count 
        FROM posts p 
        LEFT JOIN comments c ON p.id = c.post_id 
      `;
      let params = [];
      let conditions = [];

      if (teamId && teamId !== 'ALL') {
        conditions.push(`p.team_id = $${params.length + 1}`);
        params.push(teamId);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' GROUP BY p.id ORDER BY p.created_at DESC';

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err) {
      console.error('[DB] ❌ GET /api/posts error:', err);
      res.status(500).json({ error: 'Database query failed' });
    }
  } else {
    // Local DB
    let posts = localDb.posts.map(p => ({
      ...p,
      comment_count: localDb.comments.filter(c => c.post_id == p.id).length
    }));

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
      console.error('[DB] ❌ POST /api/posts error:', err);
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
  console.log(`[API] POST /api/comments - postId: ${postId}, author: ${author}`);
  if (dbType === 'postgres') {
    try {
      const result = await pool.query(
        'INSERT INTO comments (post_id, content, author) VALUES ($1, $2, $3) RETURNING *',
        [postId, content, author]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('[DB] ❌ POST /api/comments error:', err);
      res.status(500).json({ error: 'Comment creation failed', detail: err.message });
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


// --- HELPER FOR DB LOGGING ---
const logAccess = async (socket, action, nickname = null, roomId = null) => {
  const ip = socket.handshake.address || socket.request.connection.remoteAddress || 'unknown';
  const ua = socket.handshake.headers['user-agent'] || 'unknown';
  const socketId = socket.id;

  if (dbType === 'postgres') {
    try {
      await pool.query(
        'INSERT INTO access_logs (socket_id, nickname, ip, user_agent, action, room_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [socketId, nickname, ip, ua, action, roomId]
      );
    } catch (err) {
      console.error('[DB] Failed to log access:', err.message);
    }
  } else {
    localDb.access_logs.push({
      id: localDb.access_logs.length + 1,
      socket_id: socketId,
      nickname,
      ip,
      user_agent: ua,
      action,
      room_id: roomId,
      created_at: new Date().toISOString()
    });
    saveLocalDb();
  }
};

const saveChatMessage = async (roomId, nickname, teamId, content) => {
  if (dbType === 'postgres') {
    try {
      await pool.query(
        'INSERT INTO chat_messages (room_id, nickname, team_id, content) VALUES ($1, $2, $3, $4)',
        [roomId, nickname, teamId, content]
      );
    } catch (err) {
      console.error('[DB] Failed to save chat:', err.message);
    }
  } else {
    localDb.chat_messages.push({
      id: localDb.chat_messages.length + 1,
      room_id: roomId,
      nickname,
      team_id: teamId,
      content,
      created_at: new Date().toISOString()
    });
    saveLocalDb();
  }
};

const saveSimulationRecord = async (data) => {
  const { nickname, teamId, driverId, trackId, setup, lapTime } = data;
  if (dbType === 'postgres') {
    try {
      await pool.query(
        'INSERT INTO simulation_records (nickname, team_id, driver_id, track_id, setup, lap_time) VALUES ($1, $2, $3, $4, $5, $6)',
        [nickname, teamId, driverId, trackId, setup, lapTime]
      );
    } catch (err) {
      console.error('[DB] Failed to save solo record:', err.message);
    }
  } else {
    localDb.simulation_records.push({
      id: localDb.simulation_records.length + 1,
      nickname,
      team_id: teamId,
      driver_id: driverId,
      track_id: trackId,
      setup,
      lap_time: lapTime,
      created_at: new Date().toISOString()
    });
    saveLocalDb();
  }
};

const saveRaceRecord = async (data) => {
  const { roomId, nickname, teamId, trackId, lapTime } = data;
  if (dbType === 'postgres') {
    try {
      await pool.query(
        'INSERT INTO race_records (room_id, nickname, team_id, track_id, lap_time) VALUES ($1, $2, $3, $4, $5)',
        [roomId, nickname, teamId, trackId, lapTime]
      );
    } catch (err) {
      console.error('[DB] Failed to save race record:', err.message);
    }
  } else {
    localDb.race_records.push({
      id: localDb.race_records.length + 1,
      room_id: roomId,
      nickname,
      team_id: teamId,
      track_id: trackId,
      lap_time: lapTime,
      created_at: new Date().toISOString()
    });
    saveLocalDb();
  }
};


// --- REAL-TIME MULTIPLAYER (Socket.io) ---

const rooms = new Map(); // roomId -> Room Object

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);
  logAccess(socket, 'connect');

  // 1. Lobby & Room Management
  socket.on('getLobby', () => {
    socket.emit('lobbyUpdate', Array.from(rooms.values()));
  });

  socket.on('createRoom', ({ name, trackId, player, totalLaps }) => {
    const roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    const newRoom = {
      id: roomId,
      name,
      trackId,
      hostId: socket.id,
      totalLaps: totalLaps || 3, // Default 3 laps
      weather: 'sunny', // Default weather
      players: [{ ...player, id: socket.id, isReady: true, x: 0, y: 0, rotation: 0, lap: 1, finished: false }],
      status: 'lobby',
      createdAt: Date.now(),
      chatHistory: [] // 채팅 내역 저장용
    };
    rooms.set(roomId, newRoom);
    socket.join(roomId);

    logAccess(socket, 'create_room', player.nickname, roomId);

    socket.emit('roomJoined', newRoom);
    io.emit('lobbyUpdate', Array.from(rooms.values()));
    console.log(`[Room] Created ${roomId} by ${player.nickname} (Laps: ${newRoom.totalLaps})`);
  });

  socket.on('joinRoom', ({ roomId, player }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('error', 'Room not found');
    if (room.status !== 'lobby') return socket.emit('error', 'Game in progress');
    if (room.players.length >= 4) return socket.emit('error', 'Room full');

    const newPlayer = { ...player, id: socket.id, isReady: false, x: 0, y: 0, rotation: 0, lap: 1, finished: false };
    room.players.push(newPlayer);
    socket.join(roomId);

    logAccess(socket, 'join_room', player.nickname, roomId);

    io.to(roomId).emit('roomUpdate', room);
    socket.emit('roomJoined', room);
    io.emit('lobbyUpdate', Array.from(rooms.values()));

    // 현재 방의 채팅 내역만 전송 (최근 50개)
    if (room.chatHistory && room.chatHistory.length > 0) {
      socket.emit('chat:history', room.chatHistory);
    } else {
      // 메모리에 없을 경우 DB에서 로드 (선택 사항, 여기서는 우선 메모리 기반)
      socket.emit('chat:history', []);
    }

    console.log(`[Room] ${player.nickname} joined ${roomId}`);
  });

  socket.on('room:kick', ({ roomId, targetId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.hostId !== socket.id) return; // Only host can kick

    const targetPlayer = room.players.find(p => p.id === targetId);
    if (!targetPlayer) return;

    room.players = room.players.filter(p => p.id !== targetId);

    // Notify the kicked player
    io.to(targetId).emit('kicked');

    // Make the kicked socket leave the room
    const targetSocket = io.sockets.sockets.get(targetId);
    if (targetSocket) {
      targetSocket.leave(roomId);
    }

    io.to(roomId).emit('roomUpdate', room);
    io.emit('lobbyUpdate', Array.from(rooms.values()));
    console.log(`[Room] ${targetPlayer.nickname} was kicked from ${roomId}`);
  });

  socket.on('rejoinRoom', ({ roomId, player }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('error', 'Room not found for rejoin');

    // 기존 플레이어가 있는지 확인 (ID 또는 닉네임 기준)
    let p = room.players.find(pl => pl.id === socket.id || pl.nickname === player.nickname);

    if (p) {
      const wasHost = (p.id === room.hostId);
      p.id = socket.id; // 소켓 ID 갱신

      if (wasHost) {
        room.hostId = socket.id;
        console.log(`[Room] Host privileges transferred to rejoining socket ${socket.id} for room ${roomId}`);
      }

      // 최신 셋업 정보 반영
      p.setup = player.setup;
      p.livery = player.livery;
    } else {
      if (room.players.length >= 4) return socket.emit('error', 'Room full');
      p = { ...player, id: socket.id, isReady: false, x: 0, y: 0, rotation: 0, lap: 1, finished: false };
      room.players.push(p);
    }

    socket.join(roomId);
    socket.emit('roomJoined', room);
    io.to(roomId).emit('roomUpdate', room);

    if (room.chatHistory && room.chatHistory.length > 0) {
      socket.emit('chat:history', room.chatHistory);
    }

    console.log(`[Room] ${player.nickname} rejoined ${roomId}`);
  });

  socket.on('leaveRoom', () => {
    handleDisconnect(socket);
  });

  socket.on('room:changeTrack', ({ roomId, trackId }) => {
    const room = rooms.get(roomId);
    if (room && room.hostId === socket.id) {
      room.trackId = trackId;
      io.to(roomId).emit('roomUpdate', room);
      io.emit('lobbyUpdate', Array.from(rooms.values()));
    }
  });

  socket.on('room:changeLaps', ({ roomId, laps }) => {
    const room = rooms.get(roomId);
    if (room && room.hostId === socket.id) {
      room.totalLaps = laps;
      io.to(roomId).emit('roomUpdate', room);
      io.emit('lobbyUpdate', Array.from(rooms.values()));
    }
  });

  socket.on('room:reset', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.hostId === socket.id) {
      room.status = 'lobby';
      room.raceStartTime = null;
      room.players.forEach(p => {
        p.isReady = false;
        p.finished = false;
        p.finishTime = null;
        p.lap = 1;
      });
      io.to(roomId).emit('roomUpdate', room);
      io.emit('lobbyUpdate', Array.from(rooms.values()));
      console.log(`[Room] Reset ${roomId} to lobby by host`);
    }
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

  socket.on('room:changeWeather', ({ roomId, weather }) => {
    const room = rooms.get(roomId);
    if (room && room.hostId === socket.id) {
      room.weather = weather;
      io.to(roomId).emit('roomUpdate', room);
    }
  });

  socket.on('startRace', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.hostId === socket.id) {
      // 1. Enter Countdown
      room.status = 'countdown';

      // Reset players for race
      room.players.forEach(p => {
        p.finished = false;
        p.finishTime = null;
        p.lap = 1;
      });

      io.to(roomId).emit('roomUpdate', room);
      io.emit('lobbyUpdate', Array.from(rooms.values())); // Update status in lobby

      console.log(`[Race] Countdown started in ${roomId}`);

      // 2. Start Race after 3 seconds
      setTimeout(() => {
        if (rooms.has(roomId)) {
          room.status = 'racing';
          room.raceStartTime = Date.now();
          io.to(roomId).emit('raceStarted', room);
          io.emit('lobbyUpdate', Array.from(rooms.values()));
          console.log(`[Race] GO! in ${roomId}`);
        }
      }, 3000);
    }
  });

  // 2. Real-time Racing Logic
  socket.on('playerMove', ({ roomId, x, y, rotation, speed, lap }) => {
    // Broadcast movement to others in room ONLY (optimization)
    socket.to(roomId).emit('playerMoved', { id: socket.id, x, y, rotation, speed, lap });

    // Update server state (optional, for result verification)
    const room = rooms.get(roomId);
    if (room) {
      const p = room.players.find(p => p.id === socket.id);
      if (p) {
        p.x = x;
        p.y = y;
        p.rotation = rotation;
        p.speed = speed;
        if (lap) p.lap = lap;
      }
    }
  });

  socket.on('finishRace', async ({ roomId, time }) => {
    const room = rooms.get(roomId);
    if (room) {
      const p = room.players.find(p => p.id === socket.id);
      if (p && !p.finished) {
        p.finished = true;
        p.finishTime = time;

        // Save race record to DB
        saveRaceRecord({
          roomId,
          nickname: p.nickname,
          teamId: p.team?.id,
          trackId: room.trackId,
          lapTime: parseFloat(time)
        });

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
    logAccess(socket, 'disconnect');
    handleDisconnect(socket);
  });

  // 3. Chat System
  socket.on('chat:send', ({ roomId, nickname, teamId, content }) => {
    if (!roomId || !content) return;
    saveChatMessage(roomId, nickname, teamId, content);
    const msg = {
      nickname,
      teamId,
      content,
      time: new Date().toISOString()
    };
    const room = rooms.get(roomId);
    if (room) {
      if (!room.chatHistory) room.chatHistory = [];
      room.chatHistory.push(msg);
      // 최근 50개만 유지 (메모리 관리용)
      if (room.chatHistory.length > 50) room.chatHistory.shift();
    }
    io.to(roomId).emit('chat:message', msg);
  });

  // 4. Data Persistence (Solo)
  socket.on('race:save_solo', (data) => {
    saveSimulationRecord(data);
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
      socket.leave(roomId); // Explicitly leave the socket room
      io.emit('lobbyUpdate', Array.from(rooms.values()));
      break;
    }
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`F1 Server (Postgres+Socket.io) running on port ${PORT}`);
});
