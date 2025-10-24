const mongoose = require('mongoose');

const dbURI = 'mongodb://localhost:27017/gallery_of_life'; // your local DB
mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));
