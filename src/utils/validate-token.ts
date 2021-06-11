
import { Response, NextFunction } from "express";
import { verifyUserAuthToken } from "../config/user.service.js";
// middleware to validate token
export const verifyToken = async (req: any, res: Response, next: NextFunction) => {
  const token = req.header("Authorization");
  if (!token) {
    return res.status(401).json({
      error: "Access denied",
      msg: "Authoriztion token required"
    });
  }
  try {
    await verifyUserAuthToken(token)
      .then(user => {
        req.user = user
        next()
      })
      .catch(error => res.status(400).json({ error }));
  } catch (err) {
    res.status(400).json({ error: err });
  }

};
