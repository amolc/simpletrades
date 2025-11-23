const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

module.exports = (db) => {
    const router = express.Router();

    // User Login
    router.post('/login', async (req, res) => {
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
    });

    const authenticate = (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
                if (err) {
                    return res.sendStatus(403);
                }
                req.user = user;
                next();
            });
        } else {
            res.sendStatus(401);
        }
    };

    router.get('/profile', authenticate, async (req, res) => {
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
    });

    router.put('/profile', authenticate, async (req, res) => {
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
    });

    router.put('/change-password', authenticate, async (req, res) => {
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
    });

    router.put('/alert-preferences', authenticate, async (req, res) => {
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
    });

    return router;
};