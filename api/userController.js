const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

// Get database instance
const db = require('../models');

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * User authentication and management controller
 */
const userController = {
  /**
   * User registration - Create new user
   * POST /api/users/register
   */
  async registerUser(req, res) {
    try {
      const { 
        phoneNumber, 
        email, 
        password, 
        fullName,
        userType = 'customer', // Default to customer
        telegramId,
        whatsappNumber,
        preferredAlertMethod
      } = req.body;

      // Validation
      if (!phoneNumber || !password) {
        return res.status(400).json({
          success: false,
          error: 'Phone number and password are required'
        });
      }

      if (!['customer', 'staff'].includes(userType)) {
        return res.status(400).json({
          success: false,
          error: 'User type must be either "customer" or "staff"'
        });
      }

      // Check if user already exists
      const existingUser = await db.User.findOne({
        where: {
          [Op.or]: [
            { phoneNumber },
            ...(email ? [{ email }] : [])
          ]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'User with this phone number or email already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await db.User.create({
        phoneNumber,
        email,
        password: hashedPassword,
        fullName,
        userType, // Add user type
        role: userType === 'staff' ? 'admin' : 'user', // Set role based on user type
        telegramId,
        whatsappNumber,
        preferredAlertMethod
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: newUser.id, 
          userType: newUser.userType,
          role: newUser.role 
        }, 
        JWT_SECRET, 
        { expiresIn: '24h' }
      );

      // Return user data (exclude password)
      const userResponse = {
        id: newUser.id,
        phoneNumber: newUser.phoneNumber,
        email: newUser.email,
        fullName: newUser.fullName,
        userType: newUser.userType,
        role: newUser.role,
        telegramId: newUser.telegramId,
        whatsappNumber: newUser.whatsappNumber,
        preferredAlertMethod: newUser.preferredAlertMethod,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      };

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: userResponse,
          token
        }
      });
    } catch (error) {
      console.error('User registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during registration'
      });
    }
  },

  /**
   * User login
   * POST /api/users/login
   */
  async loginUser(req, res) {
    try {
      const { phoneNumber, password } = req.body;

      // Validation
      if (!phoneNumber || !password) {
        return res.status(400).json({
          success: false,
          error: 'Phone number and password are required'
        });
      }

      // Find user
      const user = await db.User.findOne({ 
        where: { phoneNumber } 
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          userType: user.userType,
          role: user.role 
        }, 
        JWT_SECRET, 
        { expiresIn: '24h' }
      );

      // Return user data (exclude password)
      const userResponse = {
        id: user.id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        fullName: user.fullName,
        userType: user.userType,
        role: user.role,
        telegramId: user.telegramId,
        whatsappNumber: user.whatsappNumber,
        preferredAlertMethod: user.preferredAlertMethod,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          token
        }
      });
    } catch (error) {
      console.error('User login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during login'
      });
    }
  },

  async loginAdmin(req, res) {
    try {
      const { email, password } = req.body
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' })
      }
      const user = await db.User.findOne({ where: { email } })
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: 'Invalid credentials' })
      }
      const isMatch = await bcrypt.compare(password, user.password)
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' })
      }
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' })
      res.json({ token })
    } catch (error) {
      res.status(500).json({ message: 'Server error' })
    }
  },

  /**
   * Get all users with optional filtering
   * GET /api/users
   */
  async getAllUsers(req, res) {
    try {
      const { userType, role, status = 'active' } = req.query;
      
      const whereClause = {};
      if (userType) whereClause.userType = userType;
      if (role) whereClause.role = role;
      if (status) whereClause.status = status;

      const users = await db.User.findAll({
        where: whereClause,
        attributes: { exclude: ['password'] }, // Exclude password from response
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: users,
        count: users.length
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching users'
      });
    }
  },

  /**
   * Get single user by ID
   * GET /api/users/:id
   */
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await db.User.findByPk(id, {
        attributes: { exclude: ['password'] } // Exclude password from response
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching user'
      });
    }
  },

  /**
   * Update user
   * PUT /api/users/:id
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { 
        email, 
        fullName, 
        userType, 
        role,
        telegramId,
        whatsappNumber,
        preferredAlertMethod,
        status 
      } = req.body;

      // Find user
      const user = await db.User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Validate user type if provided
      if (userType && !['customer', 'staff'].includes(userType)) {
        return res.status(400).json({
          success: false,
          error: 'User type must be either "customer" or "staff"'
        });
      }

      // Update user data
      if (email !== undefined) user.email = email;
      if (fullName !== undefined) user.fullName = fullName;
      if (userType !== undefined) {
        user.userType = userType;
        user.role = userType === 'staff' ? 'admin' : 'user'; // Auto-update role based on user type
      }
      if (role !== undefined) user.role = role;
      if (telegramId !== undefined) user.telegramId = telegramId;
      if (whatsappNumber !== undefined) user.whatsappNumber = whatsappNumber;
      if (preferredAlertMethod !== undefined) user.preferredAlertMethod = preferredAlertMethod;
      if (status !== undefined) user.status = status;

      await user.save();

      // Return updated user data (exclude password)
      const userResponse = {
        id: user.id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        fullName: user.fullName,
        userType: user.userType,
        role: user.role,
        telegramId: user.telegramId,
        whatsappNumber: user.whatsappNumber,
        preferredAlertMethod: user.preferredAlertMethod,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      res.json({
        success: true,
        message: 'User updated successfully',
        data: userResponse
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while updating user'
      });
    }
  },

  /**
   * Delete user
   * DELETE /api/users/:id
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const user = await db.User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      await user.destroy();

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while deleting user'
      });
    }
  },

  /**
   * Change user password
   * PUT /api/users/:id/change-password
   */
  async changePassword(req, res) {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;

      // Validation
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters long'
        });
      }

      const user = await db.User.findByPk(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      // Hash and update new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedNewPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while changing password'
      });
    }
  },

  /**
   * Get user statistics
   * GET /api/users/stats
   */
  async getUserStats(req, res) {
    try {
      const totalUsers = await db.User.count();
      const customerUsers = await db.User.count({ where: { userType: 'customer' } });
      const staffUsers = await db.User.count({ where: { userType: 'staff' } });
      const activeUsers = await db.User.count({ where: { status: 'active' } });

      const recentUsers = await db.User.findAll({
        where: { userType: 'customer' },
        order: [['createdAt', 'DESC']],
        limit: 5,
        attributes: ['id', 'fullName', 'phoneNumber', 'email', 'createdAt']
      });

      res.json({
        success: true,
        data: {
          totalUsers,
          customerUsers,
          staffUsers,
          activeUsers,
          recentUsers
        }
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching user statistics'
      });
    }
  }
};

module.exports = {
  userController
};
