import express, { NextFunction, Request, Response } from "express";
import { check } from "express-validator";
import bcrypt from "bcrypt";

import {
  authenticate, generateOTP, expiresIn, verifyUserToken,
  getUserWithEmail, generateAuthToken, validateInput, signupValidation,
  VerifyEmailvalidation, validateEmail, createVerificationTokenFor,
  validateLoginInput, validateTokenInput, validateResetToken, sendMail,
  successMessage, validateUserIsLogin, errorMessage, assertNotVerified, validateUserEmail
} from "../config/user.service.js";


import { v4 as uuidv4 } from 'uuid';
import UserClient from '../hasura/user_client.js';
// import TokenClient from '../hasura/token_client.js'
import { verifyToken } from '../utils/validate-token.js';
// sgMail.setApiKey("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");

const router = express.Router();

const HasuraUser: UserClient = UserClient.getInstance()
// const HasuraToken: TokenClient = TokenClient.getInstance()
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

    const salt = await bcrypt.genSalt(10);
    password = await bcrypt.hash(password, salt);
    const pin = generateOTP(7)
    const expires = expiresIn(60 * 24)
    const user = await HasuraUser.save({
      email, password, phone, fullname, user_type, user_id, isVerified, pin, expires
    });
    await sendMail({
      to: email,
      from: "support@convoy.com",
      subject: "Email Verification",
      html: `<body> <p> Your One Time Password is ${pin}></p></body>`,
    })
    return successMessage({
      data: { user: { ...user }, auth_token: generateAuthToken(user), pin },
      message: "Please check your email for verification code",
    }, res, 201)

  }
);

/**
 * @method - POST
 * @param - /create-token
 * @description - Create token after signup
 */
router.post("/resend-token",
  validateEmail, verifyToken, validateUserIsLogin,
  async (req: any, res: Response, next: NextFunction) => {
    await validateUserEmail(req)
      .catch(error => errorMessage(error, res, 401))
    const user = req.user
    return await createVerificationTokenFor(user)
      .then(async ({ pin }) =>
        res.status(201).json({
          status: true,
          msg: "token created successfully, please check your email",
          data: { token: pin, auth_token: generateAuthToken(user, 7) }
        })
      )
      .catch(error => errorMessage({ msg: error, error: "something went error" }, res, 200))
  }
)

/**
 * @method - POST
 * @param - /create-token
 * @description - Create token after signup
 */
router.post("/create-token",
  validateEmail,
  async (req: any, res: Response, next: NextFunction) => {
    const { email } = req.body
    await assertNotVerified(await HasuraUser.findOne(email))
      .then(async (user) => await createVerificationTokenFor(user)
        .then(async ({ pin }) =>
          res.status(201).json({
            status: true,
            msg: "token created successfully, please check your email",
            data: { token: pin, auth_token: generateAuthToken(user, 7) }
          })
        ))
      .catch(err => {
        const { msg, error, status_code } = err
        return errorMessage({ msg, error }, res, status_code)
      })
  })

/**
 * @method - POST
 * @param - /verify-token
 * @description - Verify Signup Token
 */
router.post(
  "/verify-token",
  VerifyEmailvalidation, validateInput,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, token } = req.body
      // Find a matching token
      const user = await HasuraUser.findUserWithToken(token);
      const canBeVerify = verifyUserToken(user, email, res);
      if (canBeVerify != true) return canBeVerify;
      const verified = await HasuraUser.verifyUser(user)
      if (verified) {
        return res.status(200).send({
          status: true,
          msg: "user verified.",
        })
      }

    } catch (error) {
      return res.status(401).json({
        status: false,
        error,
        msg: "invalid or expired token"
      })
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
  validateLoginInput, validateInput,
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await HasuraUser.findOne(req.body.email);
    if (!user.isVerified)
      return res.status(401).send({
        type: "not-verified",
        msg: "Your account has not been verified.",
      });
    const { email, password } = req.body;
    return await authenticate({ email, password }, user)
      .then(resp => res.status(200).json(resp))
      .catch(error => res.status(200).json({ error }));
  }
);

/**
 * @method - POST
 * @param - /request-password-token
 * @description - Forgot Password
 */
router.post("/request-reset-token",
  validateEmail, validateInput,
  async (req: Request, res: Response) => {
    const { email } = req.body;
    return await getUserWithEmail(email)
      .then(async user => { return { pin: await createVerificationTokenFor(user), user } })
      .then(async ({ pin, user }) =>
        res.status(201).json({
          status: true,
          msg: "token created successfully, please check your email",
          data: { token: pin, auth_token: generateAuthToken(user, 7) }
        })
      )
      .catch(error => res.status(400).json({ status: false, ...error })
      );
  })


/**
 * @method - POST
 * @param - /verify-password-token
 * @description - Forgot Password
 */
router.post("/verify-reset-token",
  validateTokenInput, validateInput, verifyToken,
  async (req: any, res: Response) => {
    const { token } = req.body;
    const { user_id } = req.user
    console.log(user_id)
    await validateResetToken(token, user_id)
      .then(async validated => {
        console.log("found")
        const auth_token = generateAuthToken(req.user)
        return res.status(200).json({
          status: true,
          data: {
            auth_token
          },
          msg: "validation successful"
        })
      }).catch(error => res.status(401).json({
        status: false,
        ...error
      }))
  }
);

/**
 * @method - POST
 * @param - /forgot-password
 * @description - Forgot Password
 */
router.post("/reset-password",
  [check("password", "Please enter a valid password").isLength({ min: 8, }).isAlphanumeric()],
  verifyToken, validateInput,
  async (req: any, res: Response) => {
    const { password } = req.body;
    let user = req.user
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)
    return await HasuraUser.changePassword(user).
      then(() => res.status(201).json({
        status: true,
        msg: "password changed successfully, you can now login"
      }))
      .catch(error => res.status(400).json({
        status: false,
        error: error,
        msg: "error occured by updating user password"
      }))

  }
);

router.post("/change-password",
  [check("old_password", "Please enter a valid password").isLength({ min: 8, }),
  check("new_password", "Please enter a valid password").isLength({ min: 8, })],
  verifyToken, validateInput,
  async (req: any, res: Response) => {
    const { new_password, old_password } = req.body;
    let user = req.user
    if (!user || !bcrypt.compareSync(old_password, user.password)) {
      return res.status(401).json({
        status: false,
        msg: "old password do not match"
      })
    }
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(new_password, salt)
    return await HasuraUser.changePassword(user).then(() => res.status(201).json({
      status: true,
      msg: "password changed successfully, you can now login"
    })).catch(error => res.status(400).json({
      status: false,
      error: error,
      msg: "error occured by updating user password"
    }))
  }
);


// module.exports = router;
export default router