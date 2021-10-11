var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
// import { db } from "./db";
import UserClient from '../hasura/user_client.js';
import TokenClient from '../hasura/token_client.js';
import { validationResult, check } from "express-validator";
import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import { ONE_TIME_PASSWORD_TOKEN_LENGTH } from "./settings.js";
const userDB = UserClient.getInstance();
const tokenDB = TokenClient.getInstance();
const createTestAccount = () => __awaiter(void 0, void 0, void 0, function* () { return yield nodemailer.createTestAccount(); });
function sendMailUsingSmtp(content) {
    return __awaiter(this, void 0, void 0, function* () {
        const testAccount = yield createTestAccount();
        let transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass, // generated ethereal password
            },
        });
        // send mail with defined transport object
        return yield transporter.sendMail(content);
    });
}
export const successMessage = (response_data, res, status_code) => res
    .json(Object.assign(Object.assign({}, response_data), { status: true })).status(status_code);
export const errorMessage = (error_data, res, status_code) => res
    .json(Object.assign(Object.assign({}, error_data), { status: false })).status(status_code);
export const validateUserIsLogin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user || req.user == undefined || req.user == null) {
        return res.status(400).json({
            status: false,
            error: "validation error",
            msg: "authorization token required"
        });
    }
    return next();
});
export const assertNotVerified = (userQueryResponse) => __awaiter(void 0, void 0, void 0, function* () {
    return userQueryResponse.then(user => {
        if (!user)
            return Promise.reject({ error: "user with email not found", msg: "not found", status_code: 404 });
        if (user.isVerified)
            return Promise.reject({ error: "user already verified", msg: "already verified", status_code: 409 });
        return user;
    });
});
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
        if (!refreshToken || !refreshToken.isVerified)
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
    return iv.toString('hex') + "." + encrypted.toString('hex') + "." + key.toString('hex');
}
export function decrypt(text) {
    const data = text.split(".");
    const iv = Buffer.from(data[0], 'hex');
    const key = Buffer.from(data[2], 'hex');
    const encryptedText = Buffer.from(data[1], 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
export function sendMail(content) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield sendMailUsingSmtp(content);
            yield sgMail.send(content);
            return;
        }
        catch (_a) {
            return false;
        }
    });
}
export function expiresIn(minutes) {
    const now = (new Date()).getTime();
    return new Date(now + minutes * 60000);
}
export function generateAuthToken(user, expires_in = 24 * 60) {
    const { user_id, email } = user;
    const expires = expiresIn(expires_in);
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
        if (parseInt(expires) < (new Date()).getTime())
            return Promise.reject("expired auth_token given");
        const user = yield userDB.findOne(user_id);
        if (!user)
            return Promise.reject("invalid auth_token");
        return user;
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
export function getVerifiedUserWith(email_or_phone_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield userDB.findOne(email_or_phone_id);
        if (user && user.isVerified) {
            return user;
        }
        return false;
    });
}
export function getUserWithEmail(email) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield userDB.findOne(email)
            .then(user => {
            if (!user || user == undefined)
                return Promise.reject({ msg: "Email is incorrect", error: "user not found" });
            if (!user.isVerified)
                Promise.reject({ msg: "your account need verification", error: "email activation neede" });
            return user;
        });
    });
}
export function generateRefreshToken(user) {
    // create a refresh token that expires in 7 days
    return tokenDB.save({
        user_id: user.user_id,
        pin: generateOTP(ONE_TIME_PASSWORD_TOKEN_LENGTH),
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
        if (user.email != email) {
            return false;
        }
        yield generateRefreshToken(user);
        const authToken = generateAuthToken(user);
        return Object.assign(Object.assign({}, basicDetails(user)), { authToken });
    });
}
// needs complete rewrite
export const isValidEmail = (value) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield userDB.findOne(value);
    if (user) {
        return Promise.reject("E-mail already in use");
    }
});
export const validateUserEmail = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    if (req.user.email != email) {
        Promise.reject({
            error: "unauthorized user",
            msg: "invalid email given"
        });
    }
});
export const validateResetToken = (token, user_id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield userDB.findUserWithToken(token).
        then((user) => __awaiter(void 0, void 0, void 0, function* () {
        if (!user)
            return Promise.reject({ msg: "user with  email not found on this server", error: "user not found" });
        if (user_id != user.user_id)
            Promise.reject({ msg: "token validation failed", error: "unathorized token" });
        return yield tokenDB.delete(user_id, token);
    }));
});
export const createVerificationTokenFor = (user) => __awaiter(void 0, void 0, void 0, function* () {
    const { pin } = yield generateRefreshToken(user);
    yield sendMail({
        to: user.email,
        from: "support@convoy.com",
        subject: "Email Verification",
        html: `<body> <p> Your One Time Password is ${pin}></p></body>`,
    });
    return pin;
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
export const signupValidation = [
    check("email").custom(isValidEmail),
    check("email", "Please enter a valid email").isEmail(),
    check("phone").custom(isValidPhoneNumber),
    check("phone", "Please enter a phone number")
        .not()
        .isEmpty()
        .trim()
        .escape(),
    check("fullname", "Please enter a fullname").not()
        .isEmpty()
        .isAlpha().trim().escape(),
    check("password", "Please enter a valid password").isLength({
        min: 8,
    }),
];
export const VerifyEmailvalidation = [
    check("email", "Email is not valid").isEmail(),
    check("email", "Email cannot be blank").notEmpty(),
    check("token", "Token cannot be blank").notEmpty(),
];
export const validateEmail = [check("email", "Email is not valid").isEmail()];
export const validateLoginInput = [
    check("email", "Please enter a valid email").isEmail(),
    check("password", "Please enter a valid password").isLength({
        min: 8
    })
];
export const validateTokenInput = [check("token", "Please enter a valid token").isNumeric().isLength({ min: 7, max: 7 })];
