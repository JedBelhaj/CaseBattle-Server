import request from "supertest";
import { app } from "../../index.js";
import User from "../../models/User.js";
import { setRooms } from "../../models/Room.js";

describe("GET /", () => {
  it("should return ok", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toEqual(200);
  });
});

describe("Room Endpoints", () => {
  beforeEach(() => {
    const newRooms = {
      ABCD: {
        users: [new User("jed"), new User("jed1"), new User("jed3")],
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
  });
});
