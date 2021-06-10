
import { Response, NextFunction } from "express";
import { verifyUserAuthToken } from "../config/user.service";
// middleware to validate token
export const verifyToken = async (req: any, res: Response, next: NextFunction) => {
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
  } catch (err) {
    res.status(400).json({ error: "Token is not valid" });
  }

};
