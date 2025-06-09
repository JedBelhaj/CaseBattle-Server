import request from "supertest";
import { app } from "../../../index.js";
import User from "../../../models/User.js";
import {
  activateUser,
  getHost,
  getRoom,
  getUserByName,
  getUsers,
  setRooms,
} from "../../../models/Room.js";
import { jest } from "@jest/globals";

describe("test if http server and socketio server are working", () => {
  it("should return ok", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toEqual(200);
  });
});

describe("Room Creation / Joining / Disconnection", () => {
  beforeEach(() => {
    const newRooms = {
      ABCD: {
        users: [new User("jed"), new User("jed1", true), new User("jed3")],
      },
    };
    setRooms(newRooms);
  });

  it("should create a room and get the id of the room", async () => {
    const res = await request(app)
      .post("/room/create")
      .send({ username: "testuser" });

    expect(res.statusCode).toEqual(200);
    const { roomId, user } = res.body;
    expect(roomId).toBeTruthy();
    expect(roomId).toHaveLength(4);
    expect(user).toBeTruthy();
  });

  it("should refuse to create a room without a username", async () => {
    const res = await request(app).post("/room/create");
    expect(res.statusCode).toEqual(400);
  });

  it("should join a room", async () => {
    const res = await request(app).post("/room/join").send({
      roomId: "ABCD",
      username: "newUser",
      sessionToken: "token",
    });
    console.log(res.error);

    expect(res.statusCode).toEqual(200);

    const { newUsername, sessionToken } = res.body;
    expect(newUsername).toBe("newUser");
    expect(sessionToken).toBeTruthy();
  });

  it("should join a room and return a new username", async () => {
    const username = "jed";
    const res = await request(app).post("/room/join").send({
      roomId: "ABCD",
      username: username,
      sessionToken: "token",
    });
    expect(res.statusCode).toEqual(200);
    const { newUsername } = res.body;
    expect(newUsername).toBeTruthy();
    expect(newUsername).toContain(username);
  });

  it("should reconnect a user", async () => {
    const user = getUserByName("jed", "ABCD");
    expect(user.activity).toBe(false);
    const res = await request(app).post("/room/join").send({
      roomId: "ABCD",
      username: user.name,
      sessionToken: user.sessionToken,
    });

    expect(user.activity).toBe(true);
  });

  it("should disconnect a user", async () => {
    const user = getUserByName("jed", "ABCD");
    await request(app).post("/room/join").send({
      roomId: "ABCD",
      username: user.name,
      sessionToken: user.sessionToken,
    });
    expect(user.activity).toBe(true);

    const res = await request(app).post("/room/disconnect").send({
      roomId: "ABCD",
      username: user.name,
      sessionToken: user.sessionToken,
    });
    expect(res.statusCode).toBe(200);
    expect(user.activity).toBe(false);
  });

  it("should refuse to disconnect a user if session token is not valid", async () => {
    const user = getUserByName("jed", "ABCD");
    await request(app).post("/room/join").send({
      roomId: "ABCD",
      username: user.name,
      sessionToken: user.sessionToken,
    });

    expect(user.activity).toBe(true);

    const res = await request(app).post("/room/disconnect").send({
      roomId: "ABCD",
      username: user.name,
      sessionToken: "invalide token",
    });

    expect(res.statusCode).toBe(401);
    expect(user.activity).toBe(true);
  });
});

describe("Room host handling, and deletion", () => {
  beforeEach(() => {
    const newRooms = {
      ABCD: {
        users: [new User("jed"), new User("jed1", true), new User("jed3")],
      },
    };
    newRooms["ABCD"].users.forEach((u) => {
      if (!u.host) {
        u.activity = true;
      }
    });
    setRooms(newRooms);
  });

  it("should assign a new host after the current host disconnects for 10 seconds", async () => {
    jest.useFakeTimers();

    const oldHost = getHost("ABCD");
    const users = getUsers("ABCD");

    await request(app).post("/room/disconnect").send({
      roomId: "ABCD",
      username: oldHost.name,
      sessionToken: oldHost.sessionToken,
    });

    expect(oldHost).toBeTruthy();
    expect(oldHost.activity).toBe(false);
    jest.advanceTimersByTime(10000);

    const host = getHost("ABCD");

    expect(users).toBeTruthy();
    expect(host).toBeTruthy();

    expect(oldHost).not.toBe(host);
    expect(users).toContain(host);
    expect(host.activity).toBe(true);
  });

  it("should not assign a new host if the host reconnects within 10 seconds", () => {
    jest.useFakeTimers();

    const oldHost = getHost("ABCD");

    // simulate host disconnect
    activateUser(oldHost.name, "ABCD", false);
    expect(oldHost.activity).toBe(false);

    // simulate host reconnecting within 10 seconds
    jest.advanceTimersByTime(5000);
    activateUser(oldHost.name, "ABCD", true);
    jest.advanceTimersByTime(5000);

    // verify that the host remains unchanged
    const host = getHost("ABCD");
    expect(host).toBe(oldHost);
  });

  it("should delete the room when no user is active for 10 seconds", async () => {
    jest.useFakeTimers();

    const users = getUsers("ABCD");
    users.forEach((u) => activateUser(u.name, "ABCD"));
    for (const u of users) {
      await request(app).post("/room/disconnect").send({
        roomId: "ABCD",
        username: u.name,
        sessionToken: u.sessionToken,
      });
    }

    // simulate no user activity
    jest.advanceTimersByTime(10000);

    const room = getRoom("ABCD");
    expect(room).toBeUndefined();
  });

  it("should not delete a room if a user reconnects", () => {
    jest.useFakeTimers();

    const users = getUsers("ABCD");
    users.forEach((u) => activateUser(u.name, "ABCD", false));

    // simulate one user reconnecting
    activateUser(users[0].name, "ABCD", true);

    // advance time
    jest.advanceTimersByTime(10000);

    const room = getUsers("ABCD");
    expect(room).toBeTruthy();
  });

  it("should not delete a room if at least one user remains active", () => {
    jest.useFakeTimers();

    const users = getUsers("ABCD");
    users.forEach((u) => activateUser(u.name, "ABCD", false));

    // simulate one user remaining active
    activateUser(users[0].name, "ABCD", true);

    // advance time
    jest.advanceTimersByTime(10000);

    const room = getUsers("ABCD");
    expect(room).toBeTruthy();
  });
});

describe("Room management (host actions)", () => {
  it.todo("should assign a new host when the old host requests it");
});
