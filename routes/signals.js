const express = require('express');
const router = express.Router();
const signals = require('../api/signals');

// GET all signals with optional filters
router.get('/signals', async (req, res) => {
    try {
        const filters = {};
        if (req.query.status) filters.status = req.query.status;
        if (req.query.type) filters.type = req.query.type;
        if (req.query.stock) filters.stock = req.query.stock;
        if (req.query.date) filters.date = req.query.date;
        
        const signalList = await signals.getSignals(filters);
        res.json({
            success: true,
            data: signalList,
            count: signalList.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});



// GET signal statistics
router.get('/signals/stats', async (req, res) => {
    try {
        const stats = await signals.getSignalStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET signal by ID (must be before other routes)
router.get('/signals/:id', async (req, res) => {
    try {
        const signal = await signals.getSignalById(req.params.id);
        if (!signal) {
            return res.status(404).json({
                success: false,
                error: 'Signal not found'
            });
        }
        res.json({
            success: true,
            data: signal
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST create new signal
router.post('/signals', async (req, res) => {
    try {
        const requiredFields = ['stock', 'entry', 'target', 'stopLoss', 'type'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            });
        }
        
        const newSignal = await signals.createSignal(req.body);
        res.status(201).json({
            success: true,
            data: newSignal,
            message: 'Signal created successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// PUT update signal
router.put('/signals/:id', async (req, res) => {
    try {
        const updatedSignal = await signals.updateSignal(req.params.id, req.body);
        if (!updatedSignal) {
            return res.status(404).json({
                success: false,
                error: 'Signal not found'
            });
        }
        res.json({
            success: true,
            data: updatedSignal,
            message: 'Signal updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// DELETE signal
router.delete('/signals/:id', async (req, res) => {
    try {
        const deleted = await signals.deleteSignal(req.params.id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Signal not found'
            });
        }
        res.json({
            success: true,
            message: 'Signal deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;