# Deployment Guide - Coopvest Africa Admin Dashboard

## 🚀 Quick Start

### Local Development

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env

# Update .env with your configuration
# Start MongoDB locally or use MongoDB Atlas

npm run dev
# Server runs on http://localhost:5000
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:3000
```

## 📦 Production Deployment

### Backend Deployment (Node.js)

#### Option 1: Heroku
```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create coopvest-admin-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_secret_key
heroku config:set CORS_ORIGIN=https://yourdomain.com

# Deploy
git push heroku main
```

#### Option 2: Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

#### Option 3: Render
1. Connect GitHub repository to Render
2. Create new Web Service
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables
6. Deploy

#### Option 4: AWS EC2
```bash
# SSH into instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Clone repository
git clone https://github.com/coopvestafrica-ops/coopvest_admin_dashboard.git
cd coopvest-admin-dashboard/backend

# Install dependencies
npm install

# Create .env file
nano .env

# Install PM2 for process management
npm install -g pm2

# Start application
pm2 start server.js --name "coopvest-api"
pm2 startup
pm2 save

# Install Nginx as reverse proxy
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure Nginx
sudo nano /etc/nginx/conf.d/coopvest.conf
```

**Nginx Configuration:**
```nginx
upstream coopvest_api {
    server localhost:5000;
}

server {
    listen 80;
    server_name api.coopvest.com;

    location / {
        proxy_pass http://coopvest_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Frontend Deployment (React)

#### Option 1: Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel

# Set environment variables in Vercel dashboard
# VITE_API_URL=https://api.coopvest.com/api
```

#### Option 2: Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
cd frontend
netlify deploy --prod --dir=dist

# Or connect GitHub for automatic deployments
```

#### Option 3: AWS S3 + CloudFront
```bash
# Build the app
cd frontend
npm run build

# Create S3 bucket
aws s3 mb s3://coopvest-admin-dashboard

# Upload files
aws s3 sync dist/ s3://coopvest-admin-dashboard --delete

# Create CloudFront distribution
# Point to S3 bucket
# Set default root object to index.html
```

#### Option 4: GitHub Pages
```bash
# Update vite.config.js
export default {
  base: '/coopvest_admin_dashboard/',
  // ... rest of config
}

# Build and deploy
npm run build
git add dist/
git commit -m "Deploy to GitHub Pages"
git push origin main
```

## 🗄️ Database Setup

### MongoDB Atlas (Recommended)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create account and cluster
3. Create database user
4. Get connection string
5. Add to `.env`: `MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/coopvest_admin`

### Self-Hosted MongoDB
```bash
# Install MongoDB
# Ubuntu/Debian
sudo apt-get install -y mongodb

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database and user
mongo
> use coopvest_admin
> db.createUser({
    user: "admin",
    pwd: "strong_password",
    roles: ["readWrite"]
  })
```

## 🔒 SSL/TLS Certificate

### Let's Encrypt (Free)
```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d api.coopvest.com -d coopvest.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## 📊 Monitoring & Logging

### PM2 Monitoring
```bash
# Install PM2 Plus
pm2 install pm2-auto-pull

# Monitor
pm2 monit

# View logs
pm2 logs coopvest-api
```

### CloudWatch (AWS)
```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# Configure and start
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

## 🔄 CI/CD Pipeline

### GitHub Actions
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm install
          cd ../frontend
          npm install
      
      - name: Build frontend
        run: |
          cd frontend
          npm run build
      
      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: |
          npm i -g vercel
          cd frontend
          vercel --prod --token $VERCEL_TOKEN
      
      - name: Deploy to Heroku
        env:
          HEROKU_API_KEY: ${{ secrets.HEROKU_API_KEY }}
        run: |
          git remote add heroku https://git.heroku.com/coopvest-admin-api.git
          git push heroku main
```

## 🧪 Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificate installed
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Error logging configured
- [ ] Backup strategy in place
- [ ] Monitoring alerts set up
- [ ] Security headers configured
- [ ] API documentation updated
- [ ] Load testing completed
- [ ] Disaster recovery plan ready

## 🚨 Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs coopvest-api

# Check port availability
lsof -i :5000

# Check MongoDB connection
mongo "mongodb+srv://user:pass@cluster.mongodb.net/coopvest_admin"
```

### Frontend not loading
```bash
# Check build
npm run build

# Check environment variables
echo $VITE_API_URL

# Clear cache
rm -rf node_modules package-lock.json
npm install
```

### CORS errors
- Verify `CORS_ORIGIN` in backend `.env`
- Check frontend API URL matches backend domain
- Ensure credentials are properly configured

## 📞 Support

For deployment issues, contact: devops@coopvest.com

---

**Last Updated**: December 2024
