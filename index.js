const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const rooms = {};

const generateRoomId = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let roomId = "";
  for (let i = 0; i < 4; i++) {
    roomId += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return roomId;
};

const updateUsers = (roomId) => {
  if (rooms[roomId]) {
    io.to(roomId).emit("update_users", rooms[roomId].users);
  }
};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("create_room", (username) => {
    let roomId;
    do {
      roomId = generateRoomId();
    } while (rooms[roomId]);

    rooms[roomId] = {
      host: socket.id,
      users: [{ id: socket.id, username }],
    };

    socket.join(roomId);
    console.log(`Room created: ${roomId} by host ${socket.id}`);

    socket.emit("room_created", roomId);

    updateUsers(roomId);
    console.log(rooms);
  });

  socket.on("req_update_users", (roomId) => {
    updateUsers(roomId);
  });

  socket.on("join_room", ({ username, roomId }) => {
    if (rooms[roomId]) {
      socket.join(roomId);
      rooms[roomId].users.push({ id: socket.id, username });
      console.log(`${username} joined ${roomId}`);

      updateUsers(roomId);
      socket.emit("room_found");
      console.log(rooms);
    } else {
      socket.emit("error", "Room not found");
    }
  });

  socket.on("leave_room", (roomId) => {
    socket.leave(roomId);

    if (rooms[roomId]) {
      rooms[roomId].users = rooms[roomId].users.filter(
        (user) => user.id !== socket.id
      );

      if (rooms[roomId].users.length === 0) {
        delete rooms[roomId];
      } else {
        updateUsers(roomId);
      }
      console.log(rooms);
    }
  });

  socket.on("room_exist", (roomId, callback) => {
    if (rooms[roomId]) {
      callback(true); // Room exists
    } else {
      callback(false); // Room not found
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    for (let roomId in rooms) {
      rooms[roomId].users = rooms[roomId].users.filter(
        (user) => user.id !== socket.id
      );

      if (rooms[roomId].users.length === 0) {
        delete rooms[roomId];
      } else {
        updateUsers(roomId);
      }
    }
    console.log(rooms);
  });
});

server.listen(3001, () => {
  console.log("Server listening on port 3001...");
});
