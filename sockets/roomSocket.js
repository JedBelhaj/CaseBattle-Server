import { handleUserJoin } from "./roomHandlers.js";

export function roomSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.emit("welcome", "Hello client!");

    socket.on("echo", (msg) => {
      console.log("Echo message received:", msg);
      socket.emit("echo", msg);
    });

    socket.on("user:join", (roomId, sessionToken, username) => {
      const user = getUserByName(username, roomId);

      const socketSet = setUserSocket(socket.id, sessionToken, roomId);
      if (!socketSet) {
        console.error(
          `Failed to set socket for user ${username} in room ${roomId}`
        );
        return;
      }

      socket.join(roomId);
      console.log(
        `${username} with socket id ${socket.id} joined room ${roomId}`
      );
      socket.to(roomId).emit("user:joined", user);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
}
