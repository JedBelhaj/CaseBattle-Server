import request from "supertest";
import { app } from "../../../index.js";

export const createRoom = async (username) => {
  const res = await request(app).post("/room/create").send({ username });
  const { roomId, user } = res.body;

  return { roomId };
};

export const joinRoom = async (roomId, username, sessionToken) => {
  const res = await request(app)
    .post("/room/join")
    .send({ roomId, username, sessionToken });
  const { newUsername, newSessionToken } = res.body;

  return { newUsername, newSessionToken };
};
