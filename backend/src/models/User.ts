import mongoose, { Model, Schema, model } from "mongoose";

interface UserDocument {
  externalId: string;
  email: string | null;
  name: string | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    externalId: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: null },
    name: { type: String, default: null },
    image: { type: String, default: null },
  },
  { timestamps: true },
);

export const User = (mongoose.models.User as Model<UserDocument> | undefined) ?? model<UserDocument>("User", userSchema);