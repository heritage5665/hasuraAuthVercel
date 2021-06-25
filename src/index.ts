import pkg from "body-parser";
import express from "express";
import router from "./routes/user_route.js";
// import { verifyToken } from "./utils/validate-token.js";
import { AuthWebHook } from "./utils/web-hook-auth.js";
import sgMail from "@sendgrid/mail";


const { json } = pkg

const app = express();
app.use(json());
app.post("/web-auth", AuthWebHook)
app.use("/user", router);

// PORT
const PORT = process.env.PORT || 4000;
sgMail.setApiKey("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");

app.listen(PORT, () => {
  console.log(`Server Started at PORT ${PORT}`);
});
