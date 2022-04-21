import pkg from "body-parser";
import multer from 'multer';
import express from "express";
import sgMail from "@sendgrid/mail";
import router from "../src/routes/user_route.js";
import price_router from "../src/routes/price_recommedation.js";
import { AuthWebHook } from "../src/utils/web-hook-auth.js";
import { verifyToken } from "../src/utils/validate-token.js";
import { UploadToCloudinary } from "../src/utils/uploads.js";
import { SENDGRID_KEY } from "../src/config/settings.js";
import { v2 as cloudinary } from "cloudinary";

const app = express();
const fileUpload = multer()
const PORT = process.env.PORT || 4000;

sgMail.setApiKey(SENDGRID_KEY);

cloudinary.config({
    cloud_name: 'techbird',
    api_key: "456833922673438",
    api_secret: "W-MU7sUefd_tk8PmUr3sFLSGYRw",
    // secure: true
});

app.use(pkg.json());
app.post("/web-auth", AuthWebHook)
app.use("/price_estimate", price_router);
app.post("/upload", fileUpload.single('media'), verifyToken, UploadToCloudinary)
app.use("/user", router);

app.listen(PORT, () => {
    console.log(`Server Started at PORT ${PORT}`);
});
