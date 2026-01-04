// webmodels/webUserModel.js

import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

// Point to 'webbackend' database using useDb
const webDb = mongoose.connection.useDb('webbackend');

const webUserSchema = new mongoose.Schema({
  userNanoId: {
    type: String,
    default: () => nanoid(10),
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  
  // Email verification OTP
  verifyOtp: {
    type: String,
    default: ''
  },
  verifyOtpExpireAt: {
    type: Number,
    default: 0
  },
  isAccountVerified: {
    type: Boolean,
    default: false
  },
  
  // Password reset OTP
  resetOtp: {
    type: String,
    default: ''
  },
  resetOtpExpireAt: {
    type: Number,
    default: 0
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Static method to find by email
webUserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Instance method to get public profile
webUserSchema.methods.toPublicJSON = function() {
  return {
    userId: this._id,
    userNanoId: this.userNanoId,
    name: this.name,
    email: this.email,
    isAccountVerified: this.isAccountVerified,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const webUserModel = webDb.model('WebUser', webUserSchema, 'webusermodel');
//                                ^ model name ^ schema     ^ collection name in MongoDB

export default webUserModel;

