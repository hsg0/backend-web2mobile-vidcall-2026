// mobilecontrollers/mobileAuthController.js

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import mobileUserModel from '../mobilemodels/mobileUserModel.js';
import mobileTransporter from '../mobileconfig/mobileNodeMailer.js';
import { blacklistToken } from '../mobileconfig/mobileTokenBlacklist.js';
import { 
  generateMobileToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} from '../mobilemiddleware/mobileUserAuth.js';

dotenv.config();

//-------------------------------------------------------------------------------------
// Register controller
//-------------------------------------------------------------------------------------

export const mobileRegisterUser = async (req, res) => {
  console.log('Register request body:', req.body);
  const { name, email, password, expoPushToken } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const existingUser = await mobileUserModel.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newMobileUser = new mobileUserModel({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      expoPushToken: expoPushToken || null
    });

    await newMobileUser.save();

    // Send welcome email
    try {
      const mailOptions = {
        from: process.env.MOBILE_SENDER_EMAIL || process.env.EMAIL_FROM,
        to: newMobileUser.email,
        subject: 'Welcome to VidCall!',
        html: `<p>Hello ${newMobileUser.name},</p>
               <p>Thank you for registering at VidCall! We're excited to have you on board.</p>
               <p>Best regards,<br>The VidCall Team</p>`
      };
      await mobileTransporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        mobileUserId: newMobileUser._id,
        mobileUserNanoId: newMobileUser.mobileUserNanoId,
        name: newMobileUser.name,
        email: newMobileUser.email,
      }
    });
  } catch (error) {
    console.error('Error during registration:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

//-------------------------------------------------------------------------------------
// Login controller
//-------------------------------------------------------------------------------------

export const mobileLoginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const user = await mobileUserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateMobileToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token and update login time
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    user.isOnline = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        mobileUserId: user._id,
        mobileUserNanoId: user.mobileUserNanoId,
        name: user.name,
        email: user.email,
      },
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

//-------------------------------------------------------------------------------------
// Logout controller
//-------------------------------------------------------------------------------------

export const mobileLogoutUser = async (req, res) => {
  try {
    // Prefer Authorization header: "Bearer <token>"
    const auth = req.headers.authorization || '';
    let token = '';
    if (auth.startsWith('Bearer ')) {
      token = auth.slice(7);
    }

    if (!token) {
      // Idempotent logout: succeed even if no token provided
      return res.status(200).json({ success: true, message: 'Logged out' });
    }

    // Try to decode to get exp. If invalid, still treat as logged out
    let expSeconds = undefined;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expSeconds = decoded && decoded.exp ? decoded.exp : undefined;
    } catch (e) {
      // If token is already expired/invalid, proceed without exp
    }

    // Blacklist the token so it cannot be used again
    blacklistToken(token, expSeconds);

    // Update user status if we have the user
    if (req.user) {
      req.user.refreshToken = null;
      req.user.isOnline = false;
      req.user.lastSeen = new Date();
      await req.user.save();
    }

    return res.status(200).json({ success: true, message: 'Logged out' });
  } catch (error) {
    console.error('Error during logout:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

//-------------------------------------------------------------------------------------
// Send password reset OTP controller
//-------------------------------------------------------------------------------------

export const mobileSendResetOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const user = await mobileUserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes
   
    user.otp = otp;
    user.otpExpiry = otpExpires;
    await user.save();

    try {
      const mailOptions = {
        from: process.env.MOBILE_SENDER_EMAIL || process.env.EMAIL_FROM,
        to: user.email,
        subject: 'VidCall - Your Password Reset OTP',
        html: `<p>Hello ${user.name},</p>
               <p>Your OTP for password reset is: <strong>${otp}</strong></p>
               <p>This OTP is valid for 10 minutes.</p>
               <p>If you did not request a password reset, please ignore this email.</p>
               <p>Best regards,<br>The VidCall Team</p>`
      };
      await mobileTransporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      return res.status(500).json({ success: false, message: 'Failed to send OTP email' });
    }

    return res.status(200).json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

//-------------------------------------------------------------------------------------
// Reset password controller
//------------------------------------------------------------------------------------- 

export const mobileResetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
  }

  try {
    const user = await mobileUserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    if (!user.otp || user.otp !== otp || Date.now() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    user.otp = '';
    user.otpExpiry = 0;

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

//-------------------------------------------------------------------------------------
// Get user data controller
//-------------------------------------------------------------------------------------

export const mobileGetUserData = async (req, res) => {
  try {
    // mobileAuth already verified JWT and attached identity
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    return res.status(200).json({
      success: true,
      message: 'Mobile user data retrieved',
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Error fetching mobile user data:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

//-------------------------------------------------------------------------------------
// Refresh token controller
//-------------------------------------------------------------------------------------

export const mobileRefreshToken = async (req, res) => {
  try {
    const { refreshToken: providedToken } = req.body;

    if (!providedToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const user = await verifyRefreshToken(providedToken);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Generate new tokens
    const newToken = generateMobileToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Save new refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token'
    });
  }
};

//-------------------------------------------------------------------------------------
// Update profile controller
//-------------------------------------------------------------------------------------

export const mobileUpdateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const user = req.user;

    if (name !== undefined) user.name = name;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated',
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Export all as named exports
export const register = mobileRegisterUser;
export const login = mobileLoginUser;
export const logout = mobileLogoutUser;
export const getProfile = mobileGetUserData;
export const updateProfile = mobileUpdateProfile;
export const refreshToken = mobileRefreshToken;
export const forgotPassword = mobileSendResetOtp;
export const resetPassword = mobileResetPassword;

