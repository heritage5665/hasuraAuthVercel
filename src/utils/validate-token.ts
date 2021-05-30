import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
// middleware to validate token
const verifyToken = (req: any, res: Response, next: NextFunction) => {
  const token = req.header("auth-token");
  if (!token) {
    return res.status(401).json({ error: "Access denied" });
  } else {
    try {
      const verified = jwt.verify(token, "randomString");
      req.user = verified;
      next();
    } catch (err) {
      res.status(400).json({ error: "Token is not valid" });
    }
  }
};
module.exports = verifyToken;
