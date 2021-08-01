import { Response, NextFunction } from "express";
// import DatauriParser from 'datauri/parser.js';
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
const upload_image = (req: any) => {
    return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
            (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);
    });
};
const upload_video = (req: any) => {
    return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream({ "resource_type": "video" },
            (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);
    });
};

export const UploadToCloudinary = async function (req: any, res: Response, next: NextFunction) {
    if (req.file == undefined) {
        return res.status(400).json({ "msg": "media is required", 'error': 'Bad Request' })
    }
    const mimetype: string = req.file.mimetype
    const is_image = mimetype.split("/")[0] == "image"
    const is_video_or_audio = mimetype.split("/")[0] == "audio" || mimetype.split("/")[0] == "video"
    console.log(mimetype)
    let result
    try {
        // if (images_regex.exec(req.file.path)) {

        if (is_image) {
            result = await upload_image(req).catch(error => res.status(400).json(error))
        }
        if (is_video_or_audio) {
            result = await upload_video(req).catch(error => res.status(400).json(error))
        } else {
            return res.status(400).json({ "msg": "invalid image, audio or video given", 'error': 'Bad Request' })
        }

        return res.status(201).json(result);

    } catch (error) {
        return res.status(400).json({ "error": "try again latter" })
    }

}

