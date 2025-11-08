const mongoose = require('mongoose');

// Use environment variable for database URL
const dbURI = process.env.DATABASE_URL;

if (!dbURI) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
}

mongoose.connect(dbURI)
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('MongoDB connection error:', err));
