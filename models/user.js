const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  albums: [{
    name: String,
    media: [{
      filename: String,
      filepath: String,
      type: String, // image or video
      uploadedAt: { type: Date, default: Date.now }
    }]
  }]
});

module.exports = mongoose.model('User', userSchema);
