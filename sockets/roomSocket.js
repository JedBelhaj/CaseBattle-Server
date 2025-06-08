export function roomSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
    socket.emit("welcome", "Hello client!");
    socket.on("join", (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
      socket.to(roomId).emit("userJoined", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
}
