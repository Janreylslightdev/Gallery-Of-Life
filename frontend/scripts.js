// Gallery of Life - Frontend JavaScript

// Authentication and Navigation
function login(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            localStorage.setItem('user', JSON.stringify(result.user));
            redirectToDashboard(result.user.accountType);
        } else {
            alert(result.message);
        }
    })
    .catch(error => console.error('Login error:', error));
}

function signup(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    // Check if passwords match
    if (data.password !== data.confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    // Remove confirmPassword from data
    delete data.confirmPassword;

    fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            alert(result.message);
            showLoginForm();
        } else {
            alert(result.message);
        }
    })
    .catch(error => console.error('Signup error:', error));
}

function showSignupForm() {
    document.getElementById('loginContainer').classList.add('hidden');
    document.getElementById('signupContainer').classList.remove('hidden');
}

function showLoginForm() {
    document.getElementById('signupContainer').classList.add('hidden');
    document.getElementById('loginContainer').classList.remove('hidden');
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

function redirectToDashboard(accountType) {
    switch(accountType) {
        case 'ADMIN':
            window.location.href = 'admin.html';
            break;
        case 'USER':
            window.location.href = 'user.html';
            break;
        case 'SUPPORT':
            window.location.href = 'support.html';
            break;
    }
}

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

// Admin Dashboard Functions
function loadPendingUsers() {
    fetch('/api/admin/pending-users')
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            displayPendingUsers(result.users);
        }
    })
    .catch(error => console.error('Error loading pending users:', error));
}

function loadAnalytics() {
    fetch('/api/admin/analytics')
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            updateAnalyticsDisplay(result.analytics);
        }
    })
    .catch(error => console.error('Error loading analytics:', error));
}

function updateAnalyticsDisplay(analytics) {
    // This function is now handled in admin.html for the admin dashboard
    // Keeping for potential future use or other pages
    console.log('Analytics loaded:', analytics);
}

function displayPendingUsers(users) {
    const container = document.getElementById('pendingUsers');
    container.innerHTML = users.map(user => `
        <div class="flex justify-between items-center p-4 bg-gray-800 rounded-md">
            <div>
                <p class="font-medium">${user.email}</p>
                <p class="text-sm text-gray-400">Registered: ${new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
            <div class="space-x-2">
                <button class="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors" onclick="approveUser('${user._id}')">
                    Approve
                </button>
                <button class="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors" onclick="rejectUser('${user._id}')">
                    Reject
                </button>
            </div>
        </div>
    `).join('');
}

function approveUser(userId) {
    fetch(`/api/admin/approve-user/${userId}`, { method: 'POST' })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            loadPendingUsers();
            alert('User approved successfully');
        }
    })
    .catch(error => console.error('Error approving user:', error));
}

function rejectUser(userId) {
    fetch(`/api/admin/reject-user/${userId}`, { method: 'POST' })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            loadPendingUsers();
            alert('User rejected successfully');
        }
    })
    .catch(error => console.error('Error rejecting user:', error));
}

// User Dashboard Functions
let userMedia = [];

function loadUserMedia() {
    const user = checkAuth();
    if (!user) return;

    fetch(`/api/user/media/${user.id}`)
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            userMedia = result.media;
            displayUserMedia(result.media);
            loadUserAlbums(result.media);
            populateCarousel(result.media, 'all');
        }
    })
    .catch(error => console.error('Error loading media:', error));
}

function loadUserAlbums(media) {
    // Extract unique album names from media
    const albums = ['all', ...new Set(media.map(item => item.album).filter(album => album && album !== 'all'))];
    const albumsNav = document.getElementById('albumsNav');

    albumsNav.innerHTML = albums.map(album => `
        <button class="px-4 py-2 bg-gray-800 rounded-md hover:bg-neon hover:text-black transition-all duration-300 album-btn ${album === 'all' ? 'active' : ''}" data-album="${album}">
            ${album === 'all' ? 'All Media' : album}
        </button>
    `).join('');

    // Re-attach event listeners for album buttons
    const albumBtns = document.querySelectorAll('.album-btn');
    albumBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            albumBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterByAlbum(this.dataset.album);
            toggleDeleteAlbumBtn(this.dataset.album);
            populateCarousel(userMedia, this.dataset.album);
        });
    });
}

