import express, { NextFunction, Request, Response } from "express";
import { check } from "express-validator";
import bcrypt from "bcrypt";

import {
  authenticate, generateOTP, expiresIn, verifyUserToken,
  getUserWithEmail, generateAuthToken, validateInput, signupValidation,
  VerifyEmailvalidation, validateEmail, createVerificationTokenFor, getVerifiedUserWith,
  validateLoginInput, validateTokenInput, validateResetToken, sendMail,
  successMessage, validateUserIsLogin, errorMessage, assertNotVerified, validateUserEmail,
  isTokenExpired, authUserDetails,generateAuthRefreshToken
} from "../config/user.service";


import { v4 as uuidv4 } from 'uuid';
import UserClient from '../hasura/user_client';
import { verifyToken } from '../utils/validate-token';
import { ONE_TIME_PASSWORD_TOKEN_LENGTH, TOKEN_EXPIRED_IN, MAIL_FROM } from "../config/settings";
const router = express.Router();

type signUpRequest = {
  fullname: string
  email: string
  phone: string
  password: string
}
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
    let signupRequestBody: signUpRequest = req.body;
    const user_type: string = "user"
    const user_id: string = uuidv4()
    const isVerified = false

    const salt = await bcrypt.genSalt(10);
    signupRequestBody.password = await bcrypt.hash(signupRequestBody.password, salt);
    signupRequestBody.email = signupRequestBody.email.toLowerCase()
    const pin = generateOTP(ONE_TIME_PASSWORD_TOKEN_LENGTH)
    const expires = expiresIn(TOKEN_EXPIRED_IN)
    const { email, password, phone, fullname } = signupRequestBody
    const user = await HasuraUser.save({
      email, password, phone, fullname, user_type, user_id, isVerified, pin, expires
    });
    // might needs to move this to another endpoint to be trigger by hasura event
    await sendMail({
      to: email,
      from: MAIL_FROM,
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
 * @method  POST
 * @param - /create-token
 * @description - Create token after signup
 */
router.post("/create-token",
  validateEmail,
  async (req: any, res: Response) => {
    try{
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
        
    }catch(err:any){
      const {  error, status_code } = err
      return errorMessage({ msg:"user already verified", error }, res, 401)

      
    }
    
  })

/**
 * @method  POST
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
    // try {
      const { email, password } = req.body;
      const user = await getVerifiedUserWith(email.toLowerCase())
      if (!user) {
        return res.json({ error: "Invalid Login credetial", msg: "Email or Password incorrect" }).status(401)
      }
      const authenticated = await authenticate({  password }, user)
      if (!authenticated) {
        return res.json({ error: "Invalid Login credetial", msg: "Email or Password incorrect" }).status(401)
      }
      
      return res.status(200).json(authenticated)

    // } catch {
    //   return res.json({ error: "Invalid Login credetial", msg: "Email or Password incorrect" }).status(401)
    // }

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
    // console.log(user_id)
    await validateResetToken(token, user_id)
      .then(async validated => {
        // console.log("found")
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

/**
 * @method - POST
 * @description - refeshToken 
 */

 router.post("/auth/refresh", async (req: Request, res: Response) => {
  let { refreshToken } = req.body;
  if (refreshToken == null) {
    return res.json({ error: "validation error", msg: "refreshToken is required" })
  }

  const foundUserOrError = await UserClient
    .getInstance()
    .getRefreshTokenWith(refreshToken)

  console.log(foundUserOrError);

  if (!foundUserOrError) {
    return res.json({ error: "refresh token not found", msg: "refresh token not found please login to generate refresh token" })
  }
  const { user, expire_at } = foundUserOrError
  const hasExpired = isTokenExpired(expire_at)

  if (hasExpired == true) {
    // delete the toke and has the user to login again
    await UserClient.getInstance().deleteRefreshToken(user.user_id)
    return res
      .json({ msg: "refresh token has expired please login to generare a new login token", error: "expired token" })
      .status(401)

  }
  const { user_id } = user
  // rotate token to improve token credibility, keep the token expiration
  refreshToken = await generateAuthRefreshToken()
  await UserClient.getInstance().updateRefreshTokenFor(user_id, refreshToken)
  return res.json(authUserDetails(user, refreshToken))


});



// module.exports = router;
export default router