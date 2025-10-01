const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Generate a booking receipt PDF and return as a buffer
async function generateBookingReceipt({ booking, host, artist, logoPath }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // Logo
    if (logoPath && fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 30, { width: 90 });
    }
    doc.fontSize(22).fillColor('#8b5cf6').text('GIGS.lk', 140, 40, { continued: true }).fillColor('#fff').text('  Perform your World', { align: 'left' });
    doc.moveDown();
    doc.fontSize(16).fillColor('#333').text('Booking Receipt', { align: 'right' });
    doc.moveDown(2);

    // Defensive checks for host/artist
    let safeHost = host;
    let safeArtist = artist;
    if (!host) {
      console.warn('Warning: host is undefined or null in PDF generation.');
      safeHost = { full_name: 'Unknown Host', username: 'Unknown', email: '-' };
    }
    if (!artist) {
      console.warn('Warning: artist is undefined or null in PDF generation.');
      safeArtist = { stage_name: 'Unknown Artist', full_name: 'Unknown', email: '-' };
    }
    // Booking details (safe access)
    doc.fontSize(12).fillColor('#000').text(`Booking ID: ${booking?.id ?? ''}`);
    doc.text(`Booking Date: ${booking?.event_date ?? ''} ${booking?.event_time ?? ''}`);
    doc.text(`Payment Method: ${booking?.payment_method ?? ''}`);
    doc.text(`Amount Paid: LKR ${booking?.price ?? ''}`);
    doc.moveDown();
    doc.text(`Host: ${(safeHost.full_name || safeHost.username || '-')}`);
    doc.text(`Host Email: ${safeHost.email || '-'}`);
    doc.moveDown();
    doc.text(`Artist: ${(safeArtist.stage_name || safeArtist.full_name || '-')}`);
    doc.text(`Artist Email: ${safeArtist.email || '-'}`);
    doc.moveDown();
    doc.text(`Event Location: ${booking?.event_location ?? '-'}`);
    doc.text(`Notes: ${booking?.notes ?? '-'}`);
    doc.moveDown(2);
    doc.fontSize(10).fillColor('#888').text('Thank you for booking with GIGS.lk!');
    doc.end();
  });
}

module.exports = { generateBookingReceipt };
