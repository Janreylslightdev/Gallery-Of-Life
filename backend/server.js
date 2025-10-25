const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
require('./db.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 8080;

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    accountType: { type: String, enum: ['USER', 'ADMIN', 'SUPPORT'], required: true },
    isApproved: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Media Schema
const mediaSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    album: { type: String, default: 'default' },
    notes: { type: String, default: '' },
    uploadDate: { type: Date, default: Date.now }
});

const Media = mongoose.model('Media', mediaSchema);

// Album Schema
const albumSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const Album = mongoose.model('Album', albumSchema);

// Support Ticket Schema
const supportTicketSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userEmail: { type: String, required: true },
    issueType: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

// Support Message Schema
const supportMessageSchema = new mongoose.Schema({
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderType: { type: String, enum: ['user', 'support'], required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const SupportMessage = mongoose.model('SupportMessage', supportMessageSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed!'), false);
        }
    }
});

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Connect to MongoDB (replace with your connection string)
mongoose.connect('mongodb://localhost:27017/gallery_of_life', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log('Connected to MongoDB');

    // Create default admin user if it doesn't exist
    try {
        const existingAdmin = await User.findOne({ accountType: 'ADMIN' });
        if (!existingAdmin) {
            const adminUser = new User({
                email: 'admin@gallery.com',
                password: 'admin123',
                accountType: 'ADMIN',
                isApproved: true
            });
            await adminUser.save();
            console.log('Default admin user created: admin@gallery.com / admin123');
        } else {
            console.log('Admin user already exists');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
})
.catch(err => console.error('MongoDB connection error:', err));

// Routes

// Authentication routes
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, accountType } = req.body;
        const user = await User.findOne({ email, password, accountType });
        if (user) {
            if (user.isApproved || user.accountType === 'ADMIN') {
                res.json({ success: true, user: { id: user._id, email: user.email, accountType: user.accountType } });
            } else {
                res.status(403).json({ success: false, message: 'Account not approved yet' });
            }
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { email, password, accountType } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }
        const user = new User({ email, password, accountType });
        await user.save();
        res.json({ success: true, message: 'Registration successful, waiting for approval' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin routes
app.get('/api/admin/pending-users', async (req, res) => {
    try {
        const pendingUsers = await User.find({ isApproved: false, accountType: { $ne: 'ADMIN' } });
        res.json({ success: true, users: pendingUsers });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/admin/approve-user/:userId', async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.userId, { isApproved: true });
        res.json({ success: true, message: 'User approved' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/admin/reject-user/:userId', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.userId);
        res.json({ success: true, message: 'User rejected' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/admin/analytics', async (req, res) => {
    try {
        const { period = 'total', date, month, year } = req.query;

        let userMatch = {};
        let mediaMatch = {};
        let chartData = [];
        let chartLabels = [];
        let chartType = 'monthly'; // monthly, daily, hourly

        // Set date range based on period and filter
        if (period === 'daily' && date) {
            const targetDate = new Date(date);
            const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
            userMatch.createdAt = { $gte: startOfDay, $lte: endOfDay };
            mediaMatch.uploadDate = { $gte: startOfDay, $lte: endOfDay };

            // Get hourly data for the day
            chartType = 'hourly';
            chartLabels = Array.from({length: 24}, (_, i) => `${i}:00`);
            for (let hour = 0; hour < 24; hour++) {
                const startOfHour = new Date(targetDate);
                startOfHour.setHours(hour, 0, 0, 0);
                const endOfHour = new Date(targetDate);
                endOfHour.setHours(hour, 59, 59, 999);

                const userCount = await User.countDocuments({
                    createdAt: { $gte: startOfHour, $lte: endOfHour }
                });
                const mediaCount = await Media.countDocuments({
                    uploadDate: { $gte: startOfHour, $lte: endOfHour }
                });

                chartData.push({ hour: hour + 1, users: userCount, media: mediaCount });
            }
        } else if (period === 'monthly' && month) {
            const targetMonth = new Date(month);
            const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
            const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);
            userMatch.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
            mediaMatch.uploadDate = { $gte: startOfMonth, $lte: endOfMonth };

            // Get daily data for the month
            chartType = 'daily';
            const daysInMonth = endOfMonth.getDate();
            chartLabels = Array.from({length: daysInMonth}, (_, i) => `${i + 1}`);
            for (let day = 1; day <= daysInMonth; day++) {
                const startOfDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day, 0, 0, 0, 0);
                const endOfDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day, 23, 59, 59, 999);

                const userCount = await User.countDocuments({
                    createdAt: { $gte: startOfDay, $lte: endOfDay }
                });
                const mediaCount = await Media.countDocuments({
                    uploadDate: { $gte: startOfDay, $lte: endOfDay }
                });

                chartData.push({ day: day, users: userCount, media: mediaCount });
            }
        } else if (period === 'yearly' && year) {
            const targetYear = parseInt(year);
            const startOfYear = new Date(targetYear, 0, 1);
            const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);
            userMatch.createdAt = { $gte: startOfYear, $lte: endOfYear };
            mediaMatch.uploadDate = { $gte: startOfYear, $lte: endOfYear };

            // Get monthly data for the year
            chartType = 'monthly';
            chartLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            for (let month = 0; month < 12; month++) {
                const startOfMonth = new Date(targetYear, month, 1);
                const endOfMonth = new Date(targetYear, month + 1, 0, 23, 59, 59, 999);

                const userCount = await User.countDocuments({
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
                });
                const mediaCount = await Media.countDocuments({
                    uploadDate: { $gte: startOfMonth, $lte: endOfMonth }
                });

                chartData.push({ month: month + 1, users: userCount, media: mediaCount });
            }
        } else {
            // Default: current year monthly data
            const currentYear = new Date().getFullYear();
            chartType = 'monthly';
            chartLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            for (let month = 0; month < 12; month++) {
                const startOfMonth = new Date(currentYear, month, 1);
                const endOfMonth = new Date(currentYear, month + 1, 0, 23, 59, 59, 999);

                const userCount = await User.countDocuments({
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
                });
                const mediaCount = await Media.countDocuments({
                    uploadDate: { $gte: startOfMonth, $lte: endOfMonth }
                });

                chartData.push({ month: month + 1, users: userCount, media: mediaCount });
            }
        }

        // Check if there's any data for the selected period
        const hasData = chartData.some(item => item.users > 0 || item.media > 0);

        // Count user registrations
        const userRegistrations = await User.countDocuments(userMatch);

        // Count media uploads
        const mediaUploads = await Media.countDocuments(mediaMatch);

        const analytics = {
            userRegistrations,
            mediaUploads,
            period,
            filter: { date, month, year },
            chartData,
            chartLabels,
            chartType,
            hasData
        };

        res.json({ success: true, analytics });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// User routes
app.get('/api/user/media/:userId', async (req, res) => {
    try {
        const media = await Media.find({ userId: req.params.userId });
        res.json({ success: true, media });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/user/upload/:userId', upload.array('files', 10), async (req, res) => {
    try {
        const { album, notes } = req.body;
        const userId = req.params.userId;

        // Validate userId
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        const uploadedMedia = [];

        for (const file of req.files) {
            const media = new Media({
                userId,
                filename: file.filename,
                originalName: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                album: album || 'all',
                notes: notes || ''
            });
            await media.save();
            uploadedMedia.push(media);
        }

        res.json({
            success: true,
            message: `${uploadedMedia.length} file(s) uploaded successfully`,
            media: uploadedMedia
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
});

app.delete('/api/user/media/:mediaId', async (req, res) => {
    try {
        await Media.findByIdAndDelete(req.params.mediaId);
        res.json({ success: true, message: 'Media deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.put('/api/user/media/:mediaId', async (req, res) => {
    try {
        const { notes } = req.body;
        const media = await Media.findByIdAndUpdate(req.params.mediaId, { notes }, { new: true });
        if (!media) {
            return res.status(404).json({ success: false, message: 'Media not found' });
        }
        res.json({ success: true, media });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/user/albums/:userId', async (req, res) => {
    try {
        const albums = await Album.find({ userId: req.params.userId });
        res.json({ success: true, albums });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/user/albums/:userId', async (req, res) => {
    try {
        const { name, description } = req.body;
        const album = new Album({ userId: req.params.userId, name, description });
        await album.save();
        res.json({ success: true, album });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.delete('/api/user/albums/:userId/:albumName', async (req, res) => {
    try {
        const { userId, albumName } = req.params;
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Delete all media in this album
        const deleteResult = await Media.deleteMany({ userId: userObjectId, album: albumName });

        console.log(`Deleted ${deleteResult.deletedCount} media items from album "${albumName}"`);

        res.json({ success: true, message: `Album "${albumName}" and all its media deleted successfully` });
    } catch (error) {
        console.error('Delete album error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Support routes
app.post('/api/support/create-ticket', async (req, res) => {
    try {
        console.log('Create ticket request received:', req.body);
        const { userId, issueType, description } = req.body;

        // Validate required fields
        if (!userId || !issueType || !description) {
            console.log('Validation failed: missing fields');
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        console.log('Finding user with ID:', userId);
        // Get user details
        const user = await User.findById(userId);
        if (!user) {
            console.log('User not found');
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        console.log('User found:', user.email);

        // Create support ticket
        const ticket = new SupportTicket({
            userId,
            userEmail: user.email,
            issueType,
            description,
            status: 'open',
            priority: 'medium'
        });

        console.log('Saving ticket');
        await ticket.save();
        console.log('Ticket saved:', ticket._id);

        // Create initial message from user
        const initialMessage = new SupportMessage({
            ticketId: ticket._id,
            senderId: userId,
            senderType: 'user',
            message: description
        });

        console.log('Saving initial message');
        await initialMessage.save();
        console.log('Message saved');

        res.json({
            success: true,
            message: 'Support ticket created successfully',
            ticket: {
                id: ticket._id,
                issueType: ticket.issueType,
                status: ticket.status,
                createdAt: ticket.createdAt
            }
        });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/support/tickets/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const tickets = await SupportTicket.find({ userId }).sort({ createdAt: -1 });
        res.json({ success: true, tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/support/messages/:ticketId', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const messages = await SupportMessage.find({ ticketId })
            .populate('senderId', 'email accountType')
            .sort({ createdAt: 1 });
        res.json({ success: true, messages });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/support/send-message/:ticketId', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { userId, message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Message cannot be empty' });
        }

        // Verify ticket exists and user has access
        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        // Check if user owns the ticket or is support/admin
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isOwner = ticket.userId.toString() === userId;
        const isSupport = user.accountType === 'SUPPORT' || user.accountType === 'ADMIN';

        if (!isOwner && !isSupport) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Create message
        const newMessage = new SupportMessage({
            ticketId,
            senderId: userId,
            senderType: isSupport ? 'support' : 'user',
            message: message.trim()
        });

        await newMessage.save();

        // Update ticket timestamp
        await SupportTicket.findByIdAndUpdate(ticketId, { updatedAt: new Date() });

        // Populate sender info for real-time emission
        await newMessage.populate('senderId', 'email accountType');

        // Emit to all users in the ticket room for real-time updates
        io.to(ticketId).emit('new-message', newMessage);

        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin/Support routes for managing tickets
app.get('/api/admin/support/tickets', async (req, res) => {
    try {
        const tickets = await SupportTicket.find()
            .populate('userId', 'email')
            .populate('assignedTo', 'email')
            .sort({ createdAt: -1 });
        res.json({ success: true, tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.put('/api/admin/support/ticket/:ticketId', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status, priority, assignedTo, userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        // Check permission: allow if user owns the ticket or is support/admin
        const isOwner = ticket.userId.toString() === userId;
        const isSupport = user.accountType === 'SUPPORT' || user.accountType === 'ADMIN';
        if (!isOwner && !isSupport) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const updateData = {};
        if (status) updateData.status = status;
        if (priority) updateData.priority = priority;
        if (assignedTo) updateData.assignedTo = assignedTo;
        updateData.updatedAt = new Date();

        const updatedTicket = await SupportTicket.findByIdAndUpdate(ticketId, updateData, { new: true });
        res.json({ success: true, message: 'Ticket updated successfully', ticket: updatedTicket });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.delete('/api/support/ticket/:ticketId', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        // Check permission: only allow if user owns the ticket
        const isOwner = ticket.userId.toString() === userId;
        if (!isOwner) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Delete all messages associated with the ticket
        await SupportMessage.deleteMany({ ticketId });

        // Delete the ticket
        await SupportTicket.findByIdAndDelete(ticketId);

        res.json({ success: true, message: 'Ticket marked as solved and removed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'File too large' });
        }
    }
    if (error.message === 'Only image and video files are allowed!') {
        return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Unhandled error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a ticket room
    socket.on('join-ticket', (ticketId) => {
        socket.join(ticketId);
        console.log(`User ${socket.id} joined ticket ${ticketId}`);
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
        socket.to(data.ticketId).emit('user-typing', {
            userId: data.userId,
            isTyping: data.isTyping
        });
    });

    // Handle new message
    socket.on('send-message', async (data) => {
        try {
            const { ticketId, userId, message } = data;

            // Verify ticket exists and user has access
            const ticket = await SupportTicket.findById(ticketId);
            if (!ticket) {
                socket.emit('error', { message: 'Ticket not found' });
                return;
            }

            // Check if user owns the ticket or is support/admin
            const user = await User.findById(userId);
            if (!user) {
                socket.emit('error', { message: 'User not found' });
                return;
            }

            const isOwner = ticket.userId.toString() === userId;
            const isSupport = user.accountType === 'SUPPORT' || user.accountType === 'ADMIN';

            if (!isOwner && !isSupport) {
                socket.emit('error', { message: 'Access denied' });
                return;
            }

            // Create message
            const newMessage = new SupportMessage({
                ticketId,
                senderId: userId,
                senderType: isSupport ? 'support' : 'user',
                message: message.trim()
            });

            await newMessage.save();

            // Update ticket timestamp
            await SupportTicket.findByIdAndUpdate(ticketId, { updatedAt: new Date() });

            // Populate sender info
            await newMessage.populate('senderId', 'email accountType');

            // Emit to all users in the ticket room
            io.to(ticketId).emit('new-message', newMessage);

        } catch (error) {
            console.error('Socket send message error:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
