const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = (db) => {
    const router = express.Router();

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

    router.get('/', authenticate, async (req, res) => {
        try {
            const signals = await db.Signal.findAll({
                where: { userId: req.user.id },
                order: [['createdAt', 'DESC']]
            });
            res.json(signals);
        } catch (error) {
            console.error('Error fetching signals:', error);
            res.status(500).json({ message: 'Server error' });
        }
    });

    return router;
};