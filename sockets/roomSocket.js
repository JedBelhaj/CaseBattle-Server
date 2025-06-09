import { getUserByName, isRoomExist, setUserSocket } from "../models/Room.js";

export function roomSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.emit("welcome", "Hello client!");

    socket.on("user:join", (roomId, sessionToken, username) => {
      if (!roomId || !sessionToken || !username) {
        return socket.emit("error", "Missing join parameters");
      }

      if (!isRoomExist(roomId)) {
        return socket.emit("error", "Room does not exist");
      }

      const user = getUserByName(username, roomId);
      if (!user) {
        return socket.emit("error", "User not found in room");
      }

      if (user.sessionToken !== sessionToken) {
        return socket.emit("error", "Session token mismatch");
      }

      const socketSet = setUserSocket(socket.id, sessionToken, roomId);
      if (!socketSet) {
        console.error(
          `Failed to set socket for user ${username} in room ${roomId}`
        );
        return;
      }

      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
      socket.to(roomId).emit("user:joined", user);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
}
