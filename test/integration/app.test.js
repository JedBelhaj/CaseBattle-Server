import request from "supertest";
import { app } from "../../index.js";
import User from "../../models/User.js";
import { getUserByName, setRooms } from "../../models/Room.js";
import { server } from "../../index.js";
import { io as Client } from "socket.io-client";

let socket;
const PORT = 5001;
const SOCKET_URL = `http://localhost:${PORT}`;

beforeAll((done) => {
  server.listen(5001, () => {
    console.log("Test server listening");
    done();
  });
});

afterAll((done) => {
  if (socket?.connected) {
    socket.disconnect();
  }
  server.close(done);
});

describe("test if http server and socketio server are working", () => {
  it("should return ok", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toEqual(200);
  });

  it("checks if the server is running", () => {
    expect(server.listening).toBe(true);
  });

  test("should receive welcome message on connect", (done) => {
    socket = Client(SOCKET_URL, {
      transports: ["websocket"], // FORCE websocket to avoid polling bugs and delays
      reconnection: false,
    });

    socket.on("connect", () => {
      console.log("Connected!");
    });

    socket.on("connect_error", (err) => {
      console.error("Connection failed:", err.message);
      done(err); // Fail the test
    });

    socket.on("welcome", (msg) => {
      try {
        expect(msg).toBe("Hello client!");
        done();
      } catch (error) {
        done(error);
      }
    });
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

describe("Room host handling, and deletion", () => {
  beforeEach(() => {
    const newRooms = {
      ABCD: {
        users: [new User("jed"), new User("jed1", true), new User("jed3")],
      },
    };
    setRooms(newRooms);
  });

  it("should assign a new host after the current host disconnects for 10 seconds", () => {
    // simulate disconnect and time passage
  });

  it("should delete the room when no user is active for 10 seconds", () => {
    // simulate inactivity and time passage
  });

  it("should not assign a new host if the host reconnects within 10 seconds", () => {
    // simulate short disconnect, then reconnect
  });

  it("should not delete a room if at least one user remains active", () => {
    // simulate other users staying active
  });

  it("should keep the same host if they remain active", () => {
    // verify host remains unchanged with normal activity
  });

  it("should not assign host if no other user is available", () => {
    // simulate a room with only a disconnected host
  });
});

describe("Room management (host actions)", () => {
  it.todo("should assign a new host when the old host requests it");
});
