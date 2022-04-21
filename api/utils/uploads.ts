import { Response, NextFunction } from "express";
// import DatauriParser from 'datauri/parser.js';
import { v2 as cloudinary } from "cloudinary";
import streamifier from 'streamifier'
import { errorMessage } from "../config/user.service.js";

const uploadStream = (req: any) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
        );

        const resource_type = req.file.mimetype.split("/")[0]
        if (!['image', 'video', 'audio', 'application'].includes(resource_type)) {
            reject("unsupported media type")
        }
        if (resource_type == undefined || resource_type == 'image') {
            streamifier.createReadStream(req.file.buffer).pipe(stream);
        }
        streamifier.createReadStream(req.file.buffer)
    });
};


export const UploadToCloudinary = async function (req: any, res: Response, next: NextFunction) {
    if (req.file == undefined) {
        return res.status(400).json({ "msg": "media is required", 'error': 'Bad Request' })
    }
    try {
        const result = await uploadStream(req).catch(error => errorMessage({ msg: error, error }, res, 400))
        return res.status(201).json(result);
    } catch (error) {
        console.error(error)
        return res.status(400).json({ "error": "try again latter" })
    }

}

