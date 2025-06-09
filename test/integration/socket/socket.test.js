// test/integration/socket/socket.test.js
import { server, app } from "../../../index.js";
import { io as Client } from "socket.io-client";
import request from "supertest";

const BACKEND_URL = "http://localhost:5001";
let httpServer;

const createClient = () => Client(BACKEND_URL);

beforeAll((done) => {
  httpServer = server.listen(5001, () => {
    done();
  });
});

afterAll((done) => {
  httpServer.close(done);
});

describe("Room Socket Handlers", () => {
  it("should emit welcome on connect", (done) => {
    const socket = createClient();
    socket.on("connect", () => {
      socket.once("welcome", (msg) => {
        expect(msg).toBe("Hello client!");
        socket.disconnect();
        done();
      });
    });
  });

  it("should join a room and trigger user:joined to others", async () => {
    const res = await request(app)
      .post("/room/create")
      .send({ username: "socketTester" });

    const { roomId, user } = res.body;

    const socketA = createClient();
    const socketB = createClient();

    await new Promise((resolve, reject) => {
      socketA.on("connect", () => {
        socketA.emit("user:join", roomId, user.sessionToken, user.name);

        socketB.on("connect", () => {
          socketA.once("user:joined", (joinedUser) => {
            try {
              expect(joinedUser.name).toBe("socketTester");
              expect(joinedUser.sessionToken).toBe(user.sessionToken);
              expect(joinedUser.socketId).toBe(socketB.id);
              expect(joinedUser.activity).toBe(true);
              resolve();
            } catch (err) {
              reject(err);
            } finally {
              socketA.disconnect();
              socketB.disconnect();
            }
          });

          socketB.emit("user:join", roomId, user.sessionToken, user.name);
        });
      });
    });
  });

  it.todo("should leave room and trigger user:left event");
});
