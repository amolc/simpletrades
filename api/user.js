const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // No token provided

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Token is no longer valid
        req.user = user;
        next();
    });
};

module.exports = (db) => {

// Placeholder for user API routes

// Add user
router.post('/', async (req, res) => {
    const { phoneNumber, email, password } = req.body;

    if (!phoneNumber || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user in database using Sequelize
        const user = await db.User.create({
            phoneNumber,
            email,
            password: hashedPassword
        });

        res.status(201).json({ message: 'User registered successfully', userId: user.id });
    } catch (error) {
        console.error('Error registering user:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'Phone number or email already exists' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Edit user
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { phoneNumber, email, password } = req.body;

    try {
        const user = await db.User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const updateData = {};
        if (phoneNumber) updateData.phoneNumber = phoneNumber;
        if (email) updateData.email = email;
        if (password) updateData.password = await bcrypt.hash(password, 10);

        await user.update(updateData);

        res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'Phone number or email already exists' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deleted = await db.User.destroy({
            where: { id }
        });

        if (deleted === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(204).send(); // No content to send back
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// List users
router.get('/', async (req, res) => {
    try {
        const users = await db.User.findAll({
            attributes: ['id', 'phoneNumber', 'email', 'createdAt'] // Exclude password
        });
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// User login
router.post('/login', async (req, res) => {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
        return res.status(400).json({ message: 'Phone number and password are required' });
    }

    try {
        // Find user by phoneNumber
        const user = await db.User.findOne({ where: { phoneNumber } });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Compare provided password with stored hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Protected dashboard route
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const user = await db.User.findByPk(req.user.userId, {
            attributes: ['id', 'phoneNumber', 'email', 'createdAt']
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

return router;
};