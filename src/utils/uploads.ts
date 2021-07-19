import { Response, NextFunction } from "express";
// import DatauriParser from 'datauri/parser.js';

import { UploadHttpClient } from "../hasura/client.js";

// import path from 'path';

// const getFileFromBuffer = (req: any) => new DatauriParser()
//     .format(path.extname(req.file.originalname).toString(), req.file.buffer)


// middleware to validate token
export const UploadToCloudinary = async (req: any, res: Response, next: NextFunction) => {


    if (!req.file) {
        return res.status(400).json({ error: 'No files were uploaded.' });
    }
    let type = "image"
    if (["audio/mp3", "audio/mp4", "video/3gp", "video/mp4"].includes(req.file.mimetype)) {
        type = "video"
    }

    const uploadMan = new UploadHttpClient();
    return res.status(201).json(await uploadMan.upload(type, req.file))

};
