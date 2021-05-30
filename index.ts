import { json } from "body-parser";
import express from "express";
const InitiateMongoServer = require("./src/config/db");
const user = require("./src/routes/user.route");

InitiateMongoServer();

const app = express();
app.use(json());
app.use("/user", user);

// this route is protected with token
// app.use("/api/dashboard", verifyToken, dashboardRoutes);

// PORT
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server Started at PORT ${PORT}`);
});
