const db = require('../config/db'); 
const jwt = require('jsonwebtoken'); 
const upload = require('../config/multerConfig'); 
// Function to get a performer's profile (for a specific logged-in user)
exports.getPerformerProfile = async (req, res) => {
    const userId = req.user.id; // User ID from authenticated token

    try {
        // Fetch user details from the users table
        const [userRows] = await db.query('SELECT username, email, role FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const user = userRows[0];

        // Fetch performer profile details from the performers table
        const [performerRows] = await db.query('SELECT * FROM performers WHERE user_id = ?', [userId]);

        if (performerRows.length === 0) {
            // If no performer profile exists, return a default/empty profile
            return res.status(200).json({
                message: 'Performer profile not found, returning default.',
                profile: {
                    user_id: userId,
                    full_name: user.username, // Default from user's username
                    stage_name: user.username,
                    location: 'Not Set',
                    performance_type: 'Not Set',
                    bio: 'Tell us about your talent and experience!',
                    price: 'Rs. 0 - Rs. 0',
                    skills: [], 
                    profile_picture_url: 'https://placehold.co/150x150/553c9a/ffffff?text=Profile',
                    contact_number: 'Not Set',
                    direct_booking: false,
                    travel_distance: 0,
                    availability_weekdays: false,
                    availability_weekends: false,
                    availability_morning: false,
                    availability_evening: false,
                    gallery_images: [], 
                    rating: 0,
                    review_count: 0,
                }
            });
        }

        const performerProfile = performerRows[0];

        // Parse JSON fields
        performerProfile.skills = performerProfile.skills ? JSON.parse(performerProfile.skills) : [];
        performerProfile.gallery_images = performerProfile.gallery_images ? JSON.parse(performerProfile.gallery_images) : [];


                // Get all booked dates for this performer
                const [bookingRows] = await db.query(
                    'SELECT event_date FROM bookings WHERE artist_id = ?',
                    [performerProfile.id]
                );
                        // Ensure booked_dates are in YYYY-MM-DD format
                        const booked_dates = bookingRows.map(row => {
                            if (typeof row.event_date === 'string') {
                                return row.event_date.split('T')[0];
                            } else if (row.event_date instanceof Date) {
                                return row.event_date.toISOString().slice(0, 10);
                            }
                            return String(row.event_date);
                        });

                // Map database fields to frontend PerformerProfile interface names
                const formattedProfile = {
                        id: performerProfile.id,
                        user_id: performerProfile.user_id,
                        full_name: performerProfile.full_name,
                        stage_name: performerProfile.stage_name,
                        location: performerProfile.location,
                        performance_type: performerProfile.performance_type,
                        bio: performerProfile.bio,
                        price: performerProfile.price_display, // Map price_display to price
                        skills: performerProfile.skills,
                        profile_picture_url: performerProfile.profile_picture_url,
                        contact_number: performerProfile.contact_number,
                        direct_booking: performerProfile.accept_direct_booking === 1, // Convert TINYINT to boolean
                        travel_distance: performerProfile.travel_distance_km, // Map travel_distance_km
                        availability_weekdays: performerProfile.preferred_availability_weekdays === 1,
                        availability_weekends: performerProfile.preferred_availability_weekends === 1,
                        availability_morning: performerProfile.preferred_availability_mornings === 1,
                        availability_evening: performerProfile.preferred_availability_evenings === 1,
                        gallery_images: performerProfile.gallery_images,
                        rating: performerProfile.average_rating,
                        review_count: performerProfile.total_reviews,
                        booked_dates,
                };

                res.status(200).json({ message: 'Performer profile fetched successfully.', profile: formattedProfile });

    } catch (error) {
        console.error('Error fetching performer profile:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

// Function to update a performer's profile
exports.updatePerformerProfile = async (req, res) => {
    
    upload(req, res, async (err) => {
        if (err) {
            console.error('Multer upload error:', err);
            return res.status(400).json({ message: err.message || 'File upload failed.' });
        }


        const userId = req.user.id; // User ID from authenticated token
        const {
            full_name,
            stage_name,
            location,
            performance_type,
            bio,
            price,
            skills,
            profile_picture_url, // This is the string from req.body
            contact_number,
            direct_booking,
            travel_distance,
            availability_weekdays,
            availability_weekends,
            availability_morning,
            availability_evening,
            gallery_images: galleryImagesFromBody,
        } = req.body;

        // Only handle profile_picture and gallery_images, not cover_photo
        const profilePictureFile = req.files && req.files['profile_picture'] ? req.files['profile_picture'][0] : null;
        const galleryImageFiles = req.files && req.files['gallery_images'] ? req.files['gallery_images'] : [];

        // Construct URLs for newly uploaded files
        const newProfilePictureUrl = profilePictureFile ? `/uploads/${profilePictureFile.filename}` : null;
        const newGalleryImageUrls = galleryImageFiles.map(file => `/uploads/${file.filename}`);

        let connection;
        try {
            connection = await db.getConnection(); // Get a connection from the pool
            await connection.beginTransaction(); // Start a transaction

            // Determine final profile picture URL
            let finalProfilePictureUrl = null; 
            if (newProfilePictureUrl) {
                // Case 1: New profile picture uploaded, use its relative path
                finalProfilePictureUrl = newProfilePictureUrl;
            } else if (profile_picture_url !== undefined && profile_picture_url !== null) {
                
                // If frontend sent an empty string, it means user removed it or it was initially empty
                if (profile_picture_url === '') {
                    finalProfilePictureUrl = null; 
                } else {
                    // It's an existing URL, strip backend base URL if present to store relative path
                                    // Handle various URL formats and convert to relative paths
                if (profile_picture_url.startsWith('http://localhost:5001/uploads/uploads/')) {
                    // Fix double uploads path in full URL
                    finalProfilePictureUrl = profile_picture_url.replace('http://localhost:5001/uploads/uploads/', '/uploads/');
                } else if (profile_picture_url.startsWith('http://localhost:5001/uploads/')) {
                    finalProfilePictureUrl = profile_picture_url.replace('http://localhost:5001', '');
                } else if (profile_picture_url.startsWith('http://localhost:5000/uploads/uploads/')) {
                    // Fix double uploads path in full URL
                    finalProfilePictureUrl = profile_picture_url.replace('http://localhost:5000/uploads/uploads/', '/uploads/');
                } else if (profile_picture_url.startsWith('http://localhost:5000/uploads/')) {
                    finalProfilePictureUrl = profile_picture_url.replace('http://localhost:5000', '');
                } else if (profile_picture_url.startsWith('/uploads/uploads/')) {
                    // Fix double uploads path
                    finalProfilePictureUrl = profile_picture_url.replace('/uploads/uploads/', '/uploads/');
                } else if (profile_picture_url.startsWith('/uploads/')) {
                    finalProfilePictureUrl = profile_picture_url;
                } else {
                    finalProfilePictureUrl = profile_picture_url;
                }
                }
            }
            console.log('Backend: Determined finalProfilePictureUrl:', finalProfilePictureUrl);

            // Determine final gallery images URLs
            
            let finalGalleryImageUrls = galleryImagesFromBody ? JSON.parse(galleryImagesFromBody) : [];
            // Ensure these are relative paths if they came as absolute from frontend
            finalGalleryImageUrls = finalGalleryImageUrls.map(url => {
                // Handle various URL formats and convert to relative paths
                if (url.startsWith('http://localhost:5001/uploads/uploads/')) {
                    // Fix double uploads path in full URL
                    return url.replace('http://localhost:5001/uploads/uploads/', '/uploads/');
                } else if (url.startsWith('http://localhost:5001/uploads/')) {
                    return url.replace('http://localhost:5001', '');
                } else if (url.startsWith('http://localhost:5000/uploads/uploads/')) {
                    // Fix double uploads path in full URL
                    return url.replace('http://localhost:5000/uploads/uploads/', '/uploads/');
                } else if (url.startsWith('http://localhost:5000/uploads/')) {
                    return url.replace('http://localhost:5000', '');
                } else if (url.startsWith('/uploads/uploads/')) {
                    // Fix double uploads path
                    return url.replace('/uploads/uploads/', '/uploads/');
                } else if (url.startsWith('/uploads/')) {
                    return url;
                } else {
                    return url;
                }
            });
            // Add any newly uploaded gallery image URLs
            finalGalleryImageUrls = [...finalGalleryImageUrls, ...newGalleryImageUrls];

            // Ensure skills are parsed from JSON string if they come as such, or are an array
            let parsedSkills = [];
            try {
                parsedSkills = skills ? JSON.parse(skills) : [];
            } catch (parseError) {
                // If skills is already an array or not valid JSON, treat as empty or directly use
                parsedSkills = Array.isArray(skills) ? skills : [];
            }


            const skillsJson = JSON.stringify(parsedSkills);
            const galleryImagesJson = JSON.stringify(finalGalleryImageUrls);
            


            const directBookingTinyInt = direct_booking ? 1 : 0;
            const travelDistanceInt = parseInt(travel_distance, 10); // Ensure travel_distance is an integer
            const availabilityWeekdaysTinyInt = availability_weekdays ? 1 : 0;
            const availabilityWeekendsTinyInt = availability_weekends ? 1 : 0;
            const availabilityMorningTinyInt = availability_morning ? 1 : 0;
            const availabilityEveningTinyInt = availability_evening ? 1 : 0;

            // Check if a performer profile already exists for this user_id
            const [existingProfileCheck] = await connection.query('SELECT id FROM performers WHERE user_id = ?', [userId]);

            if (existingProfileCheck.length > 0) {
                // Update existing profile
                await connection.query(
                    `UPDATE performers SET
                    full_name = ?,
                    stage_name = ?,
                    location = ?,
                    performance_type = ?,
                    bio = ?,
                    price_display = ?,
                    skills = ?,
                    profile_picture_url = ?,
                    contact_number = ?,
                    accept_direct_booking = ?,
                    travel_distance_km = ?,
                    preferred_availability_weekdays = ?,
                    preferred_availability_weekends = ?,
                    preferred_availability_mornings = ?,
                    preferred_availability_evenings = ?,
                    gallery_images = ?
                    WHERE user_id = ?`,
                    [
                        full_name,
                        stage_name,
                        location,
                        performance_type,
                        bio,
                        price, // Use price for price_display
                        skillsJson,
                        finalProfilePictureUrl, // Use the determined final URL
                        contact_number,
                        directBookingTinyInt,
                        travelDistanceInt, // Use the parsed integer
                        availabilityWeekdaysTinyInt,
                        availabilityWeekendsTinyInt,
                        availabilityMorningTinyInt,
                        availabilityEveningTinyInt,
                        galleryImagesJson, // Use the determined final URLs
                        userId
                    ]
                );
                await connection.commit();
                res.status(200).json({ message: 'Performer profile updated successfully.' });
            } else {
                await connection.query(
                    `INSERT INTO performers (
                        user_id, full_name, stage_name, location, performance_type, bio, price_display, skills,
                        profile_picture_url, contact_number, accept_direct_booking, travel_distance_km,
                        preferred_availability_weekdays, preferred_availability_weekends,
                        preferred_availability_mornings, preferred_availability_evenings, gallery_images
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        full_name,
                        stage_name,
                        location,
                        performance_type,
                        bio,
                        price, // Use price for price_display
                        skillsJson,
                        finalProfilePictureUrl, // Use the determined final URL
                        contact_number,
                        directBookingTinyInt,
                        travelDistanceInt, // Use the parsed integer
                        availabilityWeekdaysTinyInt,
                        availabilityWeekendsTinyInt,
                        availabilityMorningTinyInt,
                        availabilityEveningTinyInt,
                        galleryImagesJson // Use the determined final URLs
                    ]
                );
                await connection.commit();
                res.status(201).json({ message: 'Performer profile created successfully.' });
            }

        } catch (error) {
            if (connection) {
                await connection.rollback(); // Rollback on error
            }
            console.error('Error updating/creating performer profile:', error);
            res.status(500).json({ message: 'Internal server error.', error: error.message });
        } finally {
            if (connection) {
                connection.release(); // Always release the connection
            }
        }
    });
};

// Function to get all performer profiles for public browsing
// Used by frontend to show all artists and for "Artists Nearby"
exports.getAllPerformerProfiles = async (req, res) => {
    try {
        // Query all performers from the database
        const [performerRows] = await db.query('SELECT * FROM performers');

        // Map DB rows to the frontend-friendly shape
        const allProfiles = performerRows.map((performerProfile) => {
            // Parse JSON fields if present
            performerProfile.skills = performerProfile.skills ? JSON.parse(performerProfile.skills) : [];
            performerProfile.gallery_images = performerProfile.gallery_images ? JSON.parse(performerProfile.gallery_images) : [];

            // Ensure profile_picture_url is a valid URL or a placeholder
            let profilePic = performerProfile.profile_picture_url;
            if (!profilePic || profilePic === '') {
                profilePic = 'https://placehold.co/160x160/0f172a/ffffff?text=Artist';
            } else if (!profilePic.startsWith('http') && !profilePic.startsWith('/uploads/')) {
                profilePic = '/uploads/' + profilePic;
            }

            // Ensure total_reviews is always a number
            let totalReviews = performerProfile.total_reviews;
            if (totalReviews === null || totalReviews === undefined) {
                totalReviews = 0;
            }

            return {
                id: performerProfile.id,
                user_id: performerProfile.user_id,
                full_name: performerProfile.full_name,
                stage_name: performerProfile.stage_name,
                location: performerProfile.location,
                performance_type: performerProfile.performance_type,
                bio: performerProfile.bio,
                price: performerProfile.price_display, // Map price_display to price
                skills: performerProfile.skills,
                profile_picture_url: profilePic,
                contact_number: performerProfile.contact_number,
                direct_booking: performerProfile.accept_direct_booking === 1, // Convert TINYINT to boolean
                travel_distance: performerProfile.travel_distance_km, // Map travel_distance_km
                availability_weekdays: performerProfile.preferred_availability_weekdays === 1,
                availability_weekends: performerProfile.preferred_availability_weekends === 1,
                availability_morning: performerProfile.preferred_availability_mornings === 1,
                availability_evening: performerProfile.preferred_availability_evenings === 1,
                gallery_images: performerProfile.gallery_images,
                rating: performerProfile.average_rating,
                review_count: totalReviews,
            };
        });

        res.status(200).json({ message: 'All performer profiles fetched successfully.', profiles: allProfiles });
    } catch (error) {
        console.error('Error fetching all performer profiles:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};
