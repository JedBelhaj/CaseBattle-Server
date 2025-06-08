import request from "supertest";
import { app } from "../../index.js";
import User from "../../models/User.js";
import { getUserByName, setRooms } from "../../models/Room.js";

describe("GET /", () => {
  it("should return ok", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toEqual(200);
  });
});

describe("Room Creation / Joining", () => {
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
    const { roomId } = res.body;
    expect(roomId).toBeTruthy();
    expect(roomId).toHaveLength(4);
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
    expect(res.statusCode).toEqual(200);
    const { newUsername } = res.body;
    expect(newUsername).toBeFalsy();
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
