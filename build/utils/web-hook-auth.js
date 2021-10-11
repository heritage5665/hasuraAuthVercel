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
export const AuthWebHook = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.header("Authorization");
    if (!token)
        return res.status(401).json({
            error: "Access denied",
            msg: "Authoriztion token required"
        });
    yield verifyUserAuthToken(token)
        .then(user => {
        const { user_id, user_type } = user;
        // req.user = user
        return res.status(200).json({
            "X-Hasura-User-Id": user_id,
            "X-Hasura-Role": user_type,
            "X-Hasura-Is-Owner": "false",
            "Cache-Control": "max-age=600"
        });
    })
        .catch(error => res.status(400).json({ error }));
});
