import { app } from "../../../index.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { io as Client } from "socket.io-client";
import { createRoom, joinRoom } from "./helper.js";
import {
  rooms,
  getUsers,
  getRoom,
  getUserByName,
} from "../../../models/Room.js";
import { roomSocketHandlers } from "../../../sockets/roomSocket.js";

const BACKEND_URL = "http://localhost:5001";
let httpServer;
let io;

let clients = [];
const createClient = () => {
  const client = Client(BACKEND_URL);
  clients.push(client);
  return client;
};

beforeEach((done) => {
  httpServer = createServer(app);
  io = new Server(httpServer);
  roomSocketHandlers(io);
  httpServer.listen(5001, done);
});

afterEach((done) => {
  // Disconnect all test clients
  clients.forEach((client) => {
    if (client.connected) client.disconnect();
  });
  clients = [];

  // Reset in-memory data
  for (const key in rooms) {
    delete rooms[key];
  }

  io.close(); // Close the Socket.IO server
  httpServer.close(done); // Close the HTTP server
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

  it("should echo messages", (done) => {
    const socket = createClient();
    socket.on("connect", () => {
      socket.emit("echo", "Hello, Echo!");
      socket.once("echo", (msg) => {
        expect(msg).toBe("Hello, Echo!");
        socket.disconnect();
        done();
      });
    });
  });

  it("should create a room and join it", async () => {
    const socket = createClient();
    const { roomId } = await createRoom("testUser", socket);
    socket.on("connect", () => {
      socket.emit("user:join", {
        roomId,
        sessionToken: user.sessionToken,
        username: "testUser",
      });
      socket.once("user:joined", (data) => {
        expect(data.roomId).toBe(roomId);
        expect(data.username).toBe("testUser");
        const room = getRoom(roomId);
        const user = getUserByName("testUser", roomId);
        expect(user.name).toBe("testUser");
        expect(user.activity).toBe(true);
        expect(room.users.length).toBe(1);
        socket.disconnect();
      });
    });
  });

  it("should leave room and trigger user:left event", async () => {
    const client = createClient();
    const otherClient = createClient();

    const { roomId } = await createRoom("testUser");
    await joinRoom(roomId, "otherUser", "a");

    otherClient.on("connect", () => {
      otherClient.emit("user:join", {
        roomId,
        sessionToken: "a",
        username: "otherUser",
      });
      otherClient.on("user:left", (username) => {
        expect(username).toBe("testUser");
      });
    });

    expect(getUsers(roomId).length).toBe(2);

    client.on("connect", () => {
      client.emit("user:join", {
        roomId,
        sessionToken: "b",
        username: "testUser",
      });
      client.emit("user:leave", {
        roomId,
        sessionToken: "b",
      });
    });
  });
});
