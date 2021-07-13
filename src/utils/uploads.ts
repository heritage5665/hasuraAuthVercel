import { Response, NextFunction } from "express";
import { v2 as cloudinary } from "cloudinary";
import DatauriParser from 'datauri/parser.js';

import path from 'path';

const getFileFromBuffer = (req: any): string => {
    const file = new DatauriParser().format(path.extname(req.file.originalname).toString(), req.file.buffer)?.base64
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
    const file = getFileFromBuffer(req);
    // console.log(file)
    try {
        const res = await cloudinary.uploader.upload_large(file, {
            tags: 'convoy_uploads',
            resource_type: "auto",
            // public_id: "convoy/upload/others"
        })
        return res.status(201).json({ data: res })

    } catch (err) {
        console.log(err)
        return res.status(200).json(err)
    }




};
