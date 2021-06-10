import { json } from "body-parser";
import express from "express";
import router from "./routes/user.route";

const app = express();
app.use(json());
app.use("/user", router);

// this route is protected with token
// app.use("/api/dashboard", verifyToken, dashboardRoutes);

// PORT
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server Started at PORT ${PORT}`);
});
