ALTER TABLE bookings
ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
ADD COLUMN receipt_path VARCHAR(255),
ADD CONSTRAINT bookings_payment_method_check CHECK (payment_method IN ('cash', 'online')); 