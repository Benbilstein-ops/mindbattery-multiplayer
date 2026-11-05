const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.get("/health", (req, res) => {
  res.json({
    online: true,
    players: players.size
  });
});
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const players = new Map();
const ARENA = { width: 2000, height: 1200 };

io.on("connection", (socket) => {
  players.set(socket.id, {
    id: socket.id,
    x: Math.random() * ARENA.width,
    y: Math.random() * ARENA.height,
    hp: 100,
    score: 0,
    team: Math.random() < 0.5 ? "blue" : "red"
  });

  socket.emit("welcome", {
    id: socket.id,
    arena: ARENA,
    players: [...players.values()]
  });

  socket.broadcast.emit("playerJoined", players.get(socket.id));

  socket.on("move", (data) => {
    const p = players.get(socket.id);
    if (!p || !Number.isFinite(data.x) || !Number.isFinite(data.y)) return;

    p.x = Math.max(0, Math.min(ARENA.width, data.x));
    p.y = Math.max(0, Math.min(ARENA.height, data.y));

    socket.broadcast.emit("playerMoved", {
      id: p.id,
      x: p.x,
      y: p.y
    });
  });

  socket.on("shoot", (data) => {
    const p = players.get(socket.id);
    if (!p || !Number.isFinite(data.x) || !Number.isFinite(data.y)) return;

    // Der Server verteilt den Schuss an alle verbundenen Spieler.
    io.emit("shot", {
      id: p.id,
      x: p.x,
      y: p.y,
      targetX: data.x,
      targetY: data.y
    });
  });

  socket.on("disconnect", () => {
    players.delete(socket.id);
    io.emit("playerLeft", socket.id);
  });
});

app.get("/", (_req, res) => {
  res.send("MindBattery Paintball Multiplayer Server läuft!");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
