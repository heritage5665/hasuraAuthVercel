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


    const streamUpload = (req: any) => {
        return new Promise((resolve, reject) => {

            const images_regex = /(\.jpg|\.jpeg|\.png|\.gif)$/i
            let resource_type
            if (!images_regex.exec(req.file.path)) {
                resource_type = "video"
            }
            const upload_callback = (error: any, result: any) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
            let stream;
            if (resource_type == undefined) {
                stream = cloudinary.uploader.upload_stream(upload_callback)
            } else {
                stream = cloudinary.uploader.upload_chunked_stream({ "resource_type": resource_type }, upload_callback)
            }
            return streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
    };


    const result = await streamUpload(req)
        .catch(error => res.status(400).json(error))

    return res.status(201).json(result);


}

