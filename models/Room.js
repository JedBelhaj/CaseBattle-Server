import User from "./User.js";

export let rooms = {};

export const setRooms = (newRooms) => {
  console.log("this is for testing purposes only");
  rooms = newRooms;
};

export const getRooms = () => {
  return rooms;
};

export const getRoom = (roomId) => {
  return rooms[roomId];
};

export const createRoom = (hostUsername) => {
  const roomId = generateUniqueRoomId();

  if (roomId) {
    rooms[roomId] = {
      users: [new User(hostUsername, true)],
    };
  }

  return roomId;
};

export const getUserByName = (username, roomId) => {
  const room = rooms[roomId];
  if (room) {
    const users = room.users;
    return users.find((user) => user.name === username);
  }
};

export const getUsers = (roomId) => {
  return rooms[roomId].users;
};

export const activateUser = (username, roomId, active = true) => {
  const users = getUsers(roomId);
  for (const user of users) {
    if (user.name === username) {
      user.activity = active;
      return true;
    }
  }
  return false;
};

export const generateUniqueUsername = (username, roomId) => {
  const users = getUsers(roomId);
  const alikeNames = users
    .map((user) => user.name)
    .filter((u) => u.startsWith(username));

  let i = 1;
  let newUsername = username + i;
  while (alikeNames.includes(newUsername)) {
    i++;
    newUsername = username + i;
  }

  return newUsername;
};

export const joinRoom = (username, sessionToken, roomId) => {
  const existingUser = getUserByName(username, roomId);
  if (!existingUser) {
    console.log("new user! joining...");
    rooms[roomId].users.push(new User(username));
  } else {
    if (existingUser.sessionToken === sessionToken) {
      console.log("rejoining...");
      activateUser(username, roomId);
    } else {
      console.log("changing username and joining...");

      const newUsername = generateUniqueUsername(username, roomId);
      rooms[roomId].users.push(new User(newUsername));
      return newUsername;
    }
  }
};

export const generateRoomId = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let roomId = "";
  for (let i = 0; i < 4; i++) {
    roomId += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return roomId;
};

export const generateUniqueRoomId = () => {
  let roomId;
  do {
    roomId = generateRoomId();
  } while (rooms[roomId]);
  return roomId;
};

export const isRoomExist = (roomId) => {
  return !!rooms[roomId];
};
