import { Response, NextFunction } from "express";
import DatauriParser from 'datauri/parser.js';

import { UploadHttpClient } from "../hasura/client.js";

import path from 'path';

const getFileFromBuffer = (req: any) => new DatauriParser()
    .format(path.extname(req.file.originalname).toString(), req.file.buffer)


const uploadMan = new UploadHttpClient();


// middleware to validate token
export const UploadToCloudinary = async (req: any, res: Response, next: NextFunction) => {

    if (!req.file) {
        return res.status(400).json({ error: 'No files were uploaded.' });
    }
    const mimetype = req.file.mimetype
    return mimetype
    // let result;
    // if (["audio/mp3", "audio/mp4", "video/3gp", "video/mp4"].includes(mimetype)) {
    //     result = await uploadMan.upload("video", req.file)
    // } else {
    //     result = await uploadMan.upload("image", req.file)
    // }
    // return res.status(201).json(result)

};
