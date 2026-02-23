import mongoose from 'mongoose';

export interface IUserDoc extends mongoose.Document {
  email: string;
  name?: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
}

const userSchema = new mongoose.Schema<IUserDoc>(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: false },
    role: { type: String, required: true, default: 'user' },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: false }
);

export const UserModel = mongoose.model<IUserDoc>('User', userSchema);
