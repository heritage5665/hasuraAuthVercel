const config = require("../config/config.json");
import mongoose from "mongoose";
import RefreshToken from "../models/refresh-token.model";
import User from "../models/user.model";

const connectionOptions = {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
};

mongoose.connect(
  process.env.MONGODB_URI || config.connectionString,
  connectionOptions
);
mongoose.Promise = global.Promise;

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export const db = {
  User: User,
  RefreshToken: RefreshToken,
  isValidId,
};
