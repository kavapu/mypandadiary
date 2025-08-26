# 🐼 Panda Diary

A beautiful, minimalist diary web application with a music player and live clock. Built with vanilla HTML, CSS, and JavaScript featuring glassmorphism design and smooth animations.

## ✨ Features

- **📝 Daily Diary Entries**: Write and save your daily thoughts
- **🎵 Music Tracking**: Track what you're listening to each day
- **⏰ Live Clock**: Real-time date and time display
- **📱 Responsive Design**: Works perfectly on all devices
- **💾 Persistent Storage**: Your entries are saved securely
- **📚 Entry History**: View all your past diary entries
- **🎨 Beautiful UI**: Glassmorphism design with smooth animations

## 🚀 Live Demo

**Deployed on Render**: [Your Render URL will be here]

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (Flexbox/Grid, Glassmorphism), Vanilla JavaScript (ES6)
- **Backend**: Node.js, Express.js, SQLite3
- **Deployment**: Render (with persistent storage)
- **Design**: Google Fonts, CSS Animations, Responsive Layout

## 📁 Project Structure

```
mypandadiary/
├── index.html              # Main HTML file
├── style.css               # Styles with glassmorphism design
├── script.js               # Frontend JavaScript logic
├── render.yaml             # Render deployment configuration
├── package.json            # Root package configuration
├── backend/
│   ├── server.js           # Express server
│   ├── package.json        # Backend dependencies
│   ├── database/           # Database setup and models
│   ├── routes/             # API routes
│   └── middleware/         # Express middleware
├── assets/
│   ├── images/             # Panda images and icons
│   └── music/              # Music files (if any)
└── README.md               # This file
```

## 🎯 Key Features

### **Diary Functionality**
- Write daily entries with rich text support
- Automatic saving with LocalStorage backup
- Cross-device synchronization when online
- Entry history with search and navigation

### **Music Integration**
- Track external music (YouTube Music, Spotify, etc.)
- Save music info with diary entries
- Display current music in the interface

### **User Experience**
- Beautiful glassmorphism design
- Smooth page-flip animations
- Responsive layout for all screen sizes
- Touch-friendly interface
- Accessibility features

### **Data Persistence**
- SQLite database for server-side storage
- LocalStorage fallback for offline mode
- Automatic sync when connection is restored
- Secure device-based authentication

## 🚀 Deployment

This app is configured for deployment on **Render** with full database functionality.

### **Environment Variables**
```env
NODE_ENV=production
PORT=10000
DB_PATH=./panda_diary.db
CORS_ORIGIN=https://your-app-name.onrender.com
JWT_SECRET=your-secure-jwt-secret
```

### **Deployment Steps**
1. Connect your GitHub repository to Render
2. Configure as a Web Service
3. Set environment variables
4. Deploy!

## 🎨 Design Features

### **Glassmorphism**
- Semi-transparent cards with backdrop blur
- Soft shadows and rounded corners
- Layered depth effect

### **Color Scheme**
- Sky blue gradient background
- Cloud animations
- Consistent color palette

### **Typography**
- **UI Elements**: Poppins (clean, modern)
- **Diary Text**: Indie Flower / Gochi Hand (handwriting style)

## 📱 Responsive Design

- **Desktop**: Full two-column layout
- **Tablet**: Adaptive single-column layout
- **Mobile**: Touch-optimized interface
- **Landscape**: Optimized for horizontal viewing

## 🔧 Development

### **Local Setup**
```bash
# Clone the repository
git clone https://github.com/kavapu/mypandadiary.git
cd mypandadiary

# Install dependencies
npm install

# Start development server
npm run dev
```

### **Available Scripts**
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run init-db` - Initialize database

## 🎯 Use Cases

- **Personal Journaling**: Daily reflection and thoughts
- **Music Discovery**: Track and remember favorite songs
- **Mood Tracking**: Document daily emotions and experiences
- **Creative Writing**: Capture ideas and inspiration
- **Memory Keeping**: Preserve important moments and memories

## 🔒 Privacy & Security

- **Local Storage**: Entries saved in your browser
- **Device Authentication**: Secure device-based identification
- **No Personal Data**: No email or personal information required
- **Offline Capable**: Works without internet connection

## 🐼 About the Panda Theme

The panda represents:
- **Peacefulness**: Calm, mindful journaling experience
- **Simplicity**: Clean, uncluttered interface
- **Gentleness**: User-friendly, approachable design
- **Uniqueness**: Stands out from typical diary apps

## 📈 Future Enhancements

- [ ] **Mood Tracking**: Visual mood indicators
- [ ] **Photo Uploads**: Add images to entries
- [ ] **Export Feature**: Download entries as PDF/JSON
- [ ] **Tags & Categories**: Organize entries by topics
- [ ] **Search Functionality**: Find specific entries
- [ ] **Dark Mode**: Alternative color scheme
- [ ] **Backup & Sync**: Cloud storage integration

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 📄 License

MIT License - feel free to use and modify for your own projects.

---

**Made with ❤️ and 🐼 for mindful journaling**