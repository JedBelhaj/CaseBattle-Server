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
  getUserBySocketId,
  isSocketHost,
} = require("./roomsUtils");
const {
  getOrCreateBattleState,
  updateBattleSettings,
  openCase,
  startBattle,
  resetBattle,
} = require("./battleUtils");

// Mirrors CHAT_CONSTANTS.MAX_MESSAGE_LENGTH in the client's constants/chat.js.
const CHAT_MAX_MESSAGE_LENGTH = 200;

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
    socket.emit("battle_state", getOrCreateBattleState(roomId));
    updateUsers(io, roomId);
  });

  socket.on("join_room", ({ username, roomId }) => {
    if (roomExists(roomId)) {
      if (username) {
        socket.join(roomId);
        addUserToRoom(roomId, socket.id, username);
        console.log(`${username} joined ${roomId}`);

        updateUsers(io, roomId);
        socket.emit("room_found");
        socket.emit("battle_state", getOrCreateBattleState(roomId));
        console.log(rooms);
      }
    } else {
      socket.emit("error", "Room not found");
    }
  });

  socket.on("update_battle_settings", ({ roomId, caseIds }) => {
    if (!roomExists(roomId) || !isSocketHost(roomId, socket.id)) return;

    const battle = updateBattleSettings(roomId, caseIds);
    if (!battle) return;

    io.to(roomId).emit("battle_settings_updated", battle);
  });

  socket.on("start_battle", ({ roomId }) => {
    if (!roomExists(roomId) || !isSocketHost(roomId, socket.id)) return;

    const result = startBattle(io, roomId);
    if (!result.success) {
      socket.emit("error", result.reason);
    }
  });

  socket.on("reset_battle", ({ roomId }) => {
    if (!roomExists(roomId) || !isSocketHost(roomId, socket.id)) return;

    const result = resetBattle(io, roomId);
    if (!result.success) {
      socket.emit("error", result.reason);
    }
  });

  // Derives the acting username from the requesting socket itself (rather
  // than trusting a client-supplied username) so one player can't open
  // cases on another's behalf.
  socket.on("open_case", ({ roomId }) => {
    if (!roomExists(roomId)) return;

    const user = getUserBySocketId(roomId, socket.id);
    if (!user) return;

    const result = openCase(io, roomId, user.name);
    if (!result.success) {
      socket.emit("error", result.reason);
    }
  });

  // Pull-based resync: used on mount and whenever a socket (re)connects, so
  // a reconnect or a late joiner can reconstruct "what round are we on"
  // instead of relying solely on having caught a one-shot broadcast.
  socket.on("request_battle_state", ({ roomId }, callback) => {
    if (!roomExists(roomId)) {
      callback(null);
      return;
    }
    callback(getOrCreateBattleState(roomId));
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

  socket.on("in_room", ({ roomId, username }, callback) => {
    callback(isUserInRoom(roomId, username));
  });

  socket.on("chat_message", ({ roomId, text }) => {
    if (!roomExists(roomId) || typeof text !== "string") return;

    const trimmed = text.trim().slice(0, CHAT_MAX_MESSAGE_LENGTH);
    if (!trimmed) return;

    const sender = getUserBySocketId(roomId, socket.id);
    if (!sender || !sender.activity) return;

    io.to(roomId).emit("chat_message", {
      username: sender.name,
      text: trimmed,
      timestamp: Date.now(),
    });
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
          setTimeout(() => {
            const updatedActiveUsers = getActiveUsersInRoom(roomId);
            if (updatedActiveUsers.length === 0) {
              delete rooms[roomId];
              console.log(
                `Deleted room ${roomId} as it is still empty after delay`
              );
            } else {
              console.log(`Room ${roomId} is no longer empty after delay`);
            }
          }, 1000); // 1 second delay
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
