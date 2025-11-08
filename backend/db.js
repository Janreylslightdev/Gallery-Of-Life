const mongoose = require('mongoose');

// Use Railway's MongoDB URL if available, otherwise fallback to local
const dbURI = process.env.DATABASE_URL || 'mongodb://localhost:27017/gallery_of_life';

mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));
