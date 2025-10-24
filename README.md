# Gallery of Life

A modern, futuristic gallery website with smooth animations and a clean user interface. Supports three account types: ADMIN, USER, and SUPPORT.

## Features

### ADMIN
- Dashboard with analytics showing user registrations (daily, monthly, yearly) using interactive bar graphs
- Ability to approve or reject new user registrations

### USER
- Personal account dashboard for uploading pictures and videos
- Create and manage albums
- Delete and download media
- Smooth hover animations and carousel displays for images and videos
- Clear navigation for albums

### SUPPORT
- Chat interface for users to report account issues
- Notifications and user-friendly messaging interface

## Design Features
- Futuristic yet minimalist design with visually appealing aesthetics
- Smooth animations for interactions (hover, upload, download, navigation)
- Responsive layout suitable for desktop and mobile
- Carousels for featured images/videos and albums
- Clean typography with subtle neon or gradient accents
- Dark mode with neon highlights, gradients, and soft shadows

## Tech Stack
- **Frontend**: HTML, CSS (TailwindCSS), JavaScript
- **Backend**: Node.js with Express
- **Database**: MongoDB (recommended)

## Setup Instructions

### Prerequisites
- Node.js installed
- MongoDB installed and running

### Installation
1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   node backend/server.js
   ```
4. Open your browser and navigate to `http://localhost:3000`

### Database Setup
1. Install MongoDB
2. Start MongoDB service
3. The application will connect to `mongodb://localhost:27017/gallery_of_life`

### File Storage
For production, consider using cloud storage solutions like AWS S3 or Google Cloud Storage for media files. For demo purposes, files can be stored locally.

## Project Structure
```
gallery-of-life/
├── frontend/
│   ├── index.html      # Landing page with login
│   ├── admin.html      # Admin dashboard
│   ├── user.html       # User dashboard
│   ├── support.html    # Support chat interface
│   └── scripts.js      # JavaScript interactions
├── backend/
│   └── server.js       # Express server with API routes
├── package.json
├── README.md
└── TODO.md
```

## Usage
1. Open `index.html` in your browser
2. Select your account type (USER, ADMIN, or SUPPORT)
3. Login with mock credentials (any email/password combination works for demo)
4. Explore the respective dashboard features

## Future Enhancements
- Real user authentication with JWT
- File upload functionality
- Real-time chat for support
- Advanced analytics for admin
- Media processing and optimization
- User profile management
