import express from "express";
import cors from "cors";
import { getRoom, joinRoom } from "./models/Room.js";
import { roomRoutes } from "./routes/roomRoutes.js";

const PORT = 5000;

export const app = express();

// middleware
app.use(cors());
app.use(express.json());

app.use("/room", roomRoutes());

app.get("/", (req, res) => {
  res.status(200).send("ok");
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Api Server Running on port ${PORT}`);
  });
}
