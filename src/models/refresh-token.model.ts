import mongoose from "mongoose";
const Schema = mongoose.Schema;

export interface IRefreshToken extends mongoose.Document {
  user: any;
  token: string;
  expires: any;
  created: any;
  revoked: any;
  replacedByToken: string;
  isActive: boolean
  isExpired: any
}

const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  token: String,
  expires: Date,
  created: { type: Date, default: Date.now },
  revoked: Date,
  replacedByToken: String,
});

schema.virtual("isExpired").get(function (this: any) {
  return Date.now() >= this.expires;
});

schema.virtual("isActive").get(function (this: any) {
  return !this.revoked && !this.isExpired;
});

schema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc: any, ret: any) {
    // remove these props when object is serialized
    delete ret._id;
    delete ret.id;
    delete ret.user;
  },
});

const RefreshToken = mongoose.model<IRefreshToken>("RefreshToken", schema);
export default RefreshToken;
