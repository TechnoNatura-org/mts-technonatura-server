import { Schema, Model, Document, model, Types, Query } from 'mongoose';
import * as Validator from 'validator';
import * as bcrypt from 'bcrypt';

const {
  default: { isEmail, isURL },
} = Validator;

interface SocialMedia {
  name: string;
  url: string;
}

export interface contactInterface {
  email: string;
  name: string;
  message: string;
}

export interface UserBaseDocument extends contactInterface, Document {}

// Export this for strong typing
export interface ContactDocument extends UserBaseDocument {}

// For model
export interface contactModel extends Model<UserBaseDocument> {}

const contactSchema = new Schema<ContactDocument, contactModel>({
  email: {
    type: String,
    required: [true, 'Please enter an email'],
    lowercase: true,
    unique: true,
    validate: [isEmail, 'Please enter a valid email'],
  },
  name: {
    type: String,
    required: [true, 'Please enter your name'],
    validate: [validateUsername, 'Only characters and numbers are allowed'],
    minlength: [4, 'Minimum name length is 4 characters'],
  },
  message: {
    type: String,
    required: [true, 'Message Cannot Blank'],
    minlength: [10, 'Too short'],
    maxLength: [500, 'Too Long'],
  },
});

function validateUsername(str: string) {
  if (!str.match(/^[a-zA-Z0-9]+$/)) {
    return false;
  }

  return true;
}

export default model<ContactDocument, contactModel>('Contact', contactSchema);