function displayUserMedia(media) {
    const container = document.getElementById('mediaGrid');
    container.innerHTML = media.map(item => `
        <div class="gradient-border media-item" data-album="${item.album || 'all'}">
            <div class="p-4">
                ${item.mimetype.startsWith('image/') ?
                    `<img src="/uploads/${item.filename}" alt="${item.originalName}" class="w-full h-32 object-cover rounded-md mb-2 hover-scale">` :
                    `<video class="w-full h-32 object-cover rounded-md mb-2 hover-scale">
                        <source src="/uploads/${item.filename}" type="${item.mimetype}">
                    </video>`
                }
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-400">${item.originalName}</span>
                    <div class="space-x-2">
                        <button class="text-neon hover:text-green-400 view-btn" title="View" onclick="viewMedia('${item._id}', '${item.filename}', '${item.originalName}', '${item.mimetype}', '${item.notes || ''}')">
                            &#x1F441;
                        </button>
                        <button class="text-blue-500 hover:text-blue-400 notes-btn" title="Add Notes" onclick="openNotesModal('${item._id}', '${item.notes || ''}')">
                            &#x270F;
                        </button>
                        <button class="text-neon hover:text-green-400 download-btn" title="Download" onclick="downloadMedia('${item.filename}', '${item.originalName}')">
                            &#x2193;
                        </button>
                        <button class="text-red-500 hover:text-red-400 delete-btn" title="Delete" onclick="deleteMedia('${item._id}')">
                            &#x2716;
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function uploadMedia(event) {
    event.preventDefault();
    const user = checkAuth();
    if (!user) return;

    const formData = new FormData(event.target);

    // Get the album name from the input field
    const albumInput = document.getElementById('albumInput');
    if (albumInput && albumInput.value.trim()) {
        formData.set('album', albumInput.value.trim());
    }

    fetch(`/api/user/upload/${user.id}`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            alert(result.message);
            loadUserMedia();
            closeUploadModal();
        } else {
            alert(result.message);
        }
    })
    .catch(error => console.error('Upload error:', error));
}

function deleteMedia(mediaId) {
    if (!confirm('Are you sure you want to delete this media?')) return;

    fetch(`/api/user/media/${mediaId}`, { method: 'DELETE' })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            loadUserMedia();
            alert('Media deleted successfully');
        }
    })
    .catch(error => console.error('Delete error:', error));
}

function downloadMedia(filename, originalName) {
    const link = document.createElement('a');
    link.href = `/uploads/${filename}`;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function showUploadModal() {
    document.getElementById('uploadModal').classList.remove('hidden');
    populateAlbumSelect();
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.add('hidden');
    document.getElementById('uploadForm').reset();
}

function populateAlbumSelect() {
    const user = checkAuth();
    if (!user) return;

    fetch(`/api/user/media/${user.id}`)
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            const albums = [...new Set(result.media.map(item => item.album).filter(album => album && album !== 'all'))];
            const albumList = document.getElementById('albumList');
            albumList.innerHTML = '';
            albums.forEach(album => {
                const option = document.createElement('option');
                option.value = album;
                albumList.appendChild(option);
            });
        }
    })
    .catch(error => console.error('Error loading albums:', error));
}

// View Media Functions
function viewMedia(mediaId, filename, originalName, mimetype, notes) {
    const viewModal = document.getElementById('viewModal');
    const viewContent = document.getElementById('viewContent');
    const viewTitle = document.getElementById('viewTitle');
    const notesText = document.getElementById('notesText');

    viewTitle.textContent = `View ${originalName}`;
    notesText.textContent = notes || 'No notes available.';

    if (mimetype.startsWith('image/')) {
        viewContent.innerHTML = `<img src="/uploads/${filename}" alt="${originalName}" class="max-w-full max-h-96 object-contain rounded-lg">`;
    } else if (mimetype.startsWith('video/')) {
        viewContent.innerHTML = `<video controls class="max-w-full max-h-96 rounded-lg"><source src="/uploads/${filename}" type="${mimetype}"></video>`;
    }

    viewModal.classList.remove('hidden');
}

function closeViewModal() {
    document.getElementById('viewModal').classList.add('hidden');
}

// Notes Functions
function openNotesModal(mediaId, currentNotes) {
    const notesModal = document.getElementById('notesModal');
    const notesMediaId = document.getElementById('notesMediaId');
    const editNotesInput = document.getElementById('editNotesInput');

    notesMediaId.value = mediaId;
    editNotesInput.value = currentNotes || '';

    notesModal.classList.remove('hidden');
}

function closeNotesModal() {
    document.getElementById('notesModal').classList.add('hidden');
    document.getElementById('notesForm').reset();
}

function saveNotes(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    fetch(`/api/user/media/${data.mediaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: data.notes })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            alert('Notes updated successfully');
            loadUserMedia();
            closeNotesModal();
        } else {
            alert(result.message);
        }
    })
    .catch(error => console.error('Save notes error:', error));
}

