
import { Response, NextFunction } from "express";
import { verifyUserAuthToken } from "../config/user.service.js";
// middleware to validate token
export const AuthWebHook = async (req: any, res: Response, next: NextFunction) => {
    const token = req.header("Authorization");
    if (!token)
        return res.status(401).json({
            error: "Access denied",
            msg: "Authoriztion token required"
        });
    await verifyUserAuthToken(token)
        .then(user => {
            const { user_id, user_type } = user
            // req.user = user
            return res.status(200).json({
                "X-Hasura-User-Id": user_id,
                "X-Hasura-Role": user_type,
                "X-Hasura-Is-Owner": "false",
                "Cache-Control": "max-age=600"
            })
        })
        .catch(error => res.status(400).json({ error }));
};
