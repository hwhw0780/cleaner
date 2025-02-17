const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const multer = require('multer');
const { sendConfirmationEmail } = require('./emailService');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 10000;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        // Create uploads directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Check environment variables at startup
console.log('Checking environment configuration...');
const requiredEnvVars = ['DATABASE_URL', 'EMAIL_USER', 'EMAIL_PASS'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
} else {
    console.log('All required environment variables are set');
    console.log('Email configured for:', process.env.EMAIL_USER);
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Serve index.html for all routes except /api
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        next();
        return;
    }
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Database initialization
const initializeDatabase = async () => {
    try {
        // Create available_slots table
        await db.query(`
            CREATE TABLE IF NOT EXISTS available_slots (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                period VARCHAR(10) NOT NULL CHECK (period IN ('morning', 'afternoon')),
                slots_available INTEGER NOT NULL DEFAULT 5,
                UNIQUE(date, period)
            );
        `);

        // Create bookings table
        await db.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                time_period VARCHAR(10) NOT NULL CHECK (time_period IN ('morning', 'afternoon')),
                client_name VARCHAR(100) NOT NULL,
                service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('weekly', 'fortnightly', 'one-off')),
                contact VARCHAR(20) NOT NULL,
                email VARCHAR(100),
                address TEXT NOT NULL,
                payment_method VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'online')),
                receipt_path VARCHAR(255),
                status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Add columns if they don't exist (for existing tables)
        await db.query(`
            DO $$ 
            BEGIN 
                BEGIN
                    ALTER TABLE bookings 
                    ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
                    ADD COLUMN receipt_path VARCHAR(255);
                EXCEPTION
                    WHEN duplicate_column THEN 
                        NULL;
                END;
                
                BEGIN
                    ALTER TABLE bookings 
                    ADD CONSTRAINT bookings_payment_method_check 
                    CHECK (payment_method IN ('cash', 'online'));
                EXCEPTION
                    WHEN duplicate_object THEN 
                        NULL;
                END;
            END $$;
        `);

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

// Initialize database when server starts
initializeDatabase();

// API Routes

// Get available slots for a specific date
app.get('/api/slots/:date', async (req, res) => {
    try {
        const { date } = req.params;
        console.log('[DEBUG] Fetching slots for date:', date);
        
        const result = await db.query(
            'SELECT period, slots_available FROM available_slots WHERE date = $1',
            [date]
        );
        
        console.log('[DEBUG] Raw slots result:', result.rows);
        
        // Convert array of rows to object format
        const slots = result.rows.reduce((acc, row) => {
            acc[row.period] = row.slots_available;
            return acc;
        }, {});
        
        // Only set default 5 if the record doesn't exist in the database
        if (!result.rows.some(row => row.period === 'morning')) {
            slots.morning = 5;
        }
        if (!result.rows.some(row => row.period === 'afternoon')) {
            slots.afternoon = 5;
        }
        
        console.log('[DEBUG] Final slots response:', slots);
        res.json(slots);
    } catch (error) {
        console.error('Error fetching slots:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update slots for a specific date (admin only)
app.put('/api/slots/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const { morning, afternoon } = req.body;

        // Update morning slots
        await db.query(`
            INSERT INTO available_slots (date, period, slots_available)
            VALUES ($1, 'morning', $2)
            ON CONFLICT (date, period)
            DO UPDATE SET slots_available = $2
        `, [date, morning]);

        // Update afternoon slots
        await db.query(`
            INSERT INTO available_slots (date, period, slots_available)
            VALUES ($1, 'afternoon', $2)
            ON CONFLICT (date, period)
            DO UPDATE SET slots_available = $2
        `, [date, afternoon]);

        res.json({ message: 'Slots updated successfully' });
    } catch (error) {
        console.error('Error updating slots:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create a new booking
app.post('/api/bookings', upload.single('receipt'), async (req, res) => {
    try {
        const { date, time_period, client_name, service_type, contact, email, address, payment_method } = req.body;
        const receipt_path = req.file ? req.file.filename : null;

        // Check if slots are available
        const slotsResult = await db.query(
            'SELECT slots_available FROM available_slots WHERE date = $1 AND period = $2',
            [date, time_period]
        );

        let availableSlots = 5; // Default value
        if (slotsResult.rows.length > 0) {
            availableSlots = slotsResult.rows[0].slots_available;
        }
        console.log('[DEBUG] Initial slots available:', availableSlots);

        if (availableSlots <= 0) {
            console.log('[DEBUG] No slots available, rejecting booking');
            return res.status(400).json({ error: 'No slots available for this time' });
        }

        // Create booking
        const result = await db.query(`
            INSERT INTO bookings (date, time_period, client_name, service_type, contact, email, address, payment_method, receipt_path)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [date, time_period, client_name, service_type, contact, email, address, payment_method, receipt_path]);
        console.log('[DEBUG] Booking created successfully');

        // Update available slots with proper decrement
        const updateResult = await db.query(`
            WITH current_slots AS (
                SELECT slots_available 
                FROM available_slots 
                WHERE date = $1 AND period = $2
            )
            INSERT INTO available_slots (date, period, slots_available)
            VALUES ($1, $2, GREATEST(0, 4))  -- Default 5-1=4 for new entries
            ON CONFLICT (date, period) DO UPDATE 
            SET slots_available = CASE 
                WHEN available_slots.slots_available > 0 THEN available_slots.slots_available - 1 
                ELSE 0 
            END
            WHERE available_slots.date = $1 AND available_slots.period = $2
            RETURNING slots_available
        `, [date, time_period]);
        
        console.log('[DEBUG] Slots after update:', updateResult.rows[0]?.slots_available);

        // Verify the update
        const verifyResult = await db.query(
            'SELECT slots_available FROM available_slots WHERE date = $1 AND period = $2',
            [date, time_period]
        );
        console.log('[DEBUG] Verified slots after update:', verifyResult.rows[0]?.slots_available);

        // Send confirmation email
        const booking = result.rows[0];
        const emailSent = await sendConfirmationEmail({
            email,
            clientName: client_name,
            date,
            time_period,
            service_type,
            address
        });

        res.status(201).json({
            booking: result.rows[0],
            emailSent
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all bookings (admin only)
app.get('/api/bookings', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM bookings ORDER BY date DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update booking status (admin only)
app.put('/api/bookings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const result = await db.query(
            'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete booking (admin only)
app.delete('/api/bookings/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // First, get the booking details to update available slots
        const bookingResult = await db.query(
            'SELECT date, time_period FROM bookings WHERE id = $1',
            [id]
        );

        if (bookingResult.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookingResult.rows[0];

        // Delete the booking
        await db.query('DELETE FROM bookings WHERE id = $1', [id]);

        // Increase available slots
        await db.query(`
            INSERT INTO available_slots (date, period, slots_available)
            VALUES ($1, $2, 1)
            ON CONFLICT (date, period)
            DO UPDATE SET slots_available = available_slots.slots_available + 1
        `, [booking.date, booking.time_period]);

        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 