// Carousel Functions
function populateCarousel(media, album) {
    const carousel = document.getElementById('carousel');
    let filteredMedia = media;

    if (album !== 'all') {
        filteredMedia = media.filter(item => item.album === album);
    }

    // Shuffle the media array to get random order
    const shuffledMedia = [...filteredMedia].sort(() => Math.random() - 0.5);

    // Take up to 5 random items
    const featuredMedia = shuffledMedia.slice(0, 5);

    if (featuredMedia.length === 0) {
        carousel.innerHTML = `
            <div class="carousel-item flex-shrink-0 w-full">
                <div class="w-full h-64 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                    No media available in this album
                </div>
            </div>
        `;
        return;
    }

    carousel.innerHTML = featuredMedia.map(item => `
        <div class="carousel-item flex-shrink-0 w-full">
            <div class="w-full h-64 bg-gradient-to-br from-neon to-blue-400 rounded-lg overflow-hidden hover-scale cursor-pointer" onclick="viewMedia('${item._id}', '${item.filename}', '${item.originalName}', '${item.mimetype}', '${item.notes || ''}')">
                ${item.mimetype.startsWith('image/') ?
                    `<img src="/uploads/${item.filename}" alt="${item.originalName}" class="w-full h-full object-cover">` :
                    `<video class="w-full h-full object-cover">
                        <source src="/uploads/${item.filename}" type="${item.mimetype}">
                    </video>`
                }
                <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
                    <p class="font-semibold">${item.originalName}</p>
                    <p class="text-sm">${item.album || 'All Media'}</p>
                </div>
            </div>
        </div>
    `).join('');

    initCarousel();
}

function initCarousel() {
    const carousel = document.getElementById('carousel');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    let currentIndex = 0;

    function updateCarousel() {
        const items = carousel.children;
        for (let i = 0; i < items.length; i++) {
            items[i].style.transform = `translateX(-${currentIndex * 100}%)`;
        }
    }

    prevBtn.addEventListener('click', () => {
        currentIndex = currentIndex > 0 ? currentIndex - 1 : carousel.children.length - 1;
        updateCarousel();
    });

    nextBtn.addEventListener('click', () => {
        currentIndex = currentIndex < carousel.children.length - 1 ? currentIndex + 1 : 0;
        updateCarousel();
    });

    // Auto-play
    setInterval(() => {
        currentIndex = currentIndex < carousel.children.length - 1 ? currentIndex + 1 : 0;
        updateCarousel();
    }, 5000);
}

// Album Functions
function filterByAlbum(album) {
    const items = document.querySelectorAll('.media-item');
    items.forEach(item => {
        if (album === 'all' || item.dataset.album === album) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function toggleDeleteAlbumBtn(album) {
    const deleteBtn = document.getElementById('deleteAlbumBtn');
    if (album === 'all') {
        deleteBtn.classList.add('hidden');
    } else {
        deleteBtn.classList.remove('hidden');
        deleteBtn.onclick = () => deleteAlbum(album);
    }
}

function deleteAlbum(albumName) {
    if (!confirm(`Are you sure you want to delete the album "${albumName}"? All media in this album will be permanently deleted.`)) return;

    const user = checkAuth();
    if (!user) return;

    fetch(`/api/user/albums/${user.id}/${albumName}`, { method: 'DELETE' })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            alert('Album deleted successfully');
            loadUserMedia();
        } else {
            alert(result.message);
        }
    })
    .catch(error => console.error('Delete album error:', error));
}

// Support Chat Functions
function loadSupportTickets() {
    const user = checkAuth();
    if (!user) return;

    const endpoint = (user.accountType === 'SUPPORT' || user.accountType === 'ADMIN')
        ? '/api/admin/support/tickets'
        : `/api/support/tickets/${user.id}`;

    fetch(endpoint)
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            displaySupportTickets(result.tickets, user.accountType);
        }
    })
    .catch(error => console.error('Error loading tickets:', error));
}

