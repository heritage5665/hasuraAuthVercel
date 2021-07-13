
import DatauriParser from 'datauri/parser';
import path from 'path';

const dUri = new DatauriParser();


const getFileFromBuffer = (req: any): string => {
    const file = dUri.format(path.extname(req.file.originalname).toString(), req.file.buffer)?.content
    if (file == undefined) {
        throw new Error("no file given")
    }
    return file
};
export default getFileFromBuffer;