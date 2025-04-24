const {
  rooms,
  generateRoomId,
  roomExists,
  addUserToRoom,
  removeUserFromRoom,
  markUserInactive,
  getActiveUsersInRoom,
  updateUsers,
  isUserInRoom,
} = require("./roomsUtils");

const handleSocketEvents = (io, socket) => {
  socket.on("create_room", (username) => {
    let roomId;
    do {
      roomId = generateRoomId();
    } while (roomExists(roomId));

    addUserToRoom(roomId, socket.id, username);

    socket.join(roomId);
    console.log(`Room created: ${roomId} by host ${socket.id}`);

    socket.emit("room_created", roomId);
    updateUsers(io, roomId);
  });

  socket.on("join_room", ({ username, roomId }) => {
    if (roomExists(roomId)) {
      socket.join(roomId);
      addUserToRoom(roomId, socket.id, username);
      console.log(`${username} joined ${roomId}`);

      updateUsers(io, roomId);
      socket.emit("room_found");
      console.log(rooms);
    } else {
      socket.emit("error", "Room not found");
    }
  });

  socket.on("leave_room", (roomId, username) => {
    if (roomExists(roomId)) {
      markUserInactive(roomId, username);
      console.log(`User ${username} left room ${roomId}`);
      updateUsers(io, roomId);
    }
  });

  socket.on("room_exist", (roomId, callback) => {
    callback(roomExists(roomId));
  });

  socket.on("in_room", (roomId, username, callback) => {
    callback(isUserInRoom(roomId, username));
  });

  socket.on("req_update_users", (roomId) => {
    if (roomExists(roomId)) {
      updateUsers(io, roomId);
      console.log(`User ${socket.id} requested an update for room ${roomId}`);
    } else {
      socket.emit("error", "Room not found");
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    for (let roomId in rooms) {
      console.log(`Checking room: ${roomId}`);
      console.log("looking for :", socket.id);
      console.log("in :", Object.values(rooms[roomId]?.users || {}));

      const user = Object.values(rooms[roomId]?.users || {}).find(
        (u) => u.socketId === socket.id
      );
      if (user) {
        console.log(`Found user ${user.name} in room ${roomId}`);
        markUserInactive(roomId, user.name);
        console.log(`Marked user ${user.name} as inactive in room ${roomId}`);

        const activeUsers = getActiveUsersInRoom(roomId);
        console.log(`Active users in room ${roomId}:`, activeUsers);

        if (activeUsers.length === 0) {
          delete rooms[roomId];
          console.log(`Deleted room ${roomId} as it is empty`);
        } else {
          console.log(`Updating users in room ${roomId}`);
          updateUsers(io, roomId);
        }
      } else {
        console.log(`User ${socket.id} not found in room ${roomId}`);
      }
    }
  });
};

module.exports = { handleSocketEvents };
