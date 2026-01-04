// mobilemodels/mobileUserModel.js

import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

// Point to 'mobilebackend' database using useDb
const mobileDb = mongoose.connection.useDb('mobilebackend');

const mobileUserSchema = new mongoose.Schema({
  mobileUserNanoId: {
    type: String,
    default: () => nanoid(10),
    unique: true,
    required: true
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
  
  // Push notification token (Expo)
  expoPushToken: {
    type: String,
    required: false,
    default: null
  },
  
  // Device info
  platform: {
    type: String,
    enum: ['ios', 'android', null],
    lowercase: true,
    default: null
  },
  
  // Online status
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  
  // OTP for password reset
  otp: {
    type: String,
    default: ''
  },
  otpExpiry: {
    type: Number,
    default: 0
  },
  
  // Refresh token for mobile auth
  refreshToken: {
    type: String,
    default: null
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

// Indexes for performance
mobileUserSchema.index({ expoPushToken: 1 });
mobileUserSchema.index({ isOnline: 1 });

// Static method to find by email
mobileUserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find online users
mobileUserSchema.statics.findOnlineUsers = function() {
  return this.find({ isOnline: true, expoPushToken: { $ne: null } })
    .select('-password -refreshToken');
};

// Static method to find callable users (have push token and active)
mobileUserSchema.statics.findCallableUsers = function() {
  return this.find({ 
    expoPushToken: { $ne: null },
    isActive: true 
  }).select('mobileUserNanoId name email isOnline lastSeen');
};

// Instance method to set online status
mobileUserSchema.methods.setOnlineStatus = async function(isOnline) {
  this.isOnline = isOnline;
  this.lastSeen = new Date();
  return this.save();
};

// Instance method to register device token
mobileUserSchema.methods.registerDevice = async function(expoPushToken, platform) {
  this.expoPushToken = expoPushToken;
  this.platform = platform;
  return this.save();
};

// Instance method to get public profile
mobileUserSchema.methods.toPublicJSON = function() {
  return {
    mobileUserId: this._id,
    mobileUserNanoId: this.mobileUserNanoId,
    name: this.name,
    email: this.email,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const mobileUserModel = mobileDb.model('MobileUser', mobileUserSchema, 'mobileusermodel');
//                                    ^ model name   ^ schema         ^ collection name in MongoDB

export default mobileUserModel;

