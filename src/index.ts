import pkg from "body-parser";
import express from "express";
import router from "./routes/user_route.js";
import { AuthWebHook } from "./utils/web-hook-auth.js";
import sgMail from "@sendgrid/mail";
import { verifyToken } from "./utils/validate-token.js";
import { UploadToCloudinary } from "./utils/uploads.js";
import fileUpload from "express-fileupload";
const { json } = pkg
import { v2 as cloudinary } from "cloudinary";
const app = express();
app.use(json());
app.use(fileUpload())
app.post("/web-auth", AuthWebHook)
app.post("/upload", verifyToken, UploadToCloudinary)
app.use("/user", router);

// PORT
const PORT = process.env.PORT || 4000;
sgMail.setApiKey("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");
cloudinary.config({
  cloud_name: 'techbird',
  api_key: "456833922673438",
  api_secret: "W-MU7sUefd_tk8PmUr3sFLSGYRw",
  // secure: true
});


app.listen(PORT, () => {
  console.log(`Server Started at PORT ${PORT}`);
});