function displaySupportTickets(tickets, accountType) {
    const container = document.getElementById('activeChats');
    container.innerHTML = tickets.map(ticket => {
        const userName = accountType === 'SUPPORT' || accountType === 'ADMIN' ? ticket.userId.email : ticket.userEmail;
        const issue = ticket.issueType || ticket.issue;
        return `
        <div class="p-3 bg-gray-800 rounded-md cursor-pointer hover:bg-gray-700 transition-colors chat-item" data-user="${ticket._id}" onclick="selectChat(event, '${ticket._id}', '${userName}')">
            <div class="flex justify-between items-center">
                <div>
                    <p class="font-medium">${userName}</p>
                    <p class="text-sm text-gray-400">${issue}</p>
                </div>
                <div class="text-right">
                    <p class="text-xs text-gray-500">${new Date(ticket.updatedAt || ticket.createdAt).toLocaleString()}</p>
                    <span class="inline-block w-2 h-2 bg-${ticket.status === 'open' ? 'red' : ticket.status === 'in-progress' ? 'yellow' : 'green'}-500 rounded-full"></span>
                </div>
            </div>
        </div>
    `}).join('');
}

function selectChat(event, ticketId, userName) {
    // Remove active class from all chat items
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    // Add active class to selected chat
    event.currentTarget.classList.add('active');

    document.getElementById('chatTitle').textContent = `Chat with ${userName}`;
    loadChatMessages(ticketId);

    // Initialize Socket.IO connection for real-time messaging
    initializeSocketIO(ticketId);
}

function loadChatMessages(ticketId) {
    fetch(`/api/support/messages/${ticketId}`)
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            displayChatMessages(result.messages);
        }
    })
    .catch(error => console.error('Error loading messages:', error));
}

function displayChatMessages(messages) {
    const container = document.getElementById('chatMessages');
    const currentScrollTop = container.scrollTop;
    const isAtBottom = container.scrollHeight - container.scrollTop === container.clientHeight;

    container.innerHTML = messages.map(msg => `
        <div class="chat-message mb-4 ${msg.senderType === 'support' ? 'flex items-start space-x-3 justify-end' : 'flex items-start space-x-3'}">
            ${msg.senderType === 'user' ? `
                <div class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                    U
                </div>
            ` : ''}
            <div class="flex-1 ${msg.senderType === 'support' ? 'text-right' : ''}">
                <p class="text-sm text-gray-400 mb-1">${msg.senderType === 'support' ? 'You' : msg.senderId.email} • ${new Date(msg.createdAt).toLocaleString()}</p>
                <div class="bg-${msg.senderType === 'support' ? 'neon text-black' : 'gray-800'} p-3 rounded-lg ${msg.senderType === 'support' ? 'inline-block' : ''}">
                    <p>${msg.message}</p>
                </div>
            </div>
            ${msg.senderType === 'support' ? `
                <div class="w-8 h-8 bg-neon text-black rounded-full flex items-center justify-center text-sm font-medium">
                    S
                </div>
            ` : ''}
        </div>
    `).join('');

    // Maintain scroll position or scroll to bottom if was at bottom
    if (isAtBottom) {
        container.scrollTop = container.scrollHeight;
    } else {
        container.scrollTop = currentScrollTop;
    }
}

function sendMessage(event) {
    event.preventDefault();
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    if (!message) return;

    const user = checkAuth();
    if (!user) return;

    const currentChat = document.querySelector('.chat-item.active');
    if (currentChat) {
        const ticketId = currentChat.dataset.user;

        // Immediately add the message to UI for instant feedback
        const container = document.getElementById('chatMessages');
        const isAtBottom = container.scrollHeight - container.scrollTop === container.clientHeight;

        const newMessageHTML = `
            <div class="chat-message mb-4 flex items-start space-x-3 justify-end">
                <div class="flex-1 text-right">
                    <p class="text-sm text-gray-400 mb-1">You • ${new Date().toLocaleString()}</p>
                    <div class="bg-neon text-black p-3 rounded-lg inline-block">
                        <p>${message}</p>
                    </div>
                </div>
                <div class="w-8 h-8 bg-neon text-black rounded-full flex items-center justify-center text-sm font-medium">
                    S
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', newMessageHTML);

        // Scroll to bottom if was at bottom
        if (isAtBottom) {
            container.scrollTop = container.scrollHeight;
        }

        // Clear input immediately
        messageInput.value = '';

        // Send to server
        fetch(`/api/support/send-message/${ticketId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, message })
        })
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                // If sending failed, remove the optimistic message and show error
                const messages = container.querySelectorAll('.chat-message');
                if (messages.length > 0) {
                    messages[messages.length - 1].remove();
                }
                alert('Failed to send message: ' + result.message);
                messageInput.value = message; // Restore the message
            }
        })
        .catch(error => {
            console.error('Send message error:', error);
            // Remove the optimistic message on error
            const messages = container.querySelectorAll('.chat-message');
            if (messages.length > 0) {
                messages[messages.length - 1].remove();
            }
            alert('Failed to send message. Please try again.');
            messageInput.value = message; // Restore the message
        });
    }
}

