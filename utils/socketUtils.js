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
  /**
   * Handle the "create_room" event.
   * Creates a new room and adds the user as the host.
   */
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

  /**
   * Handle the "join_room" event.
   * Adds a user to an existing room.
   */
  socket.on("join_room", ({ username, roomId }) => {
    if (roomExists(roomId)) {
      socket.join(roomId);
      addUserToRoom(roomId, socket.id, username);
      console.log(`${username} joined ${roomId}`);

      updateUsers(io, roomId);
      socket.emit("room_found");
    } else {
      socket.emit("error", "Room not found");
    }
  });

  /**
   * Handle the "leave_room" event.
   * Removes a user from a room.
   */
  socket.on("leave_room", (roomId) => {
    if (roomExists(roomId)) {
      removeUserFromRoom(roomId, socket.id);
      console.log(`User ${socket.id} left room ${roomId}`);
      updateUsers(io, roomId);
    }
  });

  /**
   * Handle the "room_exist" event.
   * Checks if a room exists and sends the result to the client.
   */
  socket.on("room_exist", (roomId, callback) => {
    callback(roomExists(roomId));
  });

  socket.on("in_room", (roomId, username) => {
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
  /**
   * Handle the "disconnect" event.
   * Cleans up the user's data when they disconnect.
   */
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
