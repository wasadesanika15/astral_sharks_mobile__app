# Astral Sharks API - Database Setup

## 🦈 Overview

The Astral Sharks mobile app now includes a fully integrated PostgreSQL database for storing user data, SOS incidents, incident reports, safe zones, and family coordination information.

## 📊 Database Schema

### Core Tables

1. **users** - User authentication and profiles
2. **family_groups** - Family coordination groups
3. **family_members** - Group memberships
4. **sos_incidents** - Emergency SOS alerts
5. **incident_reports** - Fire, flood, medical, manual reports
6. **incident_attachments** - Media files for reports
7. **safe_zones** - User-defined safe locations
8. **location_history** - User location tracking

## 🚀 Quick Setup

### Prerequisites
- PostgreSQL installed and running
- Node.js 18+

### Database Setup

```bash
cd server
npm install
npm run setup-db
```

### Environment Configuration

Update `.env` file with your database credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=astral_sharks
DB_USER=your_username
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
```

### Start the Server

```bash
npm run dev
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### SOS Incidents
- `POST /sos` - Create SOS alert
- `GET /api/sos/active` - Get all active SOS incidents

### Incident Reports
- `POST /upload` - Create incident report with file attachments
- `GET /api/incidents` - Get incident reports (filtered)

### Safe Zones
- `GET /zones?user_id=X` - Get user's safe zones
- `POST /api/zones` - Create safe zone (protected)

### System
- `GET /health` - Health check with database status
- `GET /` - API information

## 🧪 Testing

```bash
# Test database connection
npm run test-db

# Test API endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/incidents
```

## 📱 Mobile App Integration

The mobile app can now:
- Register and authenticate users
- Store SOS incidents in database
- Save incident reports with attachments
- Manage safe zones
- Track location history
- Coordinate with family members

## 🔧 Database Features

- **Real-time Updates** - Socket.IO broadcasts for new incidents
- **JWT Authentication** - Secure API endpoints
- **File Upload Support** - Image/audio attachments for reports
- **Location Tracking** - GPS history and safe zones
- **Family Coordination** - Group management and member tracking

## 🛠 Development Commands

```bash
# Setup database from scratch
npm run setup-db

# Test database connection
npm run test-db

# Start development server
npm run dev

# Start production server
npm start
```

## 📁 Database Files

- `database.sql` - PostgreSQL schema and sample data
- `database.js` - Database connection and helper functions
- `setup-db.sh` - Automated setup script
- `.env` - Environment configuration

The database is now fully integrated and ready for production use!
