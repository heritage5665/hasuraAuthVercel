import express, { NextFunction, Request, Response } from "express";
import { check, CustomValidator, validationResult } from "express-validator";
import bcrypt from "bcrypt";
import { authenticate, generateRefreshToken, isValidEmail, isValidPhoneNumber } from "../config/user.service";
// import Token from "../models/token.model";
import crypto from "crypto";
import sgMail from "@sendgrid/mail";
import { v4 as uuidv4 } from 'uuid';
import UserClient from '../hasura/user_client';
import TokenClient from '../hasura/token_client'
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
  [
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
  ],

  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    let { fullname, email, phone, password } = req.body;
    const user_type: string = "user"
    const user_id: string = uuidv4()
    const isVerified = false


    try {
      const salt = await bcrypt.genSalt(10);
      password = await bcrypt.hash(password, salt);
      const pin = crypto.randomBytes(16).toString("hex")
      await HasuraUser.save({
        email, password, phone, fullname, user_type, user_id, isVerified, pin
      });


      const payload = {
        user: {
          id: user_id,
        },
      };

      const content = {
        to: email,
        from: "support@me.com",
        subject: "Email Verification",
        html: `<body> <p> Please verify your account by clicking the link: <a href="http://' + ${req.headers.host} + 'confirmation/${pin}' </a></p></body>`,
      };
      await sgMail.send(content);

      return res
        .json({
          data: payload,
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
    }),
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

// /**
//  * @method - POST
//  * @param - /refresh-token
//  * @description - Refresh Token
//  */
// router.post(
//   "/refresh-token",
//   (req: Request, res: Response, next: NextFunction) => {
//     const token = req.cookies.refreshToken;
//     refreshToken({ token })
//       .then(({ refreshToken, ...user }) => {
//         setTokenCookie(res, refreshToken);
//         res.json(user);
//       })
//       .catch(next);
//   }
// );

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
    await HasuraUser.findUserWithToken(token).then(user => {
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

      if (user.isVerified)
        return res.status(400).send({
          type: "already-verified",
          msg: "This user has already been verified.",
        });
      return user

    }).then(async (user) => {
      const verified = await HasuraUser.verifyUser(user)
      if (verified) {
        return res.status(200).send({
          status: true,
          msg: "user verified.",
        });
      }
    })
      .catch(error => console.log(error))

  }
);

/**
 * @method - POST
 * @param - /request-password-token
 * @description - Forgot Password
 */

router.post("/request-password-token",
  [check("email", "Please enter a valid email").isEmail()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }
    const { email } = req.body;
    try {
      const user = await HasuraUser.findUserByEmail(email)
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
      if (user) {
        await generateRefreshToken(user)
          .then(async ({ pin }) => {
            const content = {
              to: email,
              from: "support@me.com",
              subject: "Password Reset Token",
              html: `<body> <p> Your one time reset token is ${pin}</p></body>`,
            };
            await sgMail.send(content);
            return res.status(200).json({
              staus: true,
              msg: "please check your email for your reset token, it expires in 7 minutes"
            });

          })
      }

      return res.status(401).json({
        status: false,
        error: "user not found",
        msg: "the email could not be authenticated"
      }
      )
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
  [check("email", "Please enter a valid email").isEmail()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }
    const { email } = req.body;
    try {
      const user = await HasuraUser.findUserByEmail(email)
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
      if (user) {
        await generateRefreshToken(user)
          .then(async ({ pin }) => {
            const content = {
              to: email,
              from: "support@me.com",
              subject: "Password Reset Token",
              html: `<body> <p> Your one time reset token is ${pin}</p></body>`,
            };
            await sgMail.send(content);
            return res.status(200).json({
              staus: true,
              msg: "password change successfully"
            });

          })
      }

      return res.status(401).json({
        status: false,
        error: "user not found",
        msg: "the email could not be authenticated"
      }
      )
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

router.post("/forgot-password",
  [check("email", "Please enter a valid email").isEmail()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }
    const { email } = req.body;
    try {
      const user = await HasuraUser.findUserByEmail(email)
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
      if (user) {
        await generateRefreshToken(user)
          .then(async ({ pin }) => {
            const content = {
              to: email,
              from: "support@me.com",
              subject: "Password Reset Token",
              html: `<body> <p> Your one time reset token is ${pin}</p></body>`,
            };
            await sgMail.send(content);
            return res.status(200).json({
              staus: true,
              msg: "password change successfully"
            });

          })
      }

      return res.status(401).json({
        status: false,
        error: "user not found",
        msg: "the email could not be authenticated"
      }
      )
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
 * @param - /change-password
 * @description - Change Password
 */

router.post("/change-password",
  [check("new_passwordl", "Please enter a valid email").isEmail()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }
    const { email } = req.body;
    try {
      const user = await HasuraUser.findUserByEmail(email)
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
      if (user) {
        await generateRefreshToken(user)
          .then(async ({ pin }) => {
            const content = {
              to: email,
              from: "support@me.com",
              subject: "Password Reset Token",
              html: `<body> <p> Your one time reset token is ${pin}</p></body>`,
            };
            await sgMail.send(content);
            return res.status(200).json({
              staus: true,
              msg: "password change successfully"
            });

          })
      }

      return res.status(401).json({
        status: false,
        error: "user not found",
        msg: "the email could not be authenticated"
      }
      )
    } catch (error) {
      return res.status(400).json({
        status: false,
        error: error,
        msg: "error occured by updating user password"
      })
    }
  }
);
module.exports = router;
