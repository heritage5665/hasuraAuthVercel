const config = require("../config/config.json");
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
// import { db } from "./db";
import UserClient from '../hasura/user_client';
import TokenClient from '../hasura/token_client';
import { CustomValidator } from "express-validator";
import express, { Response, NextFunction } from "express";
import { validationResult } from "express-validator";
interface Authenticate {
  email: string;
  password: string;
}
const userDB = UserClient.getInstance()
const tokenDB = TokenClient.getInstance()
interface Token {
  token: string;
}
export const validateInput = async (req: any, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }
  return next()

};

export async function getRefreshToken(token: string) {
  const refreshToken = await userDB.findUserWithToken(token)
  if (!refreshToken || !refreshToken.isActive) throw "Invalid token";
  return refreshToken;
}
// need to rewrite this
export function generateJwtToken(user: any) {
  return jwt.sign({ sub: user.id, id: user.id }, config.secret, {
    expiresIn: "15m",
  });
}


export function generateOTP(number_of_digits: Number) {
  var digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < number_of_digits; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
}

export function encrypt(text: string) {
  const iv = crypto.randomBytes(16);
  const key = crypto.randomBytes(32);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + "||||" + encrypted.toString('hex') + "|||" + key;
}

export function decrypt(text: string) {
  const data = text.split("||||")
  const iv = Buffer.from(data[0], 'hex');
  const key = Buffer.from(data[2], 'hex')
  const encryptedText = Buffer.from(data[1], 'hex');
  let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export function expiresIn(minutes: any) {
  const now = (new Date()).getTime()
  return new Date(now + minutes * 60000)
}


export function generateAuthToken(user: any) {
  const { user_id, email } = user
  const expires = expiresIn(60)
  let token = user_id + "::" + expires.getTime() + "::" + email
  if (user.pin) {
    token = token + "::" + user.pin;
  }
  const encryptedToken = encrypt(token)
  return encryptedToken
}


export async function verifyUserAuthToken(token: string) {
  const [user_id, expires] = decrypt(token).split("::")
  if (parseInt(expires) < (new Date()).getTime()) {
    return false
  }
  const user = await userDB.findOne(user_id)
  if (user) {
    return user
  }
  return false
}

export function verifyUserToken(user: any, email: string, res: Response) {

  if (!user) {
    return res.status(400).send({
      type: "not-verified",
      msg: "We were unable to find a valid token. Your token may have expired.",
    });

  }
  if (user.email != email) {
    return res.status(400).send({
      type: "not-verified",
      msg: "We were unable to find a valid token. Your token may have expired.",
    });
  }

  if (user.isVerified) {
    return res.status(400).send({
      type: "already-verified",
      msg: "This user has already been verified.",
    });
  }
  return true

}

export async function getUserWithEmail(email: string, res: Response) {
  return await userDB.findUserByEmail(email)
    .then(user => {
      if (!user) {
        return res.status(404).send({
          type: "not-found",
          msg: "We were unable to find a user with the email on our server",
        });
      }
      if (user && !user.isVerified) {
        return res.status(400).send({
          type: "user-not-verified",
          msg: "Please verify your account before reseting password",
        });
      }
      return user
    })
}


export function generateRefreshToken(user: any) {
  // create a refresh token that expires in 7 days
  return tokenDB.save({
    user_id: user.user_id,
    pin: generateOTP(7),
    expires: expiresIn(7)
  });
}
// needs to rewrite this also
function randomTokenString() {
  return crypto.randomBytes(40).toString("hex");
  // return crypto.randomInt(1000000)
}

export function basicDetails(user: any) {
  const { user_id, fullname, email } = user;
  return { user_id, fullname, email };
}

export async function authenticate({ email, password }: Authenticate, user: any) {
  if (!user || !bcrypt.compareSync(password, user.password)) {
    throw "Username or password is incorrect";
  }
  const refreshToken = await generateRefreshToken(user);
  const jwtToken = generateJwtToken(user);

  return {
    ...basicDetails(user),
    jwtToken,
    refreshToken: refreshToken.pin,
  };
}
// needs complete rewrite
// export async function refreshToken({ token }: Token) {
//   const refreshToken = await getRefreshToken(token);
//   const { user } = refreshToken;

//   // replace old refresh token with a new one and save
//   const newRefreshToken = generateRefreshToken(user);
//   refreshToken.revoked = Date.now();
//   refreshToken.replacedByToken = newRefreshToken.token;
//   await refreshToken.save();
//   await newRefreshToken.save();

//   // generate new jwt
//   const jwtToken = generateJwtToken(user);

//   // return basic details and tokens
//   return {
//     ...basicDetails(user),
//     jwtToken,
//     refreshToken: newRefreshToken.token,
//   };
// }
export const isValidEmail: CustomValidator = async (value: string) => {
  const user = await userDB.findUserByEmail(value);
  if (user) {
    return Promise.reject("E-mail already in use");
  }
};

export const isValidPhoneNumber: CustomValidator = async (value: string) => {
  const user = await userDB.findOne(value);
  if (user) {
    return Promise.reject("Phone already in use");
  }
};

// export async function revokeToken({ token }: Token) {
//   const refreshToken = await getRefreshToken(token);

//   // revoke token and save
//   refreshToken.revoked = Date.now();
//   await refreshToken.save();
// }

export async function getById(id: string) {
  const user = await getUser(id);
  return basicDetails(user);
}

// export async function getRefreshTokens(userId: string) {
//   // check that user exists
//   await getUser(userId);

//   //   // return refresh tokens for user
//   //   const refreshTokens = await db.RefreshToken.find({ user: userId });
//   //   return refreshTokens;
// }

// helper functions

export async function getUser(id: string) {
  // if (!db.isValidId(id)) throw "User not found";
  const user = await userDB.findOne(id);
  if (!user) throw "User not found";
  return user;
}
