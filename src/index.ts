import pkg from "body-parser";
import express from "express";
import router from "./routes/user_route.js";
import price_router from "./routes/price_recommedation.js";
import multer from 'multer';
import { AuthWebHook } from "./utils/web-hook-auth.js";
import sgMail from "@sendgrid/mail";
import { verifyToken } from "./utils/validate-token.js";
import { UploadToCloudinary } from "./utils/uploads.js";
import { SENDGRID_KEY } from "./config/settings.js";
const { json } = pkg
import { v2 as cloudinary } from "cloudinary";

const app = express();
app.use(json());


app.post("/web-auth", AuthWebHook)
app.use("price", price_router);
const storage = multer.memoryStorage();
app.post("/upload", multer({ storage }).single('media'), verifyToken, UploadToCloudinary)
app.use("/user", router);

// PORT
const PORT = process.env.PORT || 4000;
sgMail.setApiKey(SENDGRID_KEY);
cloudinary.config({
  cloud_name: 'techbird',
  api_key: "456833922673438",
  api_secret: "W-MU7sUefd_tk8PmUr3sFLSGYRw",
  // secure: true
});


app.listen(PORT, () => {
  console.log(`Server Started at PORT ${PORT}`);
});
