import mongoose from "mongoose";

export interface IToken extends mongoose.Document {
  _userId: any;
  token: string;
  createdAt: any;
}

const tokenSchema = new mongoose.Schema({
  _userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  token: { type: String, required: true },
  createdAt: { type: Date, required: true, default: Date.now, expires: 43200 },
});

const Token = mongoose.model<IToken>("Token", tokenSchema);

export default Token;
