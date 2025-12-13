# Coopvest Africa Admin Dashboard

A modern, enterprise-grade admin dashboard for Coopvest Africa - a national internet-based cooperative investment and lending platform serving salaried workers.

## 🎯 Features

### Core Functionality
- **Dashboard**: Real-time KPIs, member statistics, loan performance, and system alerts
- **Member Management**: Searchable directory with KYC verification, contribution history, and risk indicators
- **Contributions & E-Wallet**: Track contributions, wallet balances, and automated statements
- **Loan Management**: Application queue, eligibility checks, approval workflows, and repayment tracking
- **Investment Pools**: Create and manage cooperative investment projects with profit-sharing
- **Documents & Automation**: Automated document generation (agreements, statements, proofs)
- **Notifications**: In-app notifications, email/SMS alerts, and broadcast messaging
- **Compliance & Governance**: Risk scoring, audit logs, and regulatory monitoring

### Role-Based Access Control
- **Super Admin**: Full system control, admin management, role assignment
- **Finance Admin**: Contributions, loans, financial operations
- **Operations Admin**: Day-to-day operations and member services
- **Compliance Admin**: Compliance monitoring and regulatory requirements
- **Member Support Admin**: Member inquiries and support
- **Investment Admin**: Investment pool management
- **Technology Admin**: System administration and technical operations

### Security Features
- JWT authentication with MFA support
- Role-based access control (RBAC)
- Comprehensive audit logging
- Account lockout after failed login attempts
- IP whitelisting support
- Encrypted password storage
- Rate limiting on API endpoints

### UI/UX
- Modern fintech design with African aesthetic
- Light and dark mode support
- Fully responsive (desktop and tablet first)
- Smooth animations and transitions
- Intuitive navigation and data hierarchy
- Card-based layouts with soft shadows

## 🚀 Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Zustand** - State management
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Mongoose** - ODM

## 📋 Prerequisites

- Node.js 16+ and npm
- MongoDB 4.4+
- Git

## 🔧 Installation

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

# Create .env file
cp .env.example .env

# Update .env with your configuration
# - MongoDB URI
# - JWT Secret
# - CORS Origin
# - Email configuration (optional)

# Start the server
npm run dev
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file (optional)
# VITE_API_URL=http://localhost:5000/api

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:3000`

## 🔐 Demo Credentials

For testing purposes, use these credentials:

**Super Admin:**
- Email: `admin@coopvest.com`
- Password: `password`

**Finance Admin:**
- Email: `finance@coopvest.com`
- Password: `password`

## 📁 Project Structure

```
coopvest-admin-dashboard/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout/
│   │   │       ├── Sidebar.jsx
│   │   │       ├── Header.jsx
│   │   │       └── MainLayout.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Members.jsx
│   │   │   ├── Contributions.jsx
│   │   │   ├── Loans.jsx
│   │   │   ├── Investments.jsx
│   │   │   ├── Documents.jsx
│   │   │   ├── Notifications.jsx
│   │   │   ├── Compliance.jsx
│   │   │   ├── Settings.jsx
│   │   │   ├── AccessManagement.jsx
│   │   │   ├── AuditLogs.jsx
│   │   │   └── Login.jsx
│   │   ├── store/
│   │   │   ├── authStore.js
│   │   │   └── uiStore.js
│   │   ├── api/
│   │   │   └── client.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── backend/
│   ├── models/
│   │   ├── Admin.js
│   │   ├── Member.js
│   │   └── AuditLog.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── admin.js
│   │   ├── members.js
│   │   ├── contributions.js
│   │   ├── loans.js
│   │   ├── investments.js
│   │   ├── documents.js
│   │   └── audit.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── audit.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/change-password` - Change password

### Admin Management
- `GET /api/admin` - Get all admins (Super Admin only)
- `GET /api/admin/:id` - Get admin by ID
- `POST /api/admin` - Create admin (Super Admin only)
- `PUT /api/admin/:id` - Update admin (Super Admin only)
- `POST /api/admin/:id/approve` - Approve admin (Super Admin only)
- `POST /api/admin/:id/suspend` - Suspend admin (Super Admin only)
- `DELETE /api/admin/:id` - Delete admin (Super Admin only)

### Members
- `GET /api/members` - Get all members
- `GET /api/members/:id` - Get member by ID
- `POST /api/members/:id/approve` - Approve member
- `POST /api/members/:id/suspend` - Suspend member

### Audit Logs
- `GET /api/audit` - Get audit logs (Super Admin only)
- `GET /api/audit/:id` - Get audit log by ID (Super Admin only)

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# Deploy the dist folder
```

### Backend (Heroku/Railway/Render)
```bash
cd backend
npm install
# Set environment variables
# Deploy
```

## 📊 Database Schema

### Admin Collection
- name, email, password (hashed)
- role, permissions
- status, mfaEnabled, mfaSecret
- lastLogin, loginAttempts, lockUntil
- ipWhitelist
- createdBy, approvedBy, approvedAt
- timestamps

### Member Collection
- firstName, lastName, email, phone
- status, kycStatus, kycDocuments
- bvn, nin, dateOfBirth
- address, employment, bankDetails
- contributions, loans, wallet
- riskScore, flags, notes
- timestamps

### AuditLog Collection
- admin, adminEmail
- action, resourceType, resourceId, resourceName
- changes (before/after)
- ipAddress, userAgent
- status, errorMessage
- metadata
- createdAt

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **JWT Secret**: Use a strong, random secret in production
3. **HTTPS**: Always use HTTPS in production
4. **CORS**: Configure CORS properly for your domain
5. **Rate Limiting**: Adjust rate limits based on your needs
6. **Database**: Use MongoDB Atlas or secure self-hosted instance
7. **Backups**: Regular database backups
8. **Monitoring**: Set up error tracking and monitoring

## 📝 License

MIT License - See LICENSE file for details

## 👥 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support, email support@coopvest.com or open an issue on GitHub.

## 🎉 Acknowledgments

Built with ❤️ for Coopvest Africa - Empowering cooperative investment and lending.

---

**Version**: 1.0.0  
**Last Updated**: December 2024
