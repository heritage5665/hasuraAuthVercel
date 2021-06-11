var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const config = require("../config/config.json");
// import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
// import { db } from "./db";
import UserClient from '../hasura/user_client.js';
import TokenClient from '../hasura/token_client.js';
import { validationResult } from "express-validator";
const userDB = UserClient.getInstance();
const tokenDB = TokenClient.getInstance();
export const validateInput = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array(),
        });
    }
    return next();
});
export function getRefreshToken(token) {
    return __awaiter(this, void 0, void 0, function* () {
        const refreshToken = yield userDB.findUserWithToken(token);
        if (!refreshToken || !refreshToken.isActive)
            throw "Invalid token";
        return refreshToken;
    });
}
// need to rewrite this
// export function generateJwtToken(user: any) {
//   return jwt.sign({ sub: user.id, id: user.id }, config.secret, {
//     expiresIn: "15m",
//   });
// }
export function generateOTP(number_of_digits) {
    var digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < number_of_digits; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
}
export function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const key = crypto.randomBytes(32);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + "||||" + encrypted.toString('hex') + "|||" + key;
}
export function decrypt(text) {
    const data = text.split("||||");
    const iv = Buffer.from(data[0], 'hex');
    const key = Buffer.from(data[2], 'hex');
    const encryptedText = Buffer.from(data[1], 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
export function expiresIn(minutes) {
    const now = (new Date()).getTime();
    return new Date(now + minutes * 60000);
}
export function generateAuthToken(user) {
    const { user_id, email } = user;
    const expires = expiresIn(60);
    let token = user_id + "::" + expires.getTime() + "::" + email;
    if (user.pin) {
        token = token + "::" + user.pin;
    }
    const encryptedToken = encrypt(token);
    return encryptedToken;
}
export function verifyUserAuthToken(token) {
    return __awaiter(this, void 0, void 0, function* () {
        const [user_id, expires] = decrypt(token).split("::");
        if (parseInt(expires) < (new Date()).getTime()) {
            return false;
        }
        const user = yield userDB.findOne(user_id);
        if (user) {
            return user;
        }
        return false;
    });
}
export function verifyUserToken(user, email, res) {
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
    return true;
}
export function getUserWithEmail(email, res) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield userDB.findUserByEmail(email)
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
            return user;
        });
    });
}
export function generateRefreshToken(user) {
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
export function basicDetails(user) {
    const { user_id, fullname, email } = user;
    return { user_id, fullname, email };
}
export function authenticate({ email, password }, user) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!user || !bcrypt.compareSync(password, user.password)) {
            throw "Username or password is incorrect";
        }
        const refreshToken = yield generateRefreshToken(user);
        const authToken = generateAuthToken(user);
        return Object.assign(Object.assign({}, basicDetails(user)), { authToken });
    });
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
export const isValidEmail = (value) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield userDB.findUserByEmail(value);
    if (user) {
        return Promise.reject("E-mail already in use");
    }
});
export const isValidPhoneNumber = (value) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield userDB.findOne(value);
    if (user) {
        return Promise.reject("Phone already in use");
    }
});
// export async function revokeToken({ token }: Token) {
//   const refreshToken = await getRefreshToken(token);
//   // revoke token and save
//   refreshToken.revoked = Date.now();
//   await refreshToken.save();
// }
export function getById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield getUser(id);
        return basicDetails(user);
    });
}
// export async function getRefreshTokens(userId: string) {
//   // check that user exists
//   await getUser(userId);
//   //   // return refresh tokens for user
//   //   const refreshTokens = await db.RefreshToken.find({ user: userId });
//   //   return refreshTokens;
// }
// helper functions
export function getUser(id) {
    return __awaiter(this, void 0, void 0, function* () {
        // if (!db.isValidId(id)) throw "User not found";
        const user = yield userDB.findOne(id);
        if (!user)
            throw "User not found";
        return user;
    });
}
