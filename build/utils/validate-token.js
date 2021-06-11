var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { verifyUserAuthToken } from "../config/user.service.js";
// middleware to validate token
export const verifyToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.header("Authorization");
    if (!token) {
        return res.status(401).json({ error: "Access denied" });
    }
    try {
        const verified = verifyUserAuthToken(token);
        if (!verified) {
            return res.status(401).json({ error: "Access denied" });
        }
        req.user = verified;
        next();
    }
    catch (err) {
        res.status(400).json({ error: "Token is not valid" });
    }
});
