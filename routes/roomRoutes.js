const express = require("express");
const router = express.Router();
const roomsUtils = require("../utils/roomsUtils");

router.post("/create", (req, res) => {
  const username = req.body.username;
  const roomId = roomsUtils.createRoom(username);
  res.json({ roomId });
});

module.exports = router;
