const mongoose = require('mongoose');

// Use Railway's MongoDB URL if available, otherwise fallback to Atlas
const dbURI = process.env.DATABASE_URL || 'mongodb+srv://admin:9925@gallerydb.bpluh2u.mongodb.net/gallery_of_life';

mongoose.connect(dbURI)
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('MongoDB connection error:', err));
