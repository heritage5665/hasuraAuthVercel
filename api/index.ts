import pkg from "body-parser";
import express from "express";
import router from "./routes/user_route";
import price_router from "./routes/price_recommedation";
import multer from 'multer';
import { AuthWebHook } from "./utils/web-hook-auth";
import sgMail from "@sendgrid/mail";
import { verifyToken } from "./utils/validate-token";
import { UploadToCloudinary } from "./utils/uploads";
import { SENDGRID_KEY } from "./config/settings";
import { v2 as cloudinary } from "cloudinary";

const app = express();
const fileUpload = multer()
// const PORT = process.env.PORT || 4000;

sgMail.setApiKey(SENDGRID_KEY??'');

cloudinary.config({
  cloud_name: 'techbird',
  api_key: "456833922673438",
  api_secret: "W-MU7sUefd_tk8PmUr3sFLSGYRw",
  // secure: true
});

app.use(pkg.json());

const { v4 } = require('uuid');

app.get('/api', (req, res) => {
  const path = `/api/item/${v4()}`;
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 's-max-age=1, stale-while-revalidate');
  res.end(`Hello! Go to item: <a href="${path}">${path}</a>`);
});

app.get('/api/api/item/:slug', (req, res) => {
  const { slug } = req.params;
  res.end(`Item: ${slug}`);
});

app.post("/api/web-auth", AuthWebHook)
app.use("/api/price_estimate", price_router);
app.post("/api/upload", fileUpload.single('media'), verifyToken, UploadToCloudinary)
app.use("/api/user", router);

// app.listen(PORT, () => {
//   console.log(`Server Started at PORT ${PORT}`);
// });


module.exports = app;