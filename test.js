import {
  activateUser,
  generateUniqueUsername,
  getRoom,
  getUserByName,
  getUsers,
  joinRoom,
  rooms,
} from "./utils/roomsUtils.js";
import User from "./models/User.js";

const user = getUserByName("jed", "ABCD");
joinRoom("jed", user.sessionToken, "ABCD");
const users = getUsers("ABCD");
console.log(users);
