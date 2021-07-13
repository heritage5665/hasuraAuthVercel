import { Response, NextFunction } from "express";
import { v2 as cloudinary } from "cloudinary";
import DatauriParser from 'datauri/parser.js';
import path from 'path';

const getFileFromBuffer = (req: any): string => {
    const file = new DatauriParser().format(path.extname(req.file.originalname).toString(), req.file.buffer)?.content
    if (file == undefined) {
        throw new Error("no file given")
    }
    return file
};



// middleware to validate token
export const UploadToCloudinary = async (req: any, res: Response, next: NextFunction) => {

    if (!req.file) {
        return res.status(400).json({ error: 'No files were uploaded.' });
    }

    const file_mimetype = req.file.mimetype
    const file = req.file.originalname;
    // console.log(file)


    try {
        if (["image/jpeg", "image/png", "image/gif", "image/avif"].includes(file_mimetype)) {
            const res = await cloudinary.uploader.upload(file, {
                tags: 'convoy_uploads',
                resource_type: "image",
                // public_id: "convoy/auth/images/"
            })
        }
        if (["audio/mp4", "audio/mp3", "video/3gp", "video/mp4", "video/quicktime"].includes(file_mimetype)) {
            const res = await cloudinary.uploader.upload_large(file, {
                tags: 'convoy_uploads',
                resource_type: "video",
                // public_id: "convoy/uploads/videos/"
            })
        }

        const res = await cloudinary.uploader.upload(file, {
            tags: 'convoy_uploads',
            resource_type: "image",
            public_id: "convoy/upload/others"
        })

        return res.status(201).json({ data: res })

    } catch (err) {
        console.log(err)
        return res.status(200).json(err)
    }




};
