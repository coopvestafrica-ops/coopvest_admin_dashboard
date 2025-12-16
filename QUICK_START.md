# Quick Start Guide - Coopvest Admin Dashboard

## ⚡ 5-Minute Setup

### Prerequisites
- Node.js 16+ installed
- MongoDB running locally or MongoDB Atlas account

### Step 1: Clone & Install (2 min)
```bash
git clone https://github.com/coopvestafrica-ops/coopvest_admin_dashboard.git
cd coopvest-admin-dashboard

# Backend
cd backend
npm install
cp .env.example .env

# Frontend
cd ../frontend
npm install
```

### Step 2: Configure (1 min)
Edit `backend/.env`:
```
MONGODB_URI=mongodb://localhost:27017/coopvest_admin
JWT_SECRET=your_secret_key_here
CORS_ORIGIN=http://localhost:3000
```

### Step 3: Start Servers (2 min)
```bash
# Terminal 1 - Backend
cd backend
npm run dev
# ✓ Server running on port 5000

# Terminal 2 - Frontend
cd frontend
npm run dev
# ✓ Local: http://localhost:3000/
```

### Step 4: Login
Open http://localhost:3000 and use:
- **Email**: `admin@coopvest.com`
- **Password**: `password`

---

## 🎯 Key Features at a Glance

| Feature | Location | Status |
|---------|----------|--------|
| Dashboard | `/dashboard` | ✅ Live |
| Members | `/members` | ✅ Live |
| Contributions | `/contributions` | ✅ Live |
| Loans | `/loans` | ✅ Live |
| Investments | `/investments` | ✅ Live |
| Admin Access | `/access-management` | ✅ Live |
| Audit Logs | `/audit-logs` | ✅ Live |
| Compliance | `/compliance` | ✅ Live |

---

## 📁 Important Files

```
frontend/
├── src/pages/          # All page components
├── src/store/          # State management
├── src/components/     # Reusable components
└── tailwind.config.js  # Styling config

backend/
├── routes/             # API endpoints
├── models/             # Database schemas
├── middleware/         # Auth & audit
└── server.js           # Main server
```

---

## 🔧 Common Commands

### Frontend
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview build
```

### Backend
```bash
npm run dev      # Start with nodemon
npm start        # Start production
npm test         # Run tests
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 5000 in use | `lsof -i :5000` then `kill -9 <PID>` |
| MongoDB error | Ensure MongoDB is running: `mongod` |
| CORS error | Check `CORS_ORIGIN` in `.env` |
| Module not found | `rm -rf node_modules && npm install` |

---

## 📚 Full Documentation

- **Setup Details**: See [SETUP.md](./SETUP.md)
- **Deployment**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Project Info**: See [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
- **Full README**: See [README.md](./README.md)

---

## 🚀 Next Steps

1. ✅ Complete quick start
2. ✅ Explore the dashboard
3. ✅ Test all features
4. ✅ Customize branding
5. ✅ Deploy to production

---

## 💡 Tips

- Use demo credentials to test all roles
- Check browser console for frontend errors
- Check terminal for backend errors
- Dark mode available in header
- All data is mock data for testing

---

## 📞 Need Help?

- Check [SETUP.md](./SETUP.md) for detailed setup
- Review [README.md](./README.md) for features
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for production
- Open issue on GitHub

---

**Ready to go! 🚀**
