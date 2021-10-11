var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// import DatauriParser from 'datauri/parser.js';
import { v2 as cloudinary } from "cloudinary";
import streamifier from 'streamifier';
import { errorMessage } from "../config/user.service.js";
const uploadStream = (req) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream((error, result) => {
            if (result) {
                resolve(result);
            }
            else {
                reject(error);
            }
        });
        const resource_type = req.file.mimetype.split("/")[0];
        if (!['image', 'video', 'audio', 'application'].includes(resource_type)) {
            reject("unsupported media type");
        }
        if (resource_type == undefined || resource_type == 'image') {
            streamifier.createReadStream(req.file.buffer).pipe(stream);
        }
        streamifier.createReadStream(req.file.buffer);
    });
};
export const UploadToCloudinary = function (req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (req.file == undefined) {
            return res.status(400).json({ "msg": "media is required", 'error': 'Bad Request' });
        }
        try {
            const result = yield uploadStream(req).catch(error => errorMessage({ msg: error, error }, res, 400));
            return res.status(201).json(result);
        }
        catch (error) {
            console.error(error);
            return res.status(400).json({ "error": "try again latter" });
        }
    });
};
