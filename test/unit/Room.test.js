import {
  activateUser,
  createRoom,
  generateUniqueRoomId,
  generateUniqueUsername,
  getRoom,
  getUserByName,
  getUsers,
  isRoomExist,
  joinRoom,
  setRooms,
} from "../../models/Room";
import { getRooms, rooms } from "../../models/Room.js";
import User from "../../models/User.js";

describe("Room Tests", () => {
  it("makes sure rooms is initialized", () => {
    expect(rooms).toBeTruthy();
  });
  beforeEach(() => {
    const newRooms = {
      ABCD: {
        users: [new User("jed"), new User("jed1", true), new User("jed3")],
      },
    };
    setRooms(newRooms);
  });

  it("returns all rooms", () => {
    expect(getRooms()).toBe(rooms);
  });

  it("returns room by id", () => {
    expect(getRoom("ABCD")).toBe(rooms["ABCD"]);
  });

  it("creates a room and returns an id and assigns the creator as host", () => {
    const id = createRoom("host");
    const room = getRoom(id);
    expect(room);
    expect(id.length).toEqual(4);
    expect(room.users.length).toBeGreaterThan(0);
    expect(getUserByName("host", id).host).toEqual(true);
  });

  it("gets a user by name from a room", () => {
    const user = getUserByName("jed", "ABCD");
    expect(user).toBeInstanceOf(User);
  });

  it("gets all users in a room", () => {
    expect(getUsers("ABCD")).toBeInstanceOf(Array);
  });

  it("sets a user's activity", () => {
    const user = getUserByName("jed", "ABCD");
    activateUser("jed", "ABCD");
    expect(user.activity).toBe(true);
    activateUser("jed", "ABCD", false);
    expect(user.activity).toBe(false);
  });

  it("makes a username unique in the room", () => {
    const uniqueUsername = generateUniqueUsername("jed", "ABCD");
    const names = getUsers("ABCD").map((u) => u.name);
    expect(names).not.toContain(uniqueUsername);
  });

  it("rejoins a user to the room", () => {
    const user = getUserByName("jed", "ABCD");
    expect(user.activity).toBe(false);
    joinRoom("jed", user.sessionToken, "ABCD");
    expect(user.activity).toBe(true);
  });

  it("joins a room with an already existing username", () => {
    const user = getUserByName("jed", "ABCD");
    const newUsername = joinRoom("jed", "other token", "ABCD");
    expect(newUsername).not.toBe(user.name);
    const newUser = getUserByName(newUsername, "ABCD");
    expect(newUser).toBeTruthy();
    expect(newUser).toBeInstanceOf(User);
  });

  it("generates unique room id", () => {
    const ids = [];
    for (let i = 0; i < 1000; i++) {
      const id = generateUniqueRoomId();
      expect(ids).not.toContain(id);
      rooms[id] = {};
      ids.push(id);
    }
  });

  it("tests if a room exists", () => {
    const exists = isRoomExist("ABCD");
    expect(exists).toBe(true);
    expect(isRoomExist("a")).toBe(false);
  });
});
