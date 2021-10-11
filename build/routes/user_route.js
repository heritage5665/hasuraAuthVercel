var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from "express";
import { check } from "express-validator";
import bcrypt from "bcrypt";
import { authenticate, generateOTP, expiresIn, verifyUserToken, getUserWithEmail, generateAuthToken, validateInput, signupValidation, VerifyEmailvalidation, validateEmail, createVerificationTokenFor, getVerifiedUserWith, validateLoginInput, validateTokenInput, validateResetToken, sendMail, successMessage, validateUserIsLogin, errorMessage, assertNotVerified, validateUserEmail } from "../config/user.service.js";
import { v4 as uuidv4 } from 'uuid';
import UserClient from '../hasura/user_client.js';
import { verifyToken } from '../utils/validate-token.js';
import { ONE_TIME_PASSWORD_TOKEN_LENGTH, TOKEN_EXPIRED_IN, MAIL_FROM } from "../config/settings.js";
const router = express.Router();
const HasuraUser = UserClient.getInstance();
// const HasuraToken: TokenClient = TokenClient.getInstance()
/**
 * @method - POST
 * @param - /signup
 * @description - User SignUp
 */
router.post("/signup", signupValidation, validateInput, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { fullname, email, phone, password } = req.body;
    const user_type = "user";
    const user_id = uuidv4();
    const isVerified = false;
    const salt = yield bcrypt.genSalt(10);
    password = yield bcrypt.hash(password, salt);
    const pin = generateOTP(ONE_TIME_PASSWORD_TOKEN_LENGTH);
    const expires = expiresIn(TOKEN_EXPIRED_IN);
    const user = yield HasuraUser.save({
        email, password, phone, fullname, user_type, user_id, isVerified, pin, expires
    });
    // might needs to move this to another endpoint to be trigger by hasura event
    yield sendMail({
        to: email,
        from: MAIL_FROM,
        subject: "Email Verification",
        html: `<body> <p> Your One Time Password is ${pin}></p></body>`,
    });
    return successMessage({
        data: { user: Object.assign({}, user), auth_token: generateAuthToken(user), pin },
        message: "Please check your email for verification code",
    }, res, 201);
}));
/**
 * @method - POST
 * @param - /create-token
 * @description - Create token after signup
 */
router.post("/resend-token", validateEmail, verifyToken, validateUserIsLogin, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    yield validateUserEmail(req)
        .catch(error => errorMessage(error, res, 401));
    const user = req.user;
    return yield createVerificationTokenFor(user)
        .then(({ pin }) => __awaiter(void 0, void 0, void 0, function* () {
        return res.status(201).json({
            status: true,
            msg: "token created successfully, please check your email",
            data: { token: pin, auth_token: generateAuthToken(user, 7) }
        });
    }))
        .catch(error => errorMessage({ msg: error, error: "something went error" }, res, 200));
}));
/**
 * @method  POST
 * @param - /create-token
 * @description - Create token after signup
 */
router.post("/create-token", validateEmail, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    yield assertNotVerified(yield HasuraUser.findOne(email))
        .then((user) => __awaiter(void 0, void 0, void 0, function* () {
        return yield createVerificationTokenFor(user)
            .then(({ pin }) => __awaiter(void 0, void 0, void 0, function* () {
            return res.status(201).json({
                status: true,
                msg: "token created successfully, please check your email",
                data: { token: pin, auth_token: generateAuthToken(user, 7) }
            });
        }));
    }))
        .catch(err => {
        const { msg, error, status_code } = err;
        return errorMessage({ msg, error }, res, status_code);
    });
}));
/**
 * @method  POST
 * @param - /verify-token
 * @description - Verify Signup Token
 */
