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

const rooms = {}; // Store rooms with hosts and users

// Function to generate a 4-letter uppercase room ID
const generateRoomId = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let roomId = "";
  for (let i = 0; i < 4; i++) {
    roomId += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return roomId;
};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create Room (Assign Host)
  socket.on("create_room", (username) => {
    let roomId;
    do {
      roomId = generateRoomId();
    } while (rooms[roomId]); // Ensure unique ID

    rooms[roomId] = {
      host: socket.id,
      users: [{ id: socket.id, username }],
    };

    socket.join(roomId);
    console.log(`Room created: ${roomId} by host ${socket.id}`);

    // Notify the creator
    socket.emit("room_created", roomId);

    // Send updated user list to the room
    io.to(roomId).emit("update_users", rooms[roomId].users);
  });

  // Join Room
  socket.on("join_room", ({ username, roomId }) => {
    if (rooms[roomId]) {
      socket.join(roomId);
      rooms[roomId].users.push({ id: socket.id, username });

      // Notify all users in the room about the updated user list
      io.to(roomId).emit("update_users", rooms[roomId].users);
    } else {
      socket.emit("error", "Room not found");
    }
  });

  // User Leaves Room
  socket.on("leave_room", (roomId) => {
    socket.leave(roomId);

    if (rooms[roomId]) {
      // Remove user from the room
      rooms[roomId].users = rooms[roomId].users.filter(
        (user) => user.id !== socket.id
      );

      // If the room is empty, delete it
      if (rooms[roomId].users.length === 0) {
        delete rooms[roomId];
      } else {
        // Notify all users in the room about the updated user list
        io.to(roomId).emit("update_users", rooms[roomId].users);
      }
    }
  });

  // Handle Disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    // Remove user from all rooms
    for (let roomId in rooms) {
      rooms[roomId].users = rooms[roomId].users.filter(
        (user) => user.id !== socket.id
      );

      if (rooms[roomId].users.length === 0) {
        delete rooms[roomId];
      } else {
        io.to(roomId).emit("update_users", rooms[roomId].users);
      }
    }
  });
});

server.listen(3001, () => {
  console.log("Server listening on port 3001...");
});
