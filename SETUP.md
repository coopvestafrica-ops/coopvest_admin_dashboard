# Setup Guide - Coopvest Africa Admin Dashboard

## 📋 Prerequisites

- Node.js 16+ (Download from https://nodejs.org/)
- npm 8+ (comes with Node.js)
- MongoDB 4.4+ (Local or MongoDB Atlas)
- Git
- A code editor (VS Code recommended)

## 🔧 Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/coopvestafrica-ops/coopvest_admin_dashboard.git
cd coopvest-admin-dashboard
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Required .env variables:**
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/coopvest_admin
JWT_SECRET=your_super_secret_key_here
CORS_ORIGIN=http://localhost:3000
```

**Optional .env variables:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
REDIS_URL=redis://localhost:6379
```

### 3. MongoDB Setup

#### Option A: Local MongoDB
```bash
# macOS (with Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install -y mongodb
sudo systemctl start mongod

# Windows
# Download from https://www.mongodb.com/try/download/community
# Run installer and follow prompts
```

#### Option B: MongoDB Atlas (Cloud)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a cluster
4. Create database user
5. Get connection string
6. Update `.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/coopvest_admin
   ```

### 4. Start Backend Server

```bash
# From backend directory
npm run dev

# You should see:
# ✓ MongoDB connected
# ✓ Server running on port 5000
# ✓ Environment: development
```

### 5. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create environment file (optional)
echo "VITE_API_URL=http://localhost:5000/api" > .env.local
```

### 6. Start Frontend Development Server

```bash
# From frontend directory
npm run dev

# You should see:
# ✓ Local: http://localhost:3000/
```

### 7. Access the Dashboard

Open your browser and go to: **http://localhost:3000**

## 🔐 Login Credentials

Use these demo credentials to test:

**Super Admin:**
- Email: `admin@coopvest.com`
- Password: `password`

**Finance Admin:**
- Email: `finance@coopvest.com`
- Password: `password`

## 📁 Project Structure

```
coopvest-admin-dashboard/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Zustand stores
│   │   ├── api/             # API client
│   │   ├── App.jsx          # Main app component
│   │   └── index.css        # Global styles
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                  # Node.js/Express API
│   ├── models/              # MongoDB schemas
│   ├── routes/              # API routes
│   ├── middleware/          # Custom middleware
│   ├── server.js            # Express server
│   ├── .env.example
│   └── package.json
│
├── README.md                # Project documentation
├── SETUP.md                 # This file
├── DEPLOYMENT.md            # Deployment guide
└── .gitignore
```

## 🎨 Customization

### Change Brand Colors

Edit `frontend/tailwind.config.js`:

```javascript
colors: {
  primary: {
    500: '#0ea5e9', // Change primary color
  },
  accent: {
    500: '#22c55e', // Change accent color
  },
  // ... more colors
}
```

### Add New Pages

1. Create new file in `frontend/src/pages/YourPage.jsx`
2. Add route in `frontend/src/App.jsx`
3. Add menu item in `frontend/src/components/Layout/Sidebar.jsx`

### Add New API Endpoints

1. Create route file in `backend/routes/yourroute.js`
2. Import in `backend/server.js`
3. Add route: `app.use('/api/yourroute', yourRouteRouter)`

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

### MongoDB Connection Error
```bash
# Check if MongoDB is running
# macOS
brew services list

# Ubuntu
sudo systemctl status mongod

# Test connection
mongo "mongodb://localhost:27017/coopvest_admin"
```

### CORS Error
- Ensure backend is running on correct port
- Check `CORS_ORIGIN` in `.env` matches frontend URL
- Verify API URL in frontend `.env.local`

### Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 Already in Use
```bash
# Use different port
npm run dev -- --port 3001
```

## 📚 Useful Commands

### Backend
```bash
npm run dev          # Start development server
npm start            # Start production server
npm test             # Run tests
npm run lint         # Run linter
```

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run linter
```

## 🔗 Useful Links

- [React Documentation](https://react.dev)
- [Express Documentation](https://expressjs.com)
- [MongoDB Documentation](https://docs.mongodb.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev)

## 📞 Getting Help

1. Check the [README.md](./README.md) for general information
2. Check the [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment help
3. Review error messages carefully
4. Check browser console for frontend errors
5. Check terminal for backend errors
6. Open an issue on GitHub

## ✅ Next Steps

1. ✅ Complete setup
2. ✅ Test login with demo credentials
3. ✅ Explore the dashboard
4. ✅ Customize for your needs
5. ✅ Deploy to production

---

**Happy coding! 🚀**

For questions or issues, contact: support@coopvest.com
