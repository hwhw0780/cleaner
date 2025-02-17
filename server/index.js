const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { sendConfirmationEmail } = require('./emailService');

const app = express();
const port = process.env.PORT || 3001;

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

// Serve index.html for the root route
app.get('/', (req, res) => {
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
                status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
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
        const result = await db.query(
            'SELECT period, slots_available FROM available_slots WHERE date = $1',
            [date]
        );
        
        // If no slots are set for this date, return default values
        if (result.rows.length === 0) {
            res.json({
                morning: 5,
                afternoon: 5
            });
        } else {
            // Convert array of rows to object format
            const slots = result.rows.reduce((acc, row) => {
                acc[row.period] = row.slots_available;
                return acc;
            }, {});
            
            // Ensure both periods are included
            if (!slots.morning) slots.morning = 5;
            if (!slots.afternoon) slots.afternoon = 5;
            
            res.json(slots);
        }
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
app.post('/api/bookings', async (req, res) => {
    try {
        const { date, time_period, client_name, service_type, contact, email, address } = req.body;

        // Check if slots are available
        const slotsResult = await db.query(
            'SELECT slots_available FROM available_slots WHERE date = $1 AND period = $2',
            [date, time_period]
        );

        let availableSlots = 5; // Default value
        if (slotsResult.rows.length > 0) {
            availableSlots = slotsResult.rows[0].slots_available;
        }

        if (availableSlots <= 0) {
            return res.status(400).json({ error: 'No slots available for this time' });
        }

        // Create booking
        const result = await db.query(`
            INSERT INTO bookings (date, time_period, client_name, service_type, contact, email, address)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [date, time_period, client_name, service_type, contact, email, address]);

        // Decrease available slots
        await db.query(`
            INSERT INTO available_slots (date, period, slots_available)
            VALUES ($1, $2, $3)
            ON CONFLICT (date, period)
            DO UPDATE SET slots_available = GREATEST(available_slots.slots_available - 1, 0)
        `, [date, time_period, availableSlots - 1]);

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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 