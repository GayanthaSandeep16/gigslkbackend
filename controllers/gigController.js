// backend/controllers/gigController.js

const asyncHandler = require('express-async-handler');
const db = require('../config/db');

// Delete a gig by ID
exports.deleteGig = asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM gigs WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Gig not found.' });
        }
        res.status(200).json({ message: 'Gig deleted successfully.' });
    } catch (error) {
        console.error('Error deleting gig:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

exports.postGig = async (req, res) => {
    // Get the user's id from JWT
    const user_id = req.user.id;

    // Destructure all fields from the request body
    const {
        title,
        eventType,
        eventScope,
        talents,
        minPrice,
        maxPrice,
        location,
        date,
        time,
        description,
    } = req.body;

    try {
        // Fetch the host_id from hosts table using user_id
        const [hostRows] = await db.query('SELECT id FROM hosts WHERE user_id = ?', [user_id]);
        if (!hostRows.length) {
            return res.status(400).json({ message: 'Host profile not found for this user.' });
        }
        const host_id = hostRows[0].id;

        // Handle optional fields, setting them to null if not provided
        const parsedTalents = talents && talents.length > 0 ? JSON.stringify(talents) : null;
        const performanceType = eventType || null;
        const eventDescription = description || null;
        const eventTime = time || null;
        const budgetMin = minPrice ? parseFloat(minPrice) : null;
        const budgetMax = maxPrice ? parseFloat(maxPrice) : null;

        // Insert gig with correct host_id
        const [result] = await db.query(
            `INSERT INTO gigs (
                host_id,
                title,
                description,
                performance_type,
                event_date,
                event_time,
                event_location,
                budget_min,
                budget_max,
                requirements
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                host_id,
                title,
                eventDescription,
                performanceType,
                date,
                eventTime,
                location,
                budgetMin,
                budgetMax,
                parsedTalents
            ]
        );

        res.status(201).json({
            message: 'Gig posted successfully!',
            gigId: result.insertId
        });

    } catch (error) {
        console.error('Error posting gig:', error);
        res.status(500).json({ message: 'Internal server error.', error: error.message });
    }
};

// Function to get all gigs
exports.getAllGigs = asyncHandler(async (req, res) => {
    try {
        const { search, location, eventType, minPrice, maxPrice } = req.query;

        let query = `SELECT g.*, h.company_organization, u.username, u.profile_picture_url
            FROM gigs g
            JOIN hosts h ON g.host_id = h.id
            JOIN users u ON h.user_id = u.id`;
        const params = [];
        const conditions = [];

        // Build the WHERE clause dynamically based on query parameters
        if (search) {
            conditions.push('(g.title LIKE ? OR g.description LIKE ? OR g.requirements LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (location) {
            conditions.push('g.event_location LIKE ?');
            params.push(`%${location}%`);
        }
        if (eventType) {
            conditions.push('g.performance_type LIKE ?');
            params.push(`%${eventType}%`);
        }
        if (minPrice) {
            conditions.push('g.budget_max >= ?');
            params.push(minPrice);
        }
        if (maxPrice) {
            conditions.push('g.budget_min <= ?');
            params.push(maxPrice);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY g.created_at DESC';

        const [gigRows] = await db.query(query, params);

        const allGigs = gigRows.map(gig => {
            // Parse JSON fields
            gig.requirements = gig.requirements ? JSON.parse(gig.requirements) : [];

            // Map database fields to a consistent frontend object structure
            return {
                id: gig.id,
                host_id: gig.host_id,
                title: gig.title,
                location: gig.event_location,
                date: gig.event_date,
                time: gig.event_time,
                description: gig.description,
                minPrice: gig.budget_min,
                maxPrice: gig.budget_max,
                skillsNeeded: gig.requirements,
                postedDate: gig.created_at,
                hostName: gig.company_organization || gig.username,
                hostProfilePicture: gig.profile_picture_url,
            };
        });

        res.status(200).json({
            message: 'All gigs fetched successfully.',
            gigs: allGigs,
        });

    } catch (error) {
        console.error('Error fetching all gigs:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// Function to get a single gig by ID
exports.getGigById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        // Join gigs, hosts, and users to get host name and profile picture
        const query = `
            SELECT g.*, h.company_organization, u.username, u.profile_picture_url
            FROM gigs g
            JOIN hosts h ON g.host_id = h.id
            JOIN users u ON h.user_id = u.id
            WHERE g.id = ?
        `;
        const [gigRows] = await db.query(query, [id]);

        if (gigRows.length === 0) {
            return res.status(404).json({ message: 'Gig not found.' });
        }

        const gig = gigRows[0];
        // Parse JSON fields
        gig.requirements = gig.requirements ? JSON.parse(gig.requirements) : [];

        // Map database fields to a consistent frontend object structure
        const singleGig = {
            id: gig.id,
            host_id: gig.host_id,
            title: gig.title,
            location: gig.event_location,
            date: gig.event_date,
            time: gig.event_time,
            description: gig.description,
            minPrice: gig.budget_min,
            maxPrice: gig.budget_max,
            skillsNeeded: gig.requirements,
            postedDate: gig.created_at,
            hostName: gig.company_organization || gig.username,
            hostProfilePicture: gig.profile_picture_url,
        };

        res.status(200).json({
            message: 'Gig fetched successfully.',
            gig: singleGig,
        });

    } catch (error) {
        console.error('Error fetching gig by ID:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});