import { Response, NextFunction } from "express";
import { v2 as cloudinary } from "cloudinary";
import DatauriParser from 'datauri/parser.js';
import datauri from "datauri";

import path from 'path';

const getFileFromBuffer = (req: any) => new DatauriParser()
    .format(path.extname(req.file.originalname).toString(), req.file.buffer)





// middleware to validate token
export const UploadToCloudinary = async (req: any, res: Response, next: NextFunction) => {

    if (!req.file) {
        return res.status(400).json({ error: 'No files were uploaded.' });
    }
    const uploaded_file = getFileFromBuffer(req);
    const mimetype = uploaded_file.mimetype
    return mimetype;
    // const content = uploaded_file.content
    // if (!content) {
    //     return res.status(400).json({ error: 'No files were uploaded.' });
    // }
    // // console.log(file)
    // try {
    //     const res = await cloudinary.uploader.upload_large(content, {
    //         tags: 'convoy_uploads',
    //         resource_type: "auto",
    //         // public_id: "convoy/upload/others"
    //     })
    //     return res.status(201).json({ data: res })

    // } catch (err) {
    //     console.log(err)
    //     return res.status(200).json(err)
    // }




};
