import { Response, NextFunction } from "express";
// import DatauriParser from 'datauri/parser.js';
import { v2 as cloudinary } from "cloudinary";
import streamifier from 'streamifier'

const uploadPipe = (result: any, error: any) => {
    if (result) {
        Promise.resolve(result);
    } else {
        Promise.resolve(error)
    }
}
const uploadStream = (resource_type: any) => {
    if (resource_type == undefined) {
        return (req: any) => streamifier.createReadStream(req.file.buffer).pipe(cloudinary.uploader.upload_stream(uploadPipe))
    }
    return (req: any) => streamifier.createReadStream(req.file.buffer).pipe(cloudinary.uploader.upload_stream({ resource_type }, uploadPipe));
}
const upload_media = (media_type: any) => {
    if (!['image', 'video', 'audio', 'application'].includes(media_type)) {
        Promise.reject("unsupported media type")
    }

    if (media_type == 'image' || media_type == undefined) {
        return uploadStream("image")
    }
    if (media_type = "audio" || media_type == "video") {
        return uploadStream("video")
    }
    return uploadStream("raw")
}

export const UploadToCloudinary = async function (req: any, res: Response, next: NextFunction) {
    if (req.file == undefined) {
        return res.status(400).json({ "msg": "media is required", 'error': 'Bad Request' })
    }
    const mimetype: string = req.file.mimetype
    const is_image = mimetype.split("/")[0] == "image"
    const is_video_or_audio = mimetype.split("/")[0] == "audio" || mimetype.split("/")[0] == "video"
    return res.status(200).json({ mimetype, is_image, is_video_or_audio })
    let result
    try {
        // if (images_regex.exec(req.file.path)) {

        const media_type = mimetype.split("/")[0]
        const result = upload_media(media_type)(req)
        return res.status(201).json(result);

    } catch (error) {
        return res.status(400).json({ "error": "try again latter" })
    }

}

