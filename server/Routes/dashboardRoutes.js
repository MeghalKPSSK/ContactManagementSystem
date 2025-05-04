const express = require('express');
const router = express.Router();
const dashboardModel = require('../models/dashboardModel');

let dashboardModelInstance;

(async () => {
    dashboardModelInstance = await dashboardModel();
})();

// Get tags distribution for pie chart
router.get('/tags-distribution', async (req, res) => {
    try {
        const tagsDistribution = await dashboardModelInstance.getTagsDistribution(req.query.userId);
        res.status(200).json({
            success: true,
            counts: tagsDistribution.counts,
            labels: tagsDistribution.labels
        });
    } catch (error) {
        console.error('Error fetching tags distribution:', error);
        res.status(500).json({ success: false, message: 'Error fetching tags distribution' });
    }
});

// Get favorites count for bar chart
router.get('/favorites-count', async (req, res) => {
    try {
        const favoritesCount = await dashboardModelInstance.getFavoritesCount(req.query.userId);
        res.status(200).json({
            success: true,
            favorite: favoritesCount.favorite,
            regular: favoritesCount.regular
        });
    } catch (error) {
        console.error('Error fetching favorites count:', error);
        res.status(500).json({ success: false, message: 'Error fetching favorites count' });
    }
});

// Get dashboard contacts
router.get('/contacts', async (req, res) => {
    try {
        const { userId, tags, page = 1, pageSize = 9 } = req.query;
        const contactsList = await dashboardModelInstance.getDashboardContacts(
            userId,
            tags ? tags.split(',') : [],
            parseInt(page),
            parseInt(pageSize)
        );
        res.status(200).json({
            success: true,
            contacts: contactsList.contacts,
            total: contactsList.total
        });
    } catch (error) {
        console.error('Error retrieving dashboard contacts:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving contacts'
        });
    }
});

module.exports = router;