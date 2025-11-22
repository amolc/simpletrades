const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

module.exports = (db) => {
    const router = express.Router();

    // Admin Login
    router.post('/login', async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        try {
            const user = await db.User.findOne({ where: { email } });

            if (!user || user.role !== 'admin') {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

            res.json({ token });
        } catch (error) {
            console.error('Admin login error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    });

    const authenticateAdmin = (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
                if (err) {
                    return res.sendStatus(403);
                }
                if (user.role !== 'admin') {
                    return res.sendStatus(403);
                }
                req.user = user;
                next();
            });
        } else {
            res.sendStatus(401);
        }
    };

    // Get all pending subscriptions
    router.get('/subscriptions/pending', authenticateAdmin, async (req, res) => {
        try {
            const subscriptions = await db.Subscription.findAll({
                where: { status: 'pending' },
                include: [{ model: db.User, attributes: ['email'] }]
            });
            res.json(subscriptions);
        } catch (error) {
            console.error('Error fetching pending subscriptions:', error);
            res.status(500).json({ message: 'Server error' });
        }
    });

    // Approve a subscription
    router.put('/subscriptions/:id/approve', authenticateAdmin, async (req, res) => {
        try {
            const subscription = await db.Subscription.findByPk(req.params.id);
            if (!subscription) {
                return res.status(404).json({ message: 'Subscription not found' });
            }

            subscription.status = 'active';
            subscription.startDate = new Date();
            // Assuming plan is something like 'monthly', 'quarterly', 'annual'
            let endDate = new Date();
            if (subscription.plan === 'monthly') {
                endDate.setMonth(endDate.getMonth() + 1);
            } else if (subscription.plan === 'quarterly') {
                endDate.setMonth(endDate.getMonth() + 3);
            } else if (subscription.plan === 'annual') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }
            subscription.endDate = endDate;

            await subscription.save();
            res.json(subscription);
        } catch (error) {
            console.error('Error approving subscription:', error);
            res.status(500).json({ message: 'Server error' });
        }
    });

    // Reject a subscription
    router.put('/subscriptions/:id/reject', authenticateAdmin, async (req, res) => {
        try {
            const subscription = await db.Subscription.findByPk(req.params.id);
            if (!subscription) {
                return res.status(404).json({ message: 'Subscription not found' });
            }

            subscription.status = 'rejected';
            await subscription.save();
            res.json(subscription);
        } catch (error) {
            console.error('Error rejecting subscription:', error);
            res.status(500).json({ message: 'Server error' });
        }
    });

    return router;
};