import { Response, NextFunction } from "express";
// import DatauriParser from 'datauri/parser.js';

import { UploadHttpClient } from "../hasura/client.js";
import { v2 as cloudinary } from "cloudinary";
import streamifier from 'streamifier'
// middleware to validate token
// export const UploadToCloudinary = async (req: any, res: Response, next: NextFunction) => {


//     if (!req.file) {
//         return res.status(400).json({ error: 'No files were uploaded.' });
//     }
//     let type = "image"
//     if (["audio/mp3", "audio/mp4", "video/3gp", "video/mp4"].includes(req.file.mimetype)) {
//         type = "video"
//     }

//     const uploadMan = new UploadHttpClient();
//     return res.status(201).json(await uploadMan.upload(type, req.file))

// };

export const UploadToCloudinary = async function (req: any, res: Response, next: NextFunction) {
    if (req.file == undefined) {
        return res.status(400).json({ "msg": "media is required", 'error': 'Bad Request' })
    }

    const upload_callback = (error: any, result: any) => {
        if (result) {
            Promise.resolve(result);
        } else {
            Promise.reject(error);
        }
    }
    const streamUpload = async (req: any) => {

        const images_regex = /(\.jpg|\.jpeg|\.png|\.gif)$/i
        let stream
        if (!images_regex.exec(req.file.path)) {
            const resource_type = "video"
            stream = cloudinary.uploader.upload_stream({ "resource_type": resource_type }, upload_callback)

        } else {

            stream = cloudinary.uploader.upload_stream(upload_callback)
        }

        return streamifier.createReadStream(req.file.buffer).pipe(stream);

    };

    async function upload(req: any) {
        return await streamUpload(req);
    }

    const result = await upload(req)
        .catch(error => res.status(400).json(error))

    return res.status(201).json(result);


}

