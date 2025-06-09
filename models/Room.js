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
  const user = new User(hostUsername, true);
  if (roomId) {
    rooms[roomId] = {
      users: [user],
    };
  }

  return { roomId, user };
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

export const joinRoom = (username, roomId, sessionToken = "") => {
  const existingUser = getUserByName(username, roomId);

  if (!existingUser) {
    console.log("new user! joining...");
    const user = new User(username);
    rooms[roomId].users.push(user);
    return { newUsername: username, newSessionToken: user.sessionToken };
  } else {
    if (existingUser.sessionToken === sessionToken) {
      console.log("rejoining...");
      activateUser(username, roomId);
      return {
        newUsername: username,
        newSessionToken: existingUser.sessionToken,
      };
    } else {
      console.log("changing username and joining...");
      const newUsername = generateUniqueUsername(username, roomId);
      const user = new User(newUsername);
      rooms[roomId].users.push(user);
      return { newUsername, newSessionToken: user.sessionToken };
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
