const User = require("../models/User");

// Centralized rooms data structure
const rooms = {};

/**
 * Generate a unique room ID.
 * @returns {string} - A 4-character room ID.
 */
const generateRoomId = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let roomId = "";
  for (let i = 0; i < 4; i++) {
    roomId += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return roomId;
};

/**
 * Check if a room exists.
 * @param {string} roomId - The ID of the room.
 * @returns {boolean} - True if the room exists, false otherwise.
 */
const roomExists = (roomId) => {
  return rooms[roomId] !== undefined;
};

/**
 * Add a user to a room.
 * @param {string} roomId - The ID of the room.
 * @param {string} socketId - The socket ID of the user.
 * @param {string} username - The username of the user.
 */
const addUserToRoom = (roomId, socketId, username) => {
  if (!rooms[roomId]) {
    rooms[roomId] = { host: username, users: {} };
  }
  if (!rooms[roomId].users[username]) {
    rooms[roomId].users[username] = new User(username, socketId);
  } else {
    markUserActive(roomId, username);
  }
};

/**
 * Remove a user from a room.
 * @param {string} roomId - The ID of the room.
 * @param {string} socketId - The socket ID of the user.
 */
const removeUserFromRoom = (roomId, username) => {
  if (rooms[roomId]?.users[username]) {
    delete rooms[roomId].users[username];
    if (Object.keys(rooms[roomId].users).length === 0) {
      delete rooms[roomId]; // Delete the room if it's empty
    }
  }
};

/**
 * Mark a user as inactive in a room.
 * @param {string} roomId - The ID of the room.
 * @param {string} socketId - The socket ID of the user.
 */
const markUserInactive = (roomId, username) => {
  if (rooms[roomId]?.users[username]) {
    rooms[roomId].users[username].activity = false;
  }
};

const markUserActive = (roomId, username) => {
  if (rooms[roomId]?.users[username]) {
    rooms[roomId].users[username].activity = true;
  }
};

/**
 * Get all active users in a room.
 * @param {string} roomId - The ID of the room.
 * @returns {array} - An array of active users in the room.
 */
const getActiveUsersInRoom = (roomId) => {
  if (!rooms[roomId]) return [];
  return Object.values(rooms[roomId].users).filter((user) => user.activity);
};

/**
 * Update all users in a room.
 * @param {object} io - The Socket.IO instance.
 * @param {string} roomId - The ID of the room.
 */
const updateUsers = (io, roomId) => {
  if (rooms[roomId]) {
    if (!isHostOnline(roomId)) {
      console.log("changing hosts...");
      setTimeout(() => {
        assignNewHost(roomId);
        console.log(rooms);
        io.to(roomId).emit(
          "update_users",
          Object.values(rooms[roomId].users).map((u) => {
            if (u.name === rooms[roomId].host) {
              u.host = true;
            } else {
              u.host = false;
            }
            return u;
          })
        );
      }, 1000);
    } else {
      io.to(roomId).emit(
        "update_users",
        Object.values(rooms[roomId].users).map((u) => {
          if (u.name === rooms[roomId].host) {
            u.host = true;
          } else {
            u.host = false;
          }
          return u;
        })
      );
    }
  }
};

const isHostOnline = (roomId) => {
  const host = rooms[roomId]?.host;
  return host ? rooms[roomId].users[host]?.activity === true : false;
};

const assignNewHost = (roomId) => {
  if (rooms[roomId] && Object.keys(rooms[roomId].users).length > 0) {
    const activeUsers = getActiveUsersInRoom(roomId);
    console.log("active users : ", activeUsers);
    rooms[roomId].host = activeUsers[0]?.name;
  }
};

const isUserInRoom = (roomId, username) => {
  return rooms[roomId]?.users[username] !== undefined;
};

module.exports = {
  rooms,
  generateRoomId,
  roomExists,
  addUserToRoom,
  removeUserFromRoom,
  markUserInactive,
  getActiveUsersInRoom,
  updateUsers,
  isUserInRoom,
};
