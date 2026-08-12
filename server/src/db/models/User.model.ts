import mongoose from 'mongoose';

export interface IUserDoc extends mongoose.Document {
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  accountType?: 'personal' | 'business';
  birthDate?: Date;
  companyName?: string;
  inn?: string;
  avatarUrl?: string;
  companyDocumentUrl?: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
}

const userSchema = new mongoose.Schema<IUserDoc>(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: false },
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
    accountType: { type: String, required: false, enum: ['personal', 'business'] },
    birthDate: { type: Date, required: false },
    companyName: { type: String, required: false },
    inn: { type: String, required: false },
    avatarUrl: { type: String, required: false },
    companyDocumentUrl: { type: String, required: false },
    role: { type: String, required: true, default: 'user' },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: false }
);

export const UserModel = mongoose.model<IUserDoc>('User', userSchema);