// User Support Tickets Functions
function loadUserSupportTickets() {
    const user = checkAuth();
    if (!user) return;

    fetch(`/api/support/tickets/${user.id}`)
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            displayUserSupportTickets(result.tickets);
        }
    })
    .catch(error => console.error('Error loading user support tickets:', error));
}

function displayUserSupportTickets(tickets) {
    const container = document.getElementById('supportTickets');
    if (!container) return;

    if (tickets.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                </svg>
                <p>No support tickets yet</p>
                <p class="text-sm">Need help? Click the support button below.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = tickets.slice(0, 2).map(ticket => {
        const statusColor = ticket.status === 'open' ? 'red' : ticket.status === 'in-progress' ? 'yellow' : 'green';
        const statusText = ticket.status === 'open' ? 'Open' : ticket.status === 'in-progress' ? 'In Progress' : 'Resolved';
        const hasNewMessage = ticket.lastMessageFromSupport && new Date(ticket.lastMessageFromSupport) > new Date(ticket.lastViewedByUser || 0);

        return `
        <div class="p-4 bg-gray-800 rounded-md border-l-4 ${hasNewMessage ? 'border-neon bg-gray-750' : 'border-gray-600'}">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-2">
                        <span class="inline-block w-3 h-3 bg-${statusColor}-500 rounded-full"></span>
                        <span class="font-medium text-${statusColor}-400">${statusText}</span>
                        ${hasNewMessage ? '<span class="text-neon text-sm font-semibold">New Reply</span>' : ''}
                    </div>
                    <p class="font-semibold mb-1">${ticket.issueType || ticket.issue}</p>
                    <p class="text-sm text-gray-400 mb-2">${ticket.description}</p>
                    <p class="text-xs text-gray-500">Created: ${new Date(ticket.createdAt).toLocaleDateString()}</p>
                    ${ticket.updatedAt !== ticket.createdAt ? `<p class="text-xs text-gray-500">Last updated: ${new Date(ticket.updatedAt).toLocaleDateString()}</p>` : ''}
                </div>
                <div class="flex space-x-2">
                    <button class="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm" onclick="markTicketSolved('${ticket._id}')">
                        Issue Solved
                    </button>
                    <button class="px-3 py-1 bg-neon text-black rounded-md hover:bg-green-400 transition-colors text-sm" onclick="viewTicketDetails('${ticket._id}')">
                        View Details
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
}

function viewTicketDetails(ticketId) {
    // Open ticket chat modal instead of redirecting
    const modal = document.getElementById('ticketChatModal');
    const title = document.getElementById('ticketChatTitle');
    const messagesContainer = document.getElementById('ticketChatMessages');

    title.textContent = 'Support Chat';
    messagesContainer.innerHTML = '<div class="text-center text-gray-400">Loading messages...</div>';
    modal.dataset.ticketId = ticketId; // Store ticket ID for sending messages
    modal.classList.remove('hidden');

    // Load chat messages for this ticket
    loadTicketChatMessages(ticketId);
}

function markTicketSolved(ticketId) {
    if (!confirm('Are you sure you want to mark this ticket as solved? This will delete the ticket and all its messages.')) return;

    const user = checkAuth();
    if (!user) return;

    fetch(`/api/support/ticket/${ticketId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            alert('Ticket marked as solved and removed successfully');
            loadUserSupportTickets(); // Refresh the tickets list
        } else {
            alert(result.message);
        }
    })
    .catch(error => console.error('Error marking ticket as solved:', error));
}

function loadTicketChatMessages(ticketId) {
    const user = checkAuth();
    if (!user) return;

    fetch(`/api/support/messages/${ticketId}`)
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            displayTicketChatMessages(result.messages, user.accountType);
        }
    })
    .catch(error => console.error('Error loading ticket chat messages:', error));
}

function displayTicketChatMessages(messages, accountType) {
    const container = document.getElementById('ticketChatMessages');
    container.innerHTML = messages.map(msg => {
        const isFromSupport = msg.senderType === 'support';
        const isCurrentUser = accountType === 'USER' ? !isFromSupport : isFromSupport; // For users: support left, user right; For support/admin: support right, user left
        return `
        <div class="flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4">
            <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isCurrentUser ? 'bg-neon text-black' : 'bg-gray-700 text-white'}">
                <p class="text-sm">${msg.message}</p>
                <p class="text-xs ${isCurrentUser ? 'text-gray-800' : 'text-gray-400'} mt-1">${new Date(msg.createdAt).toLocaleString()}</p>
            </div>
        </div>
    `}).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function sendTicketMessage(event) {
    event.preventDefault();
    const messageInput = document.getElementById('ticketMessageInput');
    const message = messageInput.value.trim();
    if (!message) return;

    const user = checkAuth();
    if (!user) return;

    // Get ticket ID from modal (we need to store it when opening the modal)
    const modal = document.getElementById('ticketChatModal');
    const ticketId = modal.dataset.ticketId;

    if (!ticketId) return;

    fetch(`/api/support/send-message/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, message })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            messageInput.value = '';
            loadTicketChatMessages(ticketId);
        } else {
            alert('Error sending message: ' + result.message);
        }
    })
    .catch(error => console.error('Send ticket message error:', error));
}

function closeTicketChatModal() {
    document.getElementById('ticketChatModal').classList.add('hidden');
}

function viewAllTickets() {
    window.location.href = 'support.html';
}

// Auto-refresh intervals (in milliseconds)
const AUTO_REFRESH_INTERVALS = {
    USER_DASHBOARD: 30000, // 30 seconds
    ADMIN_DASHBOARD: 30000, // 30 seconds
    SUPPORT_DASHBOARD: 15000, // 15 seconds
    CHAT_MESSAGES: 2000 // 2 seconds when chat is active for faster updates
};

// Auto-refresh timers
let userDashboardTimer;
let adminDashboardTimer;
let supportDashboardTimer;
let chatMessagesTimer;

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', login);
    }

    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', signup);
    }

    // Signup link
    const signupLink = document.getElementById('signupLink');
    if (signupLink) {
        signupLink.addEventListener('click', function(e) {
            e.preventDefault();
            showSignupForm();
        });
    }

    // Back to login link
    const backToLogin = document.getElementById('backToLogin');
    if (backToLogin) {
        backToLogin.addEventListener('click', function(e) {
            e.preventDefault();
            showLoginForm();
        });
    }

    // Logout buttons
    const logoutBtns = document.querySelectorAll('#logoutBtn');
    logoutBtns.forEach(btn => btn.addEventListener('click', logout));

    // Admin dashboard
    if (window.location.pathname.includes('admin.html')) {
        checkAuth();
        loadPendingUsers();
        loadAnalytics();

        // Start auto-refresh for admin dashboard
        startAdminAutoRefresh();
    }

    // User dashboard
    if (window.location.pathname.includes('user.html')) {
        const user = checkAuth();
        if (user) {
            loadUserMedia();
            loadUserSupportTickets();
            initCarousel();

            // Start auto-refresh for user dashboard
            startUserAutoRefresh();

            // Album navigation
            const albumBtns = document.querySelectorAll('.album-btn');
            albumBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    albumBtns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    filterByAlbum(this.dataset.album);
                });
            });

            // Upload modal
            const uploadBtn = document.getElementById('uploadBtn');
            if (uploadBtn) uploadBtn.addEventListener('click', showUploadModal);

            const cancelUpload = document.getElementById('cancelUpload');
            if (cancelUpload) cancelUpload.addEventListener('click', closeUploadModal);

            const uploadForm = document.getElementById('uploadForm');
            if (uploadForm) uploadForm.addEventListener('submit', uploadMedia);

            // View modal
            const closeViewModalBtn = document.getElementById('closeViewModal');
            if (closeViewModalBtn) closeViewModalBtn.addEventListener('click', closeViewModal);

            // Notes modal
            const cancelNotes = document.getElementById('cancelNotes');
            if (cancelNotes) cancelNotes.addEventListener('click', closeNotesModal);

            const notesForm = document.getElementById('notesForm');
            if (notesForm) notesForm.addEventListener('submit', saveNotes);

            // Ticket chat modal
            const ticketMessageForm = document.getElementById('ticketMessageForm');
            if (ticketMessageForm) ticketMessageForm.addEventListener('submit', sendTicketMessage);

            const closeTicketChatModalBtn = document.getElementById('closeTicketChatModal');
            if (closeTicketChatModalBtn) closeTicketChatModalBtn.addEventListener('click', closeTicketChatModal);
        }
    }

    // Support dashboard
    if (window.location.pathname.includes('support.html')) {
        checkAuth();
        loadSupportTickets();

        // Start auto-refresh for support dashboard
        startSupportAutoRefresh();

        const messageForm = document.getElementById('messageForm');
        if (messageForm) messageForm.addEventListener('submit', sendMessage);

        // Notification panel
        const notificationBtn = document.getElementById('notificationBtn');
        const notificationPanel = document.getElementById('notificationPanel');
        const closeNotifications = document.getElementById('closeNotifications');

        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                notificationPanel.classList.toggle('translate-x-full');
            });
        }

        if (closeNotifications) {
            closeNotifications.addEventListener('click', () => {
                notificationPanel.classList.add('translate-x-full');
            });
        }
    }
});

// Auto-refresh functions
function startUserAutoRefresh() {
    // Clear any existing timer
    if (userDashboardTimer) {
        clearInterval(userDashboardTimer);
    }

    // Start auto-refresh for user media and support tickets
    userDashboardTimer = setInterval(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && window.location.pathname.includes('user.html')) {
            loadUserMedia();
            loadUserSupportTickets();
        } else {
            clearInterval(userDashboardTimer);
        }
    }, AUTO_REFRESH_INTERVALS.USER_DASHBOARD);
}

function startAdminAutoRefresh() {
    // Clear any existing timer
    if (adminDashboardTimer) {
        clearInterval(adminDashboardTimer);
    }

    // Start auto-refresh for admin analytics and pending users
    adminDashboardTimer = setInterval(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && (user.accountType === 'ADMIN') && window.location.pathname.includes('admin.html')) {
            loadPendingUsers();
            loadAnalytics();
        } else {
            clearInterval(adminDashboardTimer);
        }
    }, AUTO_REFRESH_INTERVALS.ADMIN_DASHBOARD);
}

function startSupportAutoRefresh() {
    // Clear any existing timer
    if (supportDashboardTimer) {
        clearInterval(supportDashboardTimer);
    }

    // Start auto-refresh for support tickets
    supportDashboardTimer = setInterval(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && (user.accountType === 'SUPPORT' || user.accountType === 'ADMIN') && window.location.pathname.includes('support.html')) {
            loadSupportTickets();

            // Also refresh active chat messages if a chat is selected
            const activeChat = document.querySelector('.chat-item.active');
            if (activeChat) {
                const ticketId = activeChat.dataset.user;
                loadChatMessages(ticketId);
            }
        } else {
            clearInterval(supportDashboardTimer);
        }
    }, AUTO_REFRESH_INTERVALS.SUPPORT_DASHBOARD);
}

function startChatAutoRefresh(ticketId) {
    // Clear any existing chat timer
    if (chatMessagesTimer) {
        clearInterval(chatMessagesTimer);
    }

    // Start auto-refresh for chat messages
    chatMessagesTimer = setInterval(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && ticketId) {
            loadChatMessages(ticketId);
        } else {
            clearInterval(chatMessagesTimer);
        }
    }, AUTO_REFRESH_INTERVALS.CHAT_MESSAGES);
}

function stopChatAutoRefresh() {
    if (chatMessagesTimer) {
        clearInterval(chatMessagesTimer);
        chatMessagesTimer = null;
    }
}

// Socket.IO Functions
let socket;

function initializeSocketIO(ticketId) {
    // Disconnect existing socket if any
    if (socket) {
        socket.disconnect();
    }

    // Initialize Socket.IO connection
    socket = io();

    // Join the ticket room
    socket.emit('join-ticket', ticketId);

    // Listen for new messages
    socket.on('new-message', (message) => {
        // Add the new message to the chat without refreshing
        appendNewMessage(message);
    });

    // Listen for typing indicators
    socket.on('user-typing', (data) => {
        showTypingIndicator(data.userId, data.isTyping);
    });
}

function appendNewMessage(message) {
    const container = document.getElementById('chatMessages');
    const isAtBottom = container.scrollHeight - container.scrollTop === container.clientHeight;

    const messageHTML = `
        <div class="chat-message mb-4 ${message.senderType === 'support' ? 'flex items-start space-x-3 justify-end' : 'flex items-start space-x-3'}">
            ${message.senderType === 'user' ? `
                <div class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                    U
                </div>
            ` : ''}
            <div class="flex-1 ${message.senderType === 'support' ? 'text-right' : ''}">
                <p class="text-sm text-gray-400 mb-1">${message.senderType === 'support' ? 'You' : message.senderId.email} • ${new Date(message.createdAt).toLocaleString()}</p>
                <div class="bg-${message.senderType === 'support' ? 'neon text-black' : 'gray-800'} p-3 rounded-lg ${message.senderType === 'support' ? 'inline-block' : ''}">
                    <p>${message.message}</p>
                </div>
            </div>
            ${message.senderType === 'support' ? `
                <div class="w-8 h-8 bg-neon text-black rounded-full flex items-center justify-center text-sm font-medium">
                    S
                </div>
            ` : ''}
        </div>
    `;

    container.insertAdjacentHTML('beforeend', messageHTML);

    // Scroll to bottom if was at bottom
    if (isAtBottom) {
        container.scrollTop = container.scrollHeight;
    }
}

function showTypingIndicator(userId, isTyping) {
    const container = document.getElementById('chatMessages');
    let typingIndicator = document.getElementById('typing-indicator');

    if (isTyping) {
        if (!typingIndicator) {
            typingIndicator = document.createElement('div');
            typingIndicator.id = 'typing-indicator';
            typingIndicator.className = 'mb-4 flex items-start space-x-3';
            typingIndicator.innerHTML = `
                <div class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                    U
                </div>
                <div class="flex-1">
                    <div class="bg-gray-800 p-3 rounded-lg inline-block">
                        <div class="flex space-x-1">
                            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(typingIndicator);
        }
    } else {
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
}

function sendMessage(event) {
    event.preventDefault();
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    if (!message) return;

    const user = checkAuth();
    if (!user) return;

    const currentChat = document.querySelector('.chat-item.active');
    if (currentChat) {
        const ticketId = currentChat.dataset.user;

        // Emit typing stop
        if (socket) {
            socket.emit('stop-typing', ticketId);
        }

        // Clear input immediately
        messageInput.value = '';

        // Immediately add the message to UI for instant feedback
        const container = document.getElementById('chatMessages');
        const isAtBottom = container.scrollHeight - container.scrollTop === container.clientHeight;

        const newMessageHTML = `
            <div class="chat-message mb-4 flex items-start space-x-3 justify-end">
                <div class="flex-1 text-right">
                    <p class="text-sm text-gray-400 mb-1">You • ${new Date().toLocaleString()}</p>
                    <div class="bg-neon text-black p-3 rounded-lg inline-block">
                        <p>${message}</p>
                    </div>
                </div>
                <div class="w-8 h-8 bg-neon text-black rounded-full flex items-center justify-center text-sm font-medium">
                    S
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', newMessageHTML);

        // Scroll to bottom if was at bottom
        if (isAtBottom) {
            container.scrollTop = container.scrollHeight;
        }

        // Send via Socket.IO if connected, otherwise fallback to HTTP
        if (socket) {
            socket.emit('send-message', {
                ticketId: ticketId,
                userId: user.id,
                message: message
            });
        } else {
            // Fallback to HTTP request
            fetch(`/api/support/send-message/${ticketId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, message })
            })
            .then(response => response.json())
            .then(result => {
                if (!result.success) {
                    // If sending failed, remove the optimistic message and show error
                    const messages = container.querySelectorAll('.chat-message');
                    if (messages.length > 0) {
                        messages[messages.length - 1].remove();
                    }
                    alert('Failed to send message: ' + result.message);
                    messageInput.value = message; // Restore the message
                }
            })
            .catch(error => {
                console.error('Send message error:', error);
                // Remove the optimistic message on error
                const messages = container.querySelectorAll('.chat-message');
                if (messages.length > 0) {
                    messages[messages.length - 1].remove();
                }
                alert('Failed to send message. Please try again.');
                messageInput.value = message; // Restore the message
            });
        }
    }
}

// Typing indicator functions
let typingTimer;

function handleTyping() {
    const currentChat = document.querySelector('.chat-item.active');
    if (currentChat && socket) {
        const ticketId = currentChat.dataset.user;
        socket.emit('start-typing', ticketId);

        // Clear existing timer
        clearTimeout(typingTimer);

        // Set timer to stop typing indicator after 1 second of no typing
        typingTimer = setTimeout(() => {
            socket.emit('stop-typing', ticketId);
        }, 1000);
    }
}
