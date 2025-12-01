const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                // If token is invalid, redirect to login
                return res.redirect('/admin/login');
            }
            req.user = user;
            next();
        });
    } else {
        // If no token is provided, redirect to login
        return res.redirect('/admin/login');
    }
};

const userController = (db) => {
    return {
        // User Login
        loginUser: async (req, res) => {
            const { phoneNumber, password } = req.body;

            if (!phoneNumber || !password) {
                return res.status(400).json({ message: 'Phone number and password are required' });
            }

            try {
                const user = await db.User.findOne({ where: { phoneNumber } });

                if (!user) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }

                const isMatch = await bcrypt.compare(password, user.password);

                if (!isMatch) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }

                const token = jwt.sign({ id: user.id, role: user.role || 'user' }, process.env.JWT_SECRET, { expiresIn: '24h' });

                res.json({
                    token,
                    message: 'Login successful',
                    user: {
                        id: user.id,
                        fullName: user.fullName,
                        email: user.email,
                        phoneNumber: user.phoneNumber
                    }
                });
            } catch (error) {
                console.error('User login error:', error);
                res.status(500).json({ message: 'Server error' });
            }
        },

        // User Registration
        registerUser: async (req, res) => {
            const { fullName, email, phoneNumber, password, role } = req.body;

            if (!fullName || !email || !phoneNumber || !password) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            try {
                const existingUser = await db.User.findOne({ where: { phoneNumber } });
                if (existingUser) {
                    return res.status(409).json({ message: 'Phone number already registered' });
                }

                const hashedPassword = await bcrypt.hash(password, 10);

                const newUser = await db.User.create({
                    fullName,
                    email,
                    phoneNumber,
                    password: hashedPassword,
                    role: role || 'user' // Allow specifying role, default to 'user'
                });

                console.log('Role before JWT sign:', role);
                console.log('newUser.role before JWT sign:', newUser.role);

                // Optionally, generate a token for the newly registered user
                const token = jwt.sign({ id: newUser.id, role: role || 'user' }, process.env.JWT_SECRET, { expiresIn: '24h' });

                res.status(201).json({
                    message: 'User registered successfully',
                    token,
                    user: {
                        id: newUser.id,
                        fullName: newUser.fullName,
                        email: newUser.email,
                        phoneNumber: newUser.phoneNumber
                    }
                });
            } catch (error) {
                console.error('User registration error:', error);
                res.status(500).json({ message: 'Server error' });
            }
        },

        // Admin Login
        loginAdmin: async (req, res) => {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: 'Email and password are required' });
            }

            try {
                const user = await db.User.findOne({ where: { email } });

                if (!user || user.role !== 'admin') {
                    return res.status(401).json({ message: 'Invalid credentials or not an admin' });
                }

                const isMatch = await bcrypt.compare(password, user.password);

                if (!isMatch) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }

                const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });

                res.json({
                    token,
                    message: 'Admin login successful',
                    user: {
                        id: user.id,
                        fullName: user.fullName,
                        email: user.email,
                        role: user.role
                    }
                });
            } catch (error) {
                console.error('Admin login error:', error);
                res.status(500).json({ message: 'Server error' });
            }
        },

        // Get all users
        getAllUsers: async (req, res) => {
            try {
                const users = await db.User.findAll({
                    attributes: ['id', 'fullName', 'email', 'phoneNumber', 'role', 'createdAt']
                });
                res.json(users);
            } catch (error) {
                console.error('Error fetching all users:', error);
                res.status(500).json({ message: 'Server error' });
            }
        },

        // Get user stats (e.g., total users, new users today)
        getUserStats: async (req, res) => {
            try {
                const totalUsers = await db.User.count();
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const newUsersToday = await db.User.count({
                    where: {
                        createdAt: { [db.Sequelize.Op.gte]: today }
                    }
                });
                res.json({ totalUsers, newUsersToday });
            } catch (error) {
                console.error('Error fetching user stats:', error);
                res.status(500).json({ message: 'Server error' });
            }
        },

        // Get user by ID
        getUserById: async (req, res) => {
            try {
                const { id } = req.params;
                const user = await db.User.findByPk(id, {
                    attributes: ['id', 'fullName', 'email', 'phoneNumber', 'role', 'createdAt', 'updatedAt']
                });
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }
                res.json(user);
            } catch (error) {
                console.error('Error fetching user by ID:', error);
                res.status(500).json({ message: 'Server error' });
            }
        },

        // Update user
        updateUser: async (req, res) => {
            try {
                const { id } = req.params;
                const { fullName, email, phoneNumber, role } = req.body;
                const user = await db.User.findByPk(id);
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                user.fullName = fullName || user.fullName;
                user.email = email || user.email;
                user.phoneNumber = phoneNumber || user.phoneNumber;
                user.role = role || user.role;
                await user.save();

                res.json({ message: 'User updated successfully', user });
            } catch (error) {
                console.error('Error updating user:', error);
                res.status(500).json({ message: 'Server error' });
            }
        },

        // Delete user
        deleteUser: async (req, res) => {
            try {
                const { id } = req.params;
                const user = await db.User.findByPk(id);
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                await user.destroy();
                res.json({ message: 'User deleted successfully' });
            } catch (error) {
                console.error('Error deleting user:', error);
                res.status(500).json({ message: 'Server error' });
            }
        },

        changePassword: async (req, res) => {
            try {
                const { currentPassword, newPassword } = req.body;
                const user = await db.User.findByPk(req.user.id);
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                const isMatch = await bcrypt.compare(currentPassword, user.password);
                if (!isMatch) {
                    return res.status(400).json({ message: 'Incorrect current password' });
                }

                const hashedPassword = await bcrypt.hash(newPassword, 10);
                user.password = hashedPassword;
                await user.save();

                res.json({ message: 'Password changed successfully' });
            } catch (error) {
                console.error('Error changing password:', error);
                res.status(500).json({ message: 'Server error' });
            }
        },

        getProfile: async (req, res) => {
            try {
                const user = await db.User.findByPk(req.user.id, {
                    attributes: ['email', 'phoneNumber']
                });
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }
                // Also fetch subscription data
                const subscription = await db.Subscription.findOne({ 
                    where: { userId: req.user.id },
                    order: [['createdAt', 'DESC']]
                });

                res.json({ 
                    user: user,
                    subscription: subscription
                });
            } catch (error) {
                console.error('Error fetching user profile:', error);
                res.status(500).json({ message: 'Server error' });
            }
        },

        updateProfile: async (req, res) => {
            try {
                const { fullName, email } = req.body;
                const user = await db.User.findByPk(req.user.id);
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                user.fullName = fullName;
                user.email = email;
                await user.save();

                res.json({ message: 'Profile updated successfully' });
            } catch (error) {
                console.error('Error updating user profile:', error);
                res.status(500).json({ message: 'Server error' });
            }
        },

        changePassword: async (req, res) => {
            try {
                const { currentPassword, newPassword } = req.body;
                const user = await db.User.findByPk(req.user.id);
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                const isMatch = await bcrypt.compare(currentPassword, user.password);
                if (!isMatch) {
                    return res.status(400).json({ message: 'Incorrect current password' });
                }

                const hashedPassword = await bcrypt.hash(newPassword, 10);
                user.password = hashedPassword;
                await user.save();

                res.json({ message: 'Password changed successfully' });
            } catch (error) {
                console.error('Error changing password:', error);
                res.status(500).json({ message: 'Server error' });
            }
        },

        updateAlertPreferences: async (req, res) => {
            try {
                const { telegramId, whatsappNumber, preferredAlertMethod } = req.body;
                const user = await db.User.findByPk(req.user.id);
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                user.telegramId = telegramId;
                user.whatsappNumber = whatsappNumber;
                user.preferredAlertMethod = preferredAlertMethod;
                await user.save();

                res.json({ message: 'Alert preferences updated successfully' });
            } catch (error) {
                console.error('Error updating alert preferences:', error);
                res.status(500).json({ message: 'Server error' });
            }
        }
    };
};

module.exports = { authenticate, userController };