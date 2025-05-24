const express = require("express");
const cors = require("cors");

const PORT = 5000;

const app = express();
app.use(cors());

app.listen(PORT, () => {
  console.log(`Api Server Running on port ${PORT}`);
});
