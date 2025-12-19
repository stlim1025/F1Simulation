
/**
 * F1 Simulator Multiplayer Backend
 * Language: Node.js (Express + Socket.io)
 * Concept: Real-time room management and Vector-based setup analysis.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const cors = require('cors');
const { Pool } = require('pg');

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: { origin: "*" }
});

// PostgreSQL Connection
const pool = new Pool({
  user: 'myuser',
  host: 'localhost',
  database: 'f1simulator',
  password: 'Tmdxor12!',
  port: 5432,
});

// Initialize DB Table
pool.query(`
  CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(err => console.error('Error creating table:', err));

// API Routes
app.get('/api/posts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts', async (req, res) => {
  const { title, content, author } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO posts (title, content, author) VALUES ($1, $2, $3) RETURNING *',
      [title, content, author]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vector DB Simulation (In-memory Store)
// In a production app, we would use something like Pinecone or Weaviate.
const vectorStore = {
  data: [], // Each entry: { vector: [fWing, rWing, ...], playerId, nickname, timestamp }

  // Convert a CarSetup object into a normalized numerical vector
  toVector(setup) {
    return [
      setup.frontWing / 50,
      setup.rearWing / 50,
      setup.onThrottleDiff / 100,
      setup.offThrottleDiff / 100,
      setup.frontRideHeight / 50,
      setup.rearRideHeight / 50,
      setup.tireCompound === 'SOFT' ? 1.0 : setup.tireCompound === 'MEDIUM' ? 0.5 : 0
    ];
  },

  add(player) {
    const vector = this.toVector(player.setup);
    this.data.push({ vector, playerId: player.id, nickname: player.nickname, timestamp: Date.now() });
    console.log(`[VectorDB] Indexed setup vector for ${player.nickname}`);
  }
};

const rooms = new Map(); // id -> Room object

io.on('connection', (socket) => {
  console.log(`Driver connected: ${socket.id}`);

  socket.on('createRoom', ({ name, trackId, player }) => {
    const roomId = Math.random().toString(36).substr(2, 9);
    const room = {
      id: roomId,
      name,
      trackId,
      hostId: socket.id,
      players: [{ ...player, id: socket.id, isReady: true }],
      status: 'lobby'
    };
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.emit('roomCreated', room);
    io.emit('lobbyUpdate', Array.from(rooms.values()));

    // Add setup to vector DB for analysis
    vectorStore.add({ ...player, id: socket.id });
  });

  socket.on('joinRoom', ({ roomId, player }) => {
    const room = rooms.get(roomId);
    if (room && room.players.length < 4) {
      const newPlayer = { ...player, id: socket.id, isReady: false };
      room.players.push(newPlayer);
      socket.join(roomId);
      io.to(roomId).emit('playerJoined', room);
      io.emit('lobbyUpdate', Array.from(rooms.values()));

      vectorStore.add(newPlayer);
    } else {
      socket.emit('error', 'Room full or not found');
    }
  });

  socket.on('updateSetup', ({ roomId, setup, livery }) => {
    const room = rooms.get(roomId);
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.setup = setup;
        player.livery = livery;
        socket.to(roomId).emit('playerSync', { id: socket.id, setup, livery });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Driver disconnected');
    // Cleanup logic for rooms
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`F1 Multiplayer Server running on port ${PORT}`);
});