router.post("/verify-token", VerifyEmailvalidation, validateInput, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, token } = req.body;
        // Find a matching token
        const user = yield HasuraUser.findUserWithToken(token);
        const canBeVerify = verifyUserToken(user, email, res);
        if (canBeVerify != true)
            return canBeVerify;
        const verified = yield HasuraUser.verifyUser(user);
        if (verified) {
            return res.status(200).send({
                status: true,
                msg: "user verified.",
            });
        }
    }
    catch (error) {
        return res.status(401).json({
            status: false,
            error,
            msg: "invalid or expired token"
        });
    }
}));
/**
 * @method - POST
 * @param - /login
 * @description - User Login
 */
router.post("/login", validateLoginInput, validateInput, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const user = yield getVerifiedUserWith(email);
        if (!user) {
            return res.json({ error: "Invalid Login credetial", msg: "Email or Password incorrect" }).status(401);
        }
        const authenticated = yield authenticate({ email, password }, user);
        if (!authenticated) {
            return res.json({ error: "Invalid Login credetial", msg: "Email or Password incorrect" }).status(401);
        }
        return res.status(200).json(authenticated);
    }
    catch (_a) {
        return res.json({ error: "Invalid Login credetial", msg: "Email or Password incorrect" }).status(401);
    }
}));
/**
 * @method - POST
 * @param - /request-password-token
 * @description - Forgot Password
 */
router.post("/request-reset-token", validateEmail, validateInput, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    return yield getUserWithEmail(email)
        .then((user) => __awaiter(void 0, void 0, void 0, function* () { return { pin: yield createVerificationTokenFor(user), user }; }))
        .then(({ pin, user }) => __awaiter(void 0, void 0, void 0, function* () {
        return res.status(201).json({
            status: true,
            msg: "token created successfully, please check your email",
            data: { token: pin, auth_token: generateAuthToken(user, 7) }
        });
    }))
        .catch(error => res.status(400).json(Object.assign({ status: false }, error)));
}));
/**
 * @method - POST
 * @param - /verify-password-token
 * @description - Forgot Password
 */
router.post("/verify-reset-token", validateTokenInput, validateInput, verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token } = req.body;
    const { user_id } = req.user;
    // console.log(user_id)
    yield validateResetToken(token, user_id)
        .then((validated) => __awaiter(void 0, void 0, void 0, function* () {
        // console.log("found")
        const auth_token = generateAuthToken(req.user);
        return res.status(200).json({
            status: true,
            data: {
                auth_token
            },
            msg: "validation successful"
        });
    })).catch(error => res.status(401).json(Object.assign({ status: false }, error)));
}));
/**
 * @method - POST
 * @param - /forgot-password
 * @description - Forgot Password
 */
router.post("/reset-password", [check("password", "Please enter a valid password").isLength({ min: 8, }).isAlphanumeric()], verifyToken, validateInput, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { password } = req.body;
    let user = req.user;
    const salt = yield bcrypt.genSalt(10);
    user.password = yield bcrypt.hash(password, salt);
    return yield HasuraUser.changePassword(user).
        then(() => res.status(201).json({
        status: true,
        msg: "password changed successfully, you can now login"
    }))
        .catch(error => res.status(400).json({
        status: false,
        error: error,
        msg: "error occured by updating user password"
    }));
}));
router.post("/change-password", [check("old_password", "Please enter a valid password").isLength({ min: 8, }),
    check("new_password", "Please enter a valid password").isLength({ min: 8, })], verifyToken, validateInput, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { new_password, old_password } = req.body;
    let user = req.user;
    if (!user || !bcrypt.compareSync(old_password, user.password)) {
        return res.status(401).json({
            status: false,
            msg: "old password do not match"
        });
    }
    const salt = yield bcrypt.genSalt(10);
    user.password = yield bcrypt.hash(new_password, salt);
    return yield HasuraUser.changePassword(user).then(() => res.status(201).json({
        status: true,
        msg: "password changed successfully, you can now login"
    })).catch(error => res.status(400).json({
        status: false,
        error: error,
        msg: "error occured by updating user password"
    }));
}));
// module.exports = router;
export default router;
