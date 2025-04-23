const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const User = require("./models/User");
const Item = require("./models/Item");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:8000"],
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
    io.to(roomId).emit("update_users", Object.values(rooms[roomId].users));
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
      users: {
        [socket.id]: new User(username, socket.id),
      },
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
      const index = Object.values(rooms[roomId].users).findIndex(
        (u) => u.name === username && !u.activity
      );
      if (index === -1) {
        rooms[roomId].users[socket.id] = new User(username, socket.id);
        console.log(`${username} joined ${roomId}`);
      } else {
        Object.entries(rooms[roomId].users).forEach(([k, v]) => {
          if (v.name === username) {
            rooms[roomId].users[k].activity = true;
            console.log(`${username} rejoined ${roomId}`);
          }
        });
      }
      updateUsers(roomId);
      socket.emit("room_found");
      console.log(rooms);
    } else {
      socket.emit("error", "Room not found");
    }
  });

  socket.on("leave_room", (roomId, username) => {});

  socket.on("room_exist", (roomId, callback) => {
    if (rooms[roomId]) {
      callback(true);
    } else {
      callback(false);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    for (let roomId in rooms) {
      if (rooms[roomId].users[socket.id]) {
        rooms[roomId].users[socket.id].activity = false;
        console.log(Object.values(rooms[roomId].users));

        if (
          Object.values(rooms[roomId].users).filter((u) => u.activity)
            .length === 0
        ) {
          delete rooms[roomId];
        } else {
          updateUsers(roomId);
        }
      }
    }
    console.log(rooms);
  });
});

server.listen(3001, () => {
  console.log("Server listening on port 3001...");
});
