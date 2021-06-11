import express, { NextFunction, Request, Response } from "express";
import { check, validationResult } from "express-validator";
import bcrypt from "bcrypt";
import {
  authenticate, generateOTP, generateRefreshToken, expiresIn, verifyUserToken,
  getUserWithEmail, generateAuthToken, validateInput, signupValidation
} from "../config/user.service.js";
import sgMail from "@sendgrid/mail";
import { v4 as uuidv4 } from 'uuid';
import UserClient from '../hasura/user_client.js';
import TokenClient from '../hasura/token_client.js'
import { verifyToken } from '../utils/validate-token.js';
sgMail.setApiKey("API KEY here");

const router = express.Router();

const HasuraUser: UserClient = UserClient.getInstance()
const HasuraToken: TokenClient = TokenClient.getInstance()
/**
 * @method - POST
 * @param - /signup
 * @description - User SignUp
 */



router.post(
  "/signup",
  signupValidation,
  validateInput,
  async (req: Request, res: Response) => {
    let { fullname, email, phone, password } = req.body;
    const user_type: string = "user"
    const user_id: string = uuidv4()
    const isVerified = false
    try {
      const salt = await bcrypt.genSalt(10);
      password = await bcrypt.hash(password, salt);
      const pin = generateOTP(7)
      const expires = expiresIn(7)
      const result = await HasuraUser.save({
        email, password, phone, fullname, user_type, user_id, isVerified, pin, expires
      });

      const content = {
        to: email,
        from: "support@me.com",
        subject: "Email Verification",
        html: `<body> <p> Please verify your account by clicking the link: <a href="http://' + ${req.headers.host} + 'confirmation/${pin}' </a></p></body>`,
      };
      await sgMail.send(content);
      return res
        .json({
          data: { user: { ...result } },
          message: "Please check your email for verification code",
        })
        .status(201);
    } catch (err) {
      console.log(err.message);
      res.status(500).send("Error in Saving");
    }
  }
);

/**
 * @method - POST
 * @param - /login
 * @description - User Login
 */
router.post(
  "/login",
  [
    check("email", "Please enter a valid email").isEmail(),
    check("password", "Please enter a valid password").isLength({
      min: 8,
    }).isAlphanumeric().isStrongPassword(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }
    const user = await HasuraUser.findOne(req.body.email);

    if (!user.isVerified)
      return res.status(401).send({
        type: "not-verified",
        msg: "Your account has not been verified.",
      });

    const { email, password } = req.body;
    authenticate({ email, password }, user)
      .then(resp => res.json(resp))
      .catch(next);
  }
);


/**
 * @method - POST
 * @param - /verify-token
 * @description - Verify Signup Token
 */
router.post(
  "/verify-token",
  [
    check("email", "Email is not valid").isEmail(),
    check("email", "Email cannot be blank").notEmpty(),
    check("token", "Token cannot be blank").notEmpty(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }
    const { email, token } = req.body
    // Find a matching token
    const user = await HasuraUser.findUserWithToken(token);
    const canBeVerify = verifyUserToken(user, email, res);
    if (canBeVerify == true)
      await HasuraUser.verifyUser(user)
        .then(verified => {
          if (verified) {
            return res.status(200).send({
              status: true,
              msg: "user verified.",
            })
          }
          return res.status(200).send({
            status: false,
            msg: "user not verified try again latter"
          })

        })

    return canBeVerify;

  }
);

/**
 * @method - POST
 * @param - /request-password-token
 * @description - Forgot Password
 */

router.post("/request-reset-token",
  [check("email", "Please enter a valid email").isEmail(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }
    const { email } = req.body;
    try {
      const user = await getUserWithEmail(email, res)
      if (!(user instanceof Response)) {
        const { pin } = await generateRefreshToken(user)
        user.pin = pin
        const auth_token = generateAuthToken(user)

        const content = {
          to: email,
          from: "support@me.com",
          subject: "Password Reset Token",
          html: `<body> <p> Your one time reset token is ${pin}</p></body>`,
        };
        await sgMail.send(content);
        return res.status(200).json({
          staus: true,
          data: {
            auth_token
          },
          msg: "please check your email for your reset token, it expires in 7 minutes"
        });


      }
      return user


    } catch (error) {
      return res.status(400).json({
        status: false,
        error: error,
        msg: "error occured by updating user password"
      })
    }
  }
);


/**
 * @method - POST
 * @param - /verify-password-token
 * @description - Forgot Password
 */

router.post("/verify-password-token",
  [check("token", "Please enter a valid token").isNumeric().isLength({ min: 7 })],
  verifyToken,
  async (req: any, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }
    const { token } = req.body;
    const { user_id } = req.user
    try {
      const user = await HasuraUser.findUserWithToken(token)
      if (!user) {
        return res.status(401).json({
          status: false,
          error: "user not found",
          msg: "the user with given token not found on this server"
        }
        )
      }
      const token_owner_user_id = user.user_id
      if (token_owner_user_id != user_id) {
        return res.status(401).json(
          {
            status: false,
            error: "invalid otp given",
            msg: "reset token cannot be validated"
          }
        )
      }
      await HasuraToken.delete(user_id, token)
      const auth_token = generateAuthToken(req.user)
      return res.status(200).json({
        status: true,
        data: {
          auth_token
        },
        msg: "validation successful"
      })


    } catch (error) {
      return res.status(400).json({
        status: false,
        error: error,
        msg: "error occured by updating user password"
      })
    }
  }
);

/**
 * @method - POST
 * @param - /forgot-password
 * @description - Forgot Password
 */

router.post("/change-password",
  [check("password", "Please enter a valid password").isLength({ min: 8, }).isAlphanumeric().isStrongPassword(),],
  [verifyToken, validateInput],
  async (req: any, res: Response) => {

    const { password } = req.body;
    let user = req.user
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)
    try {
      await HasuraUser.changePassword(user)
      return res.status(201).json({
        status: true,
        msg: "password changed successfully, you can now login"
      })
    } catch (error) {
      return res.status(400).json({
        status: false,
        error: error,
        msg: "error occured by updating user password"
      })
    }
  }
);

// module.exports = router;
export default router