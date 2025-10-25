const io = require('socket.io-client');

// Test Socket.IO functionality
async function testSocketIO() {
    console.log('Starting Socket.IO tests...');

    // Connect to server
    const socket = io('http://localhost:8080');

    socket.on('connect', () => {
        console.log('✓ Connected to server, socket ID:', socket.id);

        // Test joining a ticket room
        const ticketId = '68fc13f5e9660aeac7001f86'; // Use the ticket ID from previous test
        const userId = '68f9d71e9c12459d2e92919b'; // Admin user ID

        console.log('Joining ticket room:', ticketId);
        socket.emit('join-ticket', ticketId);

        // Test sending a message
        setTimeout(() => {
            console.log('Sending test message...');
            socket.emit('send-message', {
                ticketId: ticketId,
                userId: userId,
                message: 'Test message from Socket.IO'
            });
        }, 1000);

        // Test typing indicator
        setTimeout(() => {
            console.log('Testing typing indicator...');
            socket.emit('typing', {
                ticketId: ticketId,
                userId: userId,
                isTyping: true
            });

            setTimeout(() => {
                socket.emit('typing', {
                    ticketId: ticketId,
                    userId: userId,
                    isTyping: false
                });
            }, 2000);
        }, 2000);
    });

    socket.on('new-message', (message) => {
        console.log('✓ Received new message:', message);
    });

    socket.on('user-typing', (data) => {
        console.log('✓ Received typing indicator:', data);
    });

    socket.on('error', (error) => {
        console.log('✗ Socket error:', error);
    });

    socket.on('disconnect', () => {
        console.log('✓ Disconnected from server');
    });

    // Disconnect after 10 seconds
    setTimeout(() => {
        console.log('Disconnecting...');
        socket.disconnect();
    }, 10000);
}

testSocketIO();
