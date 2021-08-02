import { Response, NextFunction } from "express";
// import DatauriParser from 'datauri/parser.js';
import { v2 as cloudinary } from "cloudinary";
import streamifier from 'streamifier'

const uploadStream = (req: any) => {

    const mimetype: string = req.file.mimetype
    let type: string = mimetype.split("/")[0]
    let resource_type: string
    switch (type) {
        case 'image':
            resource_type = 'image'
        case 'audio':
        case 'video':
            resource_type = "video"
            break;
        default:
            resource_type = "raw"
    }

    return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream({ resource_type },
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

    try {
        // if (images_regex.exec(req.file.path)) {
        const result = await uploadStream(req).catch(error => res.status(400).json({ error }))
        return res.status(200).json({ "data": result })

    } catch (error) {
        console.error(error)
        res.status(500).json({ "msg": "error occured try again latter" })
    }

}