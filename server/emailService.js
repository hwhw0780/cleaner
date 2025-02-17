const nodemailer = require('nodemailer');

// Create a transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Function to send confirmation email
async function sendConfirmationEmail(booking) {
    const { email, clientName, date, time_period, service_type, address } = booking;
    
    // Format the date
    const bookingDate = new Date(date);
    const formattedDate = bookingDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Format the time period
    const timeSlot = time_period === 'morning' ? '8:00 AM - 12:00 PM' : '1:00 PM - 5:00 PM';

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Booking Confirmation - Emanuel Management And Cleaning Service',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4A90E2;">Booking Confirmation</h2>
                <p>Dear ${clientName},</p>
                <p>Thank you for booking with Emanuel Management And Cleaning Service. Your booking details are as follows:</p>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Date:</strong> ${formattedDate}</p>
                    <p><strong>Time:</strong> ${timeSlot}</p>
                    <p><strong>Service Type:</strong> ${service_type}</p>
                    <p><strong>Service Address:</strong> ${address}</p>
                </div>
                
                <p>If you need to make any changes to your booking or have any questions, please contact us at:</p>
                <ul>
                    <li>Phone: +60 17-788 2670</li>
                    <li>Email: emcs.plt@gmail.com</li>
                </ul>
                
                <p style="color: #666; font-size: 0.9em; margin-top: 30px;">
                    This is an automated message. Please do not reply to this email.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Confirmation email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending confirmation email:', error);
        return false;
    }
}

module.exports = {
    sendConfirmationEmail
}; 