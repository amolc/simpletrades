const express = require('express');
const router = express.Router();
const db = require('../models');


router.post('/', async (req, res) => {
    const { userId, productName, startDate, endDate } = req.body;
    if (!userId || !productName || !startDate || !endDate) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    try {
        const subscription = await db.Subscription.create({ userId, productName, startDate, endDate });
        res.status(201).json({ message: 'Subscription created successfully', subscriptionId: subscription.id });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/', async (req, res) => {
    try {
        const { userId } = req.query;
        const whereClause = userId ? { userId } : {};
        const subscriptions = await db.Subscription.findAll({
            where: whereClause,
            include: [{ model: db.User, attributes: ['id', 'username', 'email'] }]
        });
        res.status(200).json(subscriptions);
    } catch (error) {
        console.error('Error retrieving subscriptions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const subscription = await db.Subscription.findByPk(id, {
            include: [{ model: db.User, attributes: ['id', 'username', 'email'] }]
        });
        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }
        res.status(200).json(subscription);
    } catch (error) {
        console.error('Error retrieving subscription:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, productName, startDate, endDate } = req.body;
    try {
        const [updatedRows] = await db.Subscription.update(
            { userId, productName, startDate, endDate },
            { where: { id } }
        );
        if (updatedRows === 0) {
            return res.status(404).json({ message: 'Subscription not found' });
        }
        const updatedSubscription = await db.Subscription.findByPk(id);
        res.status(200).json({ message: 'Subscription updated successfully', subscription: updatedSubscription });
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const deleted = await db.Subscription.destroy({ where: { id } });
        if (deleted === 0) {
            return res.status(404).json({ message: 'Subscription not found' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting subscription:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


module.exports = router;