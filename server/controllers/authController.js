import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Helper to generate JWT
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'crickpulse_super_secret_jwt_key_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (player or admin)
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { username, email, password, role, city, bio, profileImage } = req.body;

    // Required fields validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Check for existing user by email or username
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { username: username.trim() },
      ],
    });

    if (existingUser) {
      const isEmailConflict = existingUser.email.toLowerCase() === email.toLowerCase().trim();
      return res.status(400).json({
        success: false,
        message: isEmailConflict
          ? 'An account with this email address already exists.'
          : 'This username is already taken. Please choose another one.',
      });
    }

    // Create user
    const newUser = await User.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role === 'admin' ? 'admin' : 'player',
      city: city ? city.trim() : '',
      bio: bio ? bio.trim() : '',
      profileImage: profileImage || '',
    });

    // Generate JWT
    const token = generateToken(newUser._id, newUser.role);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: newUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & return JWT token
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check account status
    if (user.status === 'disabled') {
      return res.status(403).json({
        success: false,
        message: 'Account disabled: Your account has been suspended by an administrator.',
      });
    }

    // Generate JWT
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private (Requires authMiddleware)
 */
export const getMe = async (req, res, next) => {
  try {
    // req.user is set by authMiddleware
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/auth/me
 * @desc    Update current authenticated user's account info (username, email, profileImage)
 * @access  Private (Requires authMiddleware)
 */
export const updateMe = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { username, email, profileImage } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    // Validate username if provided
    if (username !== undefined) {
      const trimmedUsername = username.trim();
      if (!trimmedUsername || trimmedUsername.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Username must be at least 3 characters long.',
        });
      }
      if (trimmedUsername.length > 30) {
        return res.status(400).json({
          success: false,
          message: 'Username cannot exceed 30 characters.',
        });
      }

      // Check uniqueness against other users
      const existingUser = await User.findOne({
        username: trimmedUsername,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'This username is already taken. Please choose another one.',
        });
      }
      user.username = trimmedUsername;
    }

    // Validate email if provided
    if (email !== undefined) {
      const trimmedEmail = email.toLowerCase().trim();
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address.',
        });
      }

      // Check uniqueness against other users
      const existingEmail = await User.findOne({
        email: trimmedEmail,
        _id: { $ne: userId },
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
      }
      user.email = trimmedEmail;
    }

    if (profileImage !== undefined) {
      user.profileImage = profileImage;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account updated successfully.',
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change password for authenticated user
 * @access  Private (Requires authMiddleware)
 */
export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current password and new password.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    // Set new password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};
