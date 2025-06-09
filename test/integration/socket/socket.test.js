// test/integration/socket/socket.test.js
import { server, app } from "../../../index.js"; // Adjust as needed
import { io as Client } from "socket.io-client";
import request from "supertest";

let httpServer;
let clientSocket;
let secondClient;

beforeAll((done) => {
  httpServer = server.listen(5001, () => {
    clientSocket = Client("http://localhost:5001");

    clientSocket.on("connect", () => {
      done();
    });
  });
});

afterAll((done) => {
  if (clientSocket.connected) clientSocket.disconnect();
  if (secondClient?.connected) secondClient.disconnect();
  httpServer.close(done);
});

describe("Room Socket Handlers", () => {
  it("should emit welcome on connect", (done) => {
    const socket = Client("http://localhost:5001");

    socket.on("connect", () => {
      socket.once("welcome", (msg) => {
        expect(msg).toBe("Hello client!");
        socket.disconnect();
        done();
      });
    });
  });

  it("should join a room and trigger userJoined to others", async () => {
    const res = await request(app)
      .post("/room/create")
      .send({ username: "socketTester" });

    const { roomId } = res.body;

    const promise = new Promise((resolve) => {
      secondClient = Client("http://localhost:5001");

      secondClient.on("connect", () => {
        secondClient.emit("join", roomId);

        clientSocket.on("userJoined", (id) => {
          expect(typeof id).toBe("string");
          resolve();
        });

        clientSocket.emit("join", roomId);
      });
    });

    await promise;
  });
});
