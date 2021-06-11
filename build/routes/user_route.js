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
import { check, validationResult } from "express-validator";
import bcrypt from "bcrypt";
import { authenticate, generateOTP, generateRefreshToken, isValidEmail, isValidPhoneNumber, expiresIn, verifyUserToken, getUserWithEmail, generateAuthToken, validateInput } from "../config/user.service.js";
import sgMail from "@sendgrid/mail";
import { v4 as uuidv4 } from 'uuid';
import UserClient from '../hasura/user_client.js';
import TokenClient from '../hasura/token_client.js';
import { verifyToken } from '../utils/validate-token.js';
sgMail.setApiKey("API KEY here");
const router = express.Router();
const HasuraUser = UserClient.getInstance();
const HasuraToken = TokenClient.getInstance();
/**
 * @method - POST
 * @param - /signup
 * @description - User SignUp
 */
router.post("/signup", [
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
    }).isAlphanumeric().isStrongPassword(),
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array(),
        });
    }
    let { fullname, email, phone, password } = req.body;
    const user_type = "user";
    const user_id = uuidv4();
    const isVerified = false;
    try {
        const salt = yield bcrypt.genSalt(10);
        password = yield bcrypt.hash(password, salt);
        const pin = generateOTP(7);
        const expires = expiresIn(7);
        const result = yield HasuraUser.save({
            email, password, phone, fullname, user_type, user_id, isVerified, pin, expires
        });
        const content = {
            to: email,
            from: "support@me.com",
            subject: "Email Verification",
            html: `<body> <p> Please verify your account by clicking the link: <a href="http://' + ${req.headers.host} + 'confirmation/${pin}' </a></p></body>`,
        };
        yield sgMail.send(content);
        return res
            .json({
            data: { user: Object.assign({}, result) },
            message: "Please check your email for verification code",
        })
            .status(201);
    }
    catch (err) {
        console.log(err.message);
        res.status(500).send("Error in Saving");
    }
}));
/**
 * @method - POST
 * @param - /login
 * @description - User Login
 */
router.post("/login", [
    check("email", "Please enter a valid email").isEmail(),
    check("password", "Please enter a valid password").isLength({
        min: 8,
    }).isAlphanumeric().isStrongPassword(),
], (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array(),
        });
    }
    const user = yield HasuraUser.findOne(req.body.email);
    if (!user.isVerified)
        return res.status(401).send({
            type: "not-verified",
            msg: "Your account has not been verified.",
        });
    const { email, password } = req.body;
    authenticate({ email, password }, user)
        .then(resp => res.json(resp))
        .catch(next);
}));
/**
 * @method - POST
 * @param - /verify-token
 * @description - Verify Signup Token
 */
router.post("/verify-token", [
    check("email", "Email is not valid").isEmail(),
    check("email", "Email cannot be blank").notEmpty(),
    check("token", "Token cannot be blank").notEmpty(),
], (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array(),
        });
    }
    const { email, token } = req.body;
    // Find a matching token
    const user = yield HasuraUser.findUserWithToken(token);
    const canBeVerify = verifyUserToken(user, email, res);
    if (canBeVerify == true)
        yield HasuraUser.verifyUser(user)
            .then(verified => {
            if (verified) {
                return res.status(200).send({
                    status: true,
                    msg: "user verified.",
                });
            }
            return res.status(200).send({
                status: false,
                msg: "user not verified try again latter"
            });
        });
    return canBeVerify;
}));
/**
 * @method - POST
 * @param - /request-password-token
 * @description - Forgot Password
 */
router.post("/request-reset-token", [check("email", "Please enter a valid email").isEmail(),
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array(),
        });
    }
    const { email } = req.body;
    try {
        const user = yield getUserWithEmail(email, res);
        if (!(user instanceof Response)) {
            const { pin } = yield generateRefreshToken(user);
            user.pin = pin;
            const auth_token = generateAuthToken(user);
            const content = {
                to: email,
                from: "support@me.com",
                subject: "Password Reset Token",
                html: `<body> <p> Your one time reset token is ${pin}</p></body>`,
            };
            yield sgMail.send(content);
            return res.status(200).json({
                staus: true,
                data: {
                    auth_token
                },
                msg: "please check your email for your reset token, it expires in 7 minutes"
            });
        }
        return user;
    }
    catch (error) {
        return res.status(400).json({
            status: false,
            error: error,
            msg: "error occured by updating user password"
        });
    }
}));
/**
 * @method - POST
 * @param - /verify-password-token
 * @description - Forgot Password
 */
router.post("/verify-password-token", [check("token", "Please enter a valid token").isNumeric().isLength({ min: 7 })], verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array(),
        });
    }
    const { token } = req.body;
    const { user_id } = req.user;
    try {
        const user = yield HasuraUser.findUserWithToken(token);
        if (!user) {
            return res.status(401).json({
                status: false,
                error: "user not found",
                msg: "the user with given token not found on this server"
            });
        }
        const token_owner_user_id = user.user_id;
        if (token_owner_user_id != user_id) {
            return res.status(401).json({
                status: false,
                error: "invalid otp given",
                msg: "reset token cannot be validated"
            });
        }
        yield HasuraToken.delete(user_id, token);
        const auth_token = generateAuthToken(req.user);
        return res.status(200).json({
            status: true,
            data: {
                auth_token
            },
            msg: "validation successful"
        });
    }
    catch (error) {
        return res.status(400).json({
            status: false,
            error: error,
            msg: "error occured by updating user password"
        });
    }
}));
/**
 * @method - POST
 * @param - /forgot-password
 * @description - Forgot Password
 */
router.post("/change-password", [check("password", "Please enter a valid password").isLength({ min: 8, }).isAlphanumeric().isStrongPassword(),], [verifyToken, validateInput], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { password } = req.body;
    let user = req.user;
    const salt = yield bcrypt.genSalt(10);
    user.password = yield bcrypt.hash(password, salt);
    try {
        yield HasuraUser.changePassword(user);
        return res.status(201).json({
            status: true,
            msg: "password changed successfully, you can now login"
        });
    }
    catch (error) {
        return res.status(400).json({
            status: false,
            error: error,
            msg: "error occured by updating user password"
        });
    }
}));
// module.exports = router;
export default router;
