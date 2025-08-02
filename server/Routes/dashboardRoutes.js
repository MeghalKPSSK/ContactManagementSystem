const express = require('express');
const router = express.Router();
const dashboardModel = require('../models/dashboardModel');

let dashboardModelInstance;

(async () => {
    dashboardModelInstance = await dashboardModel();
})();

// Get tags distribution for pie chart
router.get('/tags-distribution', async (req, res) => {
    const endpoint = 'GET /dashboard/tags-distribution';
    console.log(`[${endpoint}] Request received - UserId: ${req.query.userId}`);
    
    try {
        const tagsDistribution = await dashboardModelInstance.getTagsDistribution(req.query.userId);
        console.log(`[${endpoint}] Success - Found ${tagsDistribution.labels.length} tags, Total counts: ${tagsDistribution.counts.reduce((a, b) => a + b, 0)}`);
        
        res.status(200).json({
            success: true,
            counts: tagsDistribution.counts,
            labels: tagsDistribution.labels
        });
    } catch (error) {
        console.error(`[${endpoint}] Error:`, error.message);
        res.status(500).json({ success: false, message: 'Error fetching tags distribution' });
    }
});

// Get favorites count for bar chart
router.get('/favorites-count', async (req, res) => {
    const endpoint = 'GET /dashboard/favorites-count';
    console.log(`[${endpoint}] Request received - UserId: ${req.query.userId}`);
    
    try {
        const favoritesCount = await dashboardModelInstance.getFavoritesCount(req.query.userId);
        console.log(`[${endpoint}] Success - Favorites: ${favoritesCount.favorite}, Regular: ${favoritesCount.regular}, Total: ${favoritesCount.favorite + favoritesCount.regular}`);
        
        res.status(200).json({
            success: true,
            favorite: favoritesCount.favorite,
            regular: favoritesCount.regular
        });
    } catch (error) {
        console.error(`[${endpoint}] Error:`, error.message);
        res.status(500).json({ success: false, message: 'Error fetching favorites count' });
    }
});

// Get groups statistics for multi-chart
router.get('/groups-stats', async (req, res) => {
    const endpoint = 'GET /dashboard/groups-stats';
    console.log(`[${endpoint}] Request received - UserId: ${req.query.userId}`);
    
    try {
        if (!req.query.userId) {
            console.log(`[${endpoint}] Validation failed - Missing userId parameter`);
            return res.status(400).json({ 
                success: false, 
                message: 'UserId is required' 
            });
        }
        
        const groupsStats = await dashboardModelInstance.getGroupsStatistics(req.query.userId);
        console.log(`[${endpoint}] Success - Groups: ${groupsStats.groupNames?.length || 0}, Members: ${groupsStats.memberCounts?.reduce((a, b) => a + b, 0) || 0}, Trend points: ${groupsStats.trendData?.length || 0}`);
        
        res.status(200).json({
            success: true,
            data: groupsStats
        });
    } catch (error) {
        console.error(`[${endpoint}] Error:`, error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching groups statistics',
            error: error.message 
        });
    }
});

// Get dashboard contacts
router.get('/contacts', async (req, res) => {
    const endpoint = 'GET /dashboard/contacts';
    const { userId, tags, page = 1, pageSize = 9 } = req.query;
    console.log(`[${endpoint}] Request received - UserId: ${userId}, Tags: ${tags || 'none'}, Page: ${page}, PageSize: ${pageSize}`);
    
    try {
        const contactsList = await dashboardModelInstance.getDashboardContacts(
            userId,
            tags ? tags.split(',') : [],
            parseInt(page),
            parseInt(pageSize)
        );
        console.log(`[${endpoint}] Success - Returned ${contactsList.contacts.length} contacts out of ${contactsList.total} total`);
        
        res.status(200).json({
            success: true,
            contacts: contactsList.contacts,
            total: contactsList.total
        });
    } catch (error) {
        console.error(`[${endpoint}] Error:`, error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving contacts'
        });
    }
});

module.exports = router;