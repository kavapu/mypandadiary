# 🐼 My Panda Diary

A beautiful, minimalist diary web application with a Node.js backend, featuring glassmorphism design, responsive layout, and cloud storage capabilities.

![Panda Diary Preview](https://img.shields.io/badge/Status-Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

### 📅 Live Clock & Date
- **Real-time clock** that updates every second
- **Current date** and day of the week display
- **Beautiful typography** with clean, readable fonts

### 📖 Diary Management
- **Handwriting-style font** (Indie Flower/Gochi Hand) for authentic diary feel
- **Cloud storage** with Node.js backend and SQLite database
- **LocalStorage fallback** for offline functionality
- **Date navigation** - browse through past and future entries
- **Page flip animation** when navigating between days
- **Auto-save functionality** with 2-second debounce
- **Entry history** with modal view of all past entries
- **External music tracking** - save what you're listening to

### 🎵 Music Tracking
- **External music input** - manually enter what you're listening to
- **Music history** - see what music was playing with each diary entry
- **Default "Song of the Day"** display when no external music is set

### 🎨 Design & UX
- **Glassmorphism design** with semi-transparent, blurred cards
- **Sky background** with animated cloud effects
- **Fully responsive layout** that works on desktop, tablet, and mobile
- **Smooth animations** and hover effects
- **Cute panda mascot** with bounce animation on save
- **Touch-friendly** design for mobile devices

### ⌨️ Keyboard Shortcuts
- `Ctrl/Cmd + S` - Save diary entry
- `Left Arrow` - Previous day
- `Right Arrow` - Next day

## 🚀 Quick Start

### Prerequisites
- **Node.js** (version 14.0.0 or higher)
- **npm** or **yarn**

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kavapu/mypandadiary.git
   cd mypandadiary
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp config.env.example config.env
   # Edit config.env with your preferred settings
   ```

4. **Initialize the database:**
   ```bash
   npm run init-db
   ```

5. **Start the server:**
   ```bash
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

6. **Open** `http://localhost:3000` in your browser

## 📁 Project Structure

```
mypandadiary/
├── index.html              # Main HTML structure
├── style.css               # All styling and animations
├── script.js               # Frontend JavaScript with API integration
├── README.md               # This file
├── .gitignore              # Git ignore rules
├── vercel.json             # Vercel deployment configuration
├── assets/
│   └── images/
│       └── panda-circular-symbol.svg  # Cute panda mascot
└── backend/                # Node.js + Express + SQLite backend
    ├── server.js           # Main Express server
    ├── package.json        # Backend dependencies
    ├── config.env.example  # Environment configuration template
    ├── database/           # Database setup and connection
    │   ├── connection.js   # Database connection utilities
    │   └── init.js         # Database initialization
    ├── models/             # Data models
    │   └── DiaryEntry.js   # Diary entry model
    ├── routes/             # API endpoints
    │   └── entries.js      # Diary entries API routes
    └── middleware/         # Request middleware
        └── deviceId.js     # Device identification middleware
```

## 🔧 Configuration

### Environment Variables

Create a `config.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_PATH=./database/panda_diary.db

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

## 🌐 API Endpoints

The backend provides a RESTful API for diary entries:

- `GET /api/entries` - Get all entries for the device
- `GET /api/entries/:date` - Get entry for specific date
- `POST /api/entries` - Create new entry
- `PUT /api/entries/:date` - Update existing entry
- `PATCH /api/entries/:date` - Upsert entry (create or update)
- `DELETE /api/entries/:date` - Delete entry
- `GET /api/entries/range/:startDate/:endDate` - Get entries in date range
- `GET /api/health` - Health check
- `GET /api` - API documentation

### Authentication
The API uses device-based authentication via the `X-Device-ID` header. Each device gets a unique UUID that's automatically generated and stored in the browser's localStorage.

## 🚀 Deployment

### Vercel (Recommended)
This project is configured for easy deployment on Vercel:

1. **Connect your GitHub repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy** - Vercel will automatically build and deploy your app

### Other Platforms
See `DEPLOYMENT.md` for detailed deployment instructions for:
- Heroku
- Railway
- DigitalOcean App Platform
- VPS deployment

## 🎨 Customization

### Adding Custom Music
The app now supports external music input. Users can manually enter what they're listening to, which gets saved with their diary entries.

### Styling
- Modify `style.css` to change colors, fonts, and animations
- The app uses Google Fonts (Poppins, Indie Flower, Gochi Hand)
- Glassmorphism effects can be adjusted in the CSS variables

### Backend Features
- Add new API endpoints in `backend/routes/`
- Create new data models in `backend/models/`
- Extend the database schema in `backend/database/init.js`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Fonts** for beautiful typography
- **CSS Glassmorphism** for the modern design aesthetic
- **SQLite** for lightweight database storage
- **Express.js** for the robust backend framework

---

**Made with ❤️ and lots of 🐼 pandas**