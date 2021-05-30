import mongoose from "mongoose";

const Schema = mongoose.Schema;

export interface IUser extends mongoose.Document {
  fullname: string;
  email: string;
  phonenumber: string;
  password: string;
  isVerified: boolean;
  passwordResetToken: string;
  passwordResetExpires: any;
}

const userSchema = new Schema({
  fullname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phonenumber: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const User = mongoose.model<IUser>("User", userSchema);
export default User;
