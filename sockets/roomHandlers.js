import { getUserByName, isRoomExist, setUserSocket } from "../models/Room.js";

export const handleUserJoin = (roomId, sessionToken, username, socket) => {
  const user = getUserByName(username, roomId);

  const socketSet = setUserSocket(socket.id, sessionToken, roomId);
  if (!socketSet) {
    console.error(
      `Failed to set socket for user ${username} in room ${roomId}`
    );
    return;
  }

  socket.join(roomId);
  console.log(`${username} with socket id ${socket.id} joined room ${roomId}`);
  socket.to(roomId).emit("user:joined", user);
};
