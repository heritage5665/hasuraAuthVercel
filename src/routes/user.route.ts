import express, { NextFunction, Request, Response } from "express";
import { check, CustomValidator, validationResult } from "express-validator";
import bcrypt from "bcrypt";
import { authenticate, refreshToken } from "../config/user.service";
import Token from "../models/token.model";
import crypto from "crypto";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey("API KEY here");

const router = express.Router();

const User = require("../models/user.model");
const config = require("../config/config.json");

/**
 * @method - POST
 * @param - /signup
 * @description - User SignUp
 */

const isValidEmail: CustomValidator = (value) => {
  return User.findUserByEmail(value).then((user: any) => {
    if (user) {
      return Promise.reject("E-mail already in use");
    }
  });
};

const isValidPhoneNumber: CustomValidator = (value) => {
  return User.findOne(value).then((user: any) => {
    if (user) {
      return Promise.reject("Phone already in use");
    }
  });
};

function setTokenCookie(res: Response, token: string) {
  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
  res.cookie("refreshToken", token, cookieOptions);
}

router.post(
  "/signup",
  [
    check("email").custom(isValidEmail),
    check("email", "Please enter a valid email").isEmail(),
    check("phonenumber").custom(isValidPhoneNumber),
    check("phonenumber", "Please enter a phone number")
      .not()
      .isEmpty()
      .trim()
      .escape(),
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

    const { fullname, email, phonenumber, password } = req.body;
    try {
      const user = new User({
        fullname,
        email,
        password,
        phonenumber,
      });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      await user.save();
      const token = new Token({
        _userId: user._id,
        token: crypto.randomBytes(16).toString("hex"),
      });

      const payload = {
        user: {
          id: user._id,
        },
      };

      const content = {
        to: email,
        from: "support@me.com",
        subject: "Email Verification",
        html: `<body> <p> Please verify your account by clicking the link: <a href="http://' + ${req.headers.host} + 'confirmation/${token.token}' </a></p></body>`,
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
    const user = await User.findOne({ email: req.body.email });

    if (!user.isVerified)
      return res.status(401).send({
        type: "not-verified",
        msg: "Your account has not been verified.",
      });

    const { email, password } = req.body;
    authenticate({ email, password })
      .then(({ refreshToken, ...user }) => {
        setTokenCookie(res, refreshToken);
        res.json(user);
      })
      .catch(next);
  }
);

/**
 * @method - POST
 * @param - /refresh-token
 * @description - Refresh Token
 */
router.post(
  "/refresh-token",
  (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.refreshToken;
    refreshToken({ token })
      .then(({ refreshToken, ...user }) => {
        setTokenCookie(res, refreshToken);
        res.json(user);
      })
      .catch(next);
  }
);

/**
 * @method - POST
 * @param - /verify-token
 * @description - Verify Token
 */
router.post(
  "/verify-token",
  [
    check("email", "Email is not valid").isEmail(),
    check("email", "Email cannot be blank").notEmpty(),
    check("token", "Token cannot be blank").notEmpty(),
  ],
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    // Find a matching token
    Token.findOne({ token: req.body.token }, function (err: any, token: any) {
      if (!token)
        return res.status(400).send({
          type: "not-verified",
          msg: "We were unable to find a valid token. Your token may have expired.",
        });

      // If we found a token, find a matching user
      User.findOne(
        { _id: token._userId, email: req.body.email },
        function (err: any, user: any) {
          if (!user)
            return res
              .status(400)
              .send({ msg: "We were unable to find a user for this token." });
          if (user.isVerified)
            return res.status(400).send({
              type: "already-verified",
              msg: "This user has already been verified.",
            });

          // Verify and save the user
          user.isVerified = true;
          user.save(function (err: any) {
            if (err) {
              return res.status(500).send({ msg: err.message });
            }
            res
              .status(200)
              .send("The account has been verified. Please log in.");
          });
        }
      );
    });
  }
);

/**
 * @method - POST
 * @param - /forgot-password
 * @description - Forgot Password
 */

router.post(
  "/forgot-password",
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
    } catch (error) { }
  }
);

module.exports = router;
