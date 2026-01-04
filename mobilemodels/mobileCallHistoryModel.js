// mobilemodels/mobileCallHistoryModel.js

import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

// Point to 'mobilebackend' database using useDb
const mobileDb = mongoose.connection.useDb('mobilebackend');

const mobileCallHistorySchema = new mongoose.Schema({
  callId: {
    type: String,
    default: () => nanoid(12),
    unique: true,
    index: true
  },
  channelName: {
    type: String,
    required: [true, 'Channel name is required'],
    trim: true
  },
  
  // Web caller info
  callerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Caller ID is required'],
    index: true
  },
  callerEmail: {
    type: String,
    trim: true
  },
  callerName: {
    type: String,
    trim: true
  },
  
  // Mobile callee info
  calleeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Callee ID is required'],
    index: true
  },
  calleeEmail: {
    type: String,
    trim: true
  },
  calleeName: {
    type: String,
    trim: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'ringing', 'accepted', 'rejected', 'missed', 'ended', 'failed'],
    default: 'pending',
    index: true
  },
  
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number,
    default: 0
  },
  
  // Tokens stored for reconnection
  callerToken: {
    type: String,
    default: null,
    select: false
  },
  calleeToken: {
    type: String,
    default: null,
    select: false
  },
  
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Compound indexes
mobileCallHistorySchema.index({ callerId: 1, createdAt: -1 });
mobileCallHistorySchema.index({ calleeId: 1, createdAt: -1 });
mobileCallHistorySchema.index({ status: 1, createdAt: -1 });

// Pre-save hook to calculate duration
mobileCallHistorySchema.pre('save', function(next) {
  if (this.startTime && this.endTime && !this.duration) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
  next();
});

// Get call history for web caller
mobileCallHistorySchema.statics.getWebCallerHistory = function(callerId, options = {}) {
  const { limit = 50, skip = 0 } = options;
  return this.find({ callerId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-callerToken -calleeToken');
};

// Get call history for mobile user
mobileCallHistorySchema.statics.getMobileUserHistory = function(calleeId, options = {}) {
  const { limit = 50, skip = 0 } = options;
  return this.find({ calleeId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-callerToken -calleeToken');
};

// Get active call
mobileCallHistorySchema.statics.getActiveCall = function(callId) {
  return this.findOne({
    callId,
    status: { $in: ['pending', 'ringing', 'accepted'] }
  });
};

// Instance methods
mobileCallHistorySchema.methods.endCall = async function() {
  this.status = 'ended';
  this.endTime = new Date();
  if (this.startTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
  return this.save();
};

mobileCallHistorySchema.methods.acceptCall = async function() {
  this.status = 'accepted';
  this.startTime = new Date();
  return this.save();
};

mobileCallHistorySchema.methods.rejectCall = async function() {
  this.status = 'rejected';
  this.endTime = new Date();
  return this.save();
};

mobileCallHistorySchema.methods.missCall = async function() {
  this.status = 'missed';
  this.endTime = new Date();
  return this.save();
};

const mobileCallHistoryModel = mobileDb.model('MobileCallHistory', mobileCallHistorySchema, 'mobilecallhistorymodel');
//                                             ^ model name         ^ schema                 ^ collection name

export default mobileCallHistoryModel;

