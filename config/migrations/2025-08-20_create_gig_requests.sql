-- Migration: Create gig_requests table for artist-host gig requests
CREATE TABLE IF NOT EXISTS gig_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gig_id INT NOT NULL,
    artist_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gig_id) REFERENCES gigs(id) ON DELETE CASCADE,
    FOREIGN KEY (artist_id) REFERENCES users(id) ON DELETE CASCADE
);
