import { Response, NextFunction } from "express";
import { v2 as cloudinary } from "cloudinary";


// middleware to validate token
export const UploadToCloudinary = async (req: any, res: Response, next: NextFunction) => {

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    const file = req.files.media
    const image_mimes = ["image/jpeg", "image/png", "image/gif", "image/avif"]
    const audio_or_video_mime_types = ["audio/mp4", "audio/mp3", "video/3gp", "video/mp4", "video/quicktime"]
    try {
        if (image_mimes.includes(file.mimitype)) {
            return await cloudinary.uploader.upload(file.name, {
                tags: 'convoy_uploads',
                resource_type: "image",
                public_id: "convoy/auth/images/"
            })
        }
        if (audio_or_video_mime_types.includes(file.mimetype)) {
            return await cloudinary.uploader.upload_large(file.name, {
                tags: 'convoy_uploads',
                resource_type: "video",
                public_id: "convoy/uploads/videos/"
            })
        }
        return await cloudinary.uploader.upload(file.name, {
            tags: 'convoy_uploads',
            resource_type: "image",
            public_id: "convoy/upload/others"
        })

    } catch (err) {
        console.log(err)
        return res.status(200).json(err)
    }




};
