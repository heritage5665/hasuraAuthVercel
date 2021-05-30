const config = require("../config/config.json");
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
const crypto = require("crypto");
import { db } from "./db";

interface Authenticate {
  email: string;
  password: string;
}

interface Token {
  token: string;
}

export async function getRefreshToken(token: string) {
  const refreshToken = await db.RefreshToken.findOne({ token }).populate(
    "user"
  );
  if (!refreshToken || !refreshToken.isActive) throw "Invalid token";
  return refreshToken;
}

export function generateJwtToken(user: any) {
  return jwt.sign({ sub: user.id, id: user.id }, config.secret, {
    expiresIn: "15m",
  });
}

export function generateRefreshToken(user: any) {
  // create a refresh token that expires in 7 days
  return new db.RefreshToken({
    user: user.id,
    token: randomTokenString(),
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

function randomTokenString() {
  return crypto.randomBytes(40).toString("hex");
}

export function basicDetails(user: any) {
  const { id, fullname, email } = user;
  return { id, fullname, email };
}

export async function authenticate({ email, password }: Authenticate) {
  const user = await db.User.findOne({ email });
  

  if (!user || !bcrypt.compareSync(password, user.password)) {
    throw "Username or password is incorrect";
  }

  const jwtToken = generateJwtToken(user);
  const refreshToken = generateRefreshToken(user);

  // save refresh token
  await refreshToken.save();

  return {
    ...basicDetails(user),
    jwtToken,
    refreshToken: refreshToken.token,
  };
}

export async function refreshToken({ token }: Token) {
  const refreshToken = await getRefreshToken(token);
  const { user } = refreshToken;

  // replace old refresh token with a new one and save
  const newRefreshToken = generateRefreshToken(user);
  refreshToken.revoked = Date.now();
  refreshToken.replacedByToken = newRefreshToken.token;
  await refreshToken.save();
  await newRefreshToken.save();

  // generate new jwt
  const jwtToken = generateJwtToken(user);

  // return basic details and tokens
  return {
    ...basicDetails(user),
    jwtToken,
    refreshToken: newRefreshToken.token,
  };
}

export async function revokeToken({ token }: Token) {
  const refreshToken = await getRefreshToken(token);

  // revoke token and save
  refreshToken.revoked = Date.now();
  await refreshToken.save();
}

export async function getById(id: string) {
  const user = await getUser(id);
  return basicDetails(user);
}

export async function getRefreshTokens(userId: string) {
  // check that user exists
  await getUser(userId);

  // return refresh tokens for user
  const refreshTokens = await db.RefreshToken.find({ user: userId });
  return refreshTokens;
}

// helper functions

export async function getUser(id: string) {
  if (!db.isValidId(id)) throw "User not found";
  const user = await db.User.findById(id);
  if (!user) throw "User not found";
  return user;
}
