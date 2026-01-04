// webcontrollers/webAuthController.js

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import webUserModel from '../webmodels/webUserModel.js';
import webTransporter from '../webconfig/webNodeMailer.js';
import { generateWebToken, setAuthCookie, clearAuthCookie } from '../webmiddleware/webUserAuth.js';

dotenv.config();

//-------------------------------------------------------------------------------------
// Register controller
//-------------------------------------------------------------------------------------

export const register = async (req, res) => {
  console.log('Register request body:', req.body);
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const existingUser = await webUserModel.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newWebUser = new webUserModel({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    await newWebUser.save();

    const token = generateWebToken(newWebUser._id);
    setAuthCookie(res, token);

    // Send welcome email
    try {
      const mailOptions = {
        from: process.env.SENDER_EMAIL || process.env.EMAIL_FROM,
        to: newWebUser.email,
        subject: 'Welcome to VidCall!',
        html: `<p>Hello ${newWebUser.name},</p>
               <p>Thank you for registering at VidCall! We're excited to have you on board.</p>
               <p>Best regards,<br>The VidCall Team</p>`
      };
      await webTransporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    return res.status(201).json({ 
      success: true,
      message: 'User registered successfully', 
      user: { 
        userId: newWebUser._id, 
        userNanoId: newWebUser.userNanoId,
        name: newWebUser.name, 
        email: newWebUser.email 
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

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const user = await webUserModel.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateWebToken(user._id);
    setAuthCookie(res, token);

    user.lastLogin = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: { 
        userId: user._id, 
        userNanoId: user.userNanoId,
        name: user.name, 
        email: user.email,
        isAccountVerified: user.isAccountVerified
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

//-------------------------------------------------------------------------------------
// Logout controller
//-------------------------------------------------------------------------------------

export const logout = async (req, res) => {
  try {
    clearAuthCookie(res);
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error during logout:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

//-------------------------------------------------------------------------------------
// Send verification OTP controller
//-------------------------------------------------------------------------------------

export const sendVerifyOtp = async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID is required' });
  }

  try {
    const user = await webUserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.isAccountVerified === true) {
      return res.status(400).json({ success: false, message: 'Account already verified' });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP to user and its expiration time 
    user.verifyOtp = otp;
    user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send OTP via email
    try {
      const mailOptions = {
        from: process.env.SENDER_EMAIL || process.env.EMAIL_FROM,
        to: user.email,
        subject: 'VidCall - Your Verification OTP',
        html: `<p>Hello ${user.name},</p>
               <p>Your OTP for email verification is: <b>${otp}</b></p>
               <p>This OTP is valid for 10 minutes.</p>
               <p>If you did not request this, please ignore this email.</p>
               <br/>
               <p>Best regards,<br/>The VidCall Team</p>`
      };
      await webTransporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      return res.status(500).json({ success: false, message: 'Failed to send OTP email' });
    }

    return res.status(200).json({ success: true, message: 'OTP sent to your email address' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

//-------------------------------------------------------------------------------------
// Verify email controller
//-------------------------------------------------------------------------------------

export const verifyEmail = async (req, res) => {
  const userId = req.user?._id;
  const { otp } = req.body;

  if (!userId || !otp) {
    return res.status(400).json({ success: false, message: 'User ID and OTP are required' });
  }

  try {
    const user = await webUserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.isAccountVerified === true) {
      return res.status(400).json({ success: false, message: 'Account already verified' });
    }
    if (user.verifyOtp === '' || user.verifyOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    if (Date.now() > user.verifyOtpExpireAt) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }
    
    user.isAccountVerified = true;
    user.verifyOtp = '';
    user.verifyOtpExpireAt = 0;
    await user.save();

    return res.status(200).json({ 
      success: true, 
      message: 'Email verified successfully',
      user: { 
        userId: user._id, 
        userNanoId: user.userNanoId,
        name: user.name, 
        email: user.email,
        isAccountVerified: user.isAccountVerified
      }
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

//-------------------------------------------------------------------------------------
// Is authenticated controller - check if user is authenticated
//------------------------------------------------------------------------------------- 

export const isAuthenticated = async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  try {
    return res.status(200).json({ 
      success: true,
      message: 'User is authenticated',
      user: {
        userId: user._id,
        userNanoId: user.userNanoId,
        name: user.name,
        email: user.email,
        isAccountVerified: user.isAccountVerified
      }
    });
  } catch (error) {
    console.error('Error checking authentication:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

//-------------------------------------------------------------------------------------
// Send reset OTP controller
//------------------------------------------------------------------------------------- 

export const sendResetOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'A proper email is required' });
  }

  try {
    const user = await webUserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP to user and its expiration time 
    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send OTP via email
    try {
      const mailOptions = {
        from: process.env.SENDER_EMAIL || process.env.EMAIL_FROM,
        to: user.email,
        subject: 'VidCall - Your Password Reset OTP',
        html: `<p>Hello ${user.name},</p>
               <p>Your OTP for password reset is: <b>${otp}</b></p>
               <p>This OTP is valid for 10 minutes.</p>
               <p>If you did not request this, please ignore this email.</p>
               <br/>
               <p>Best regards,<br/>The VidCall Team</p>`
      };
      await webTransporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      return res.status(500).json({ success: false, message: 'Failed to send OTP email' });
    }

    return res.status(200).json({ success: true, message: 'OTP sent to your email address' });
  } catch (error) {
    console.error('Error sending reset OTP:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

//-------------------------------------------------------------------------------------
// Reset password controller
//-------------------------------------------------------------------------------------

export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
  }

  try {
    const user = await webUserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.resetOtp === '' || user.resetOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    if (Date.now() > user.resetOtpExpireAt) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    user.password = hashedPassword;
    user.resetOtp = '';
    user.resetOtpExpireAt = 0;
    await user.save();
    
    return res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

//-----------------------------------------------------------------------------------
// Get user data controller
//-----------------------------------------------------------------------------------

export const getUserData = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'User data retrieved successfully', 
      userData: {
        userId: user._id,
        userNanoId: user.userNanoId,
        name: user.name,
        email: user.email,
        isAccountVerified: user.isAccountVerified,
      }
    });
  } catch (error) {
    console.error('Error in getUserData:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Aliases for compatibility
export const getProfile = getUserData;
export const updateProfile = async (req, res) => {
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

export const forgotPassword = sendResetOtp;

