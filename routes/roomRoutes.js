import express from "express";
import {
  handleGetRoom,
  handleCreateRoom,
  handleJoinRoom,
  handleDisconnect,
} from "../controllers/roomController.js";

const router = express.Router();

router.get("/get", (req, res) => handleGetRoom(req, res));
router.post("/create", (req, res) => handleCreateRoom(req, res));
router.post("/join", (req, res) => handleJoinRoom(req, res));
router.post("/disconnect", (req, res) => handleDisconnect(req, res));

export const roomRoutes = () => router;
