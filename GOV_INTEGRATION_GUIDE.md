# Government App Integration Guide

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install axios socket.io-client leaflet react-leaflet date-fns lucide-react
npm install --save-dev @types/leaflet
```

### 2. Add Environment Variables
Create/update your `.env` file:
```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_SOCKET_URL=http://localhost:3000
```

### 3. Copy Files to Your Government App
Copy these files to your government web app:
- `astralSharksAPI.js` - API service module
- `AgencyDashboard.jsx` - Main dashboard component
- `HeatmapVisualization.jsx` - Map component

### 4. Import and Use
```javascript
// In your main App.js or router
import AgencyDashboard from './AgencyDashboard';

function App() {
  return (
    <div>
      <AgencyDashboard />
    </div>
  );
}

export default App;
```

### 5. Update CORS Configuration
In your mobile app backend `.env` file:
```env
ALLOWED_ORIGINS=http://localhost:3001,https://your-government-app.com
```

## 🔧 Features Included

### ✅ Real-time Dashboard
- Live SOS alerts and incident updates
- Connection status indicator
- Auto-refresh data

### ✅ Priority-Based Incident Management
- AI-powered priority scoring
- Color-coded severity levels
- Action recommendations

### ✅ Interactive Heatmap
- Weighted incident markers
- Time range filtering (1h, 24h, 7d)
- Incident type legend
- Click for details

### ✅ Drone Deployment Interface
- Automated deployment recommendations
- Fleet status tracking
- ETA estimates

### ✅ Statistics Overview
- Active SOS count
- Daily incident totals
- High priority incidents
- Response time metrics

## 📡 Real-time Events

The dashboard automatically receives:
- `agency_sos_alert` - New emergency calls
- `agency_new_incident` - New incident reports
- Connection status updates

## 🎨 Customization

### Styling
The components use Tailwind CSS classes. Update as needed for your design system.

### Map Styling
Replace OpenStreetMap with your preferred mapping service:
```javascript
// In HeatmapVisualization.jsx
L.tileLayer('https://your-tile-service/{z}/{x}/{y}.png', {
  attribution: '© Your attribution'
}).addTo(mapInstanceRef.current);
```

### Data Processing
Add custom data processing in the API service or components as needed.

## 🚨 Production Deployment

### Backend Configuration
```env
NODE_ENV=production
ALLOWED_ORIGINS=https://your-government-app.com
DB_HOST=your-production-db-host
DB_PASSWORD=your-secure-password
JWT_SECRET=your-production-secret
```

### Frontend Configuration
```env
REACT_APP_API_URL=https://api.astralsharks.gov
REACT_APP_SOCKET_URL=https://api.astralsharks.gov
```

## 🔒 Security Notes

- Use HTTPS in production
- Secure your JWT secret
- Implement proper authentication
- Validate all user inputs
- Use CORS properly

## 📞 Support

For integration issues:
1. Check backend server is running
2. Verify CORS configuration
3. Check network connectivity
4. Review browser console for errors
5. Test API endpoints directly

## 🧪 Testing

Test the integration:
```bash
# Test backend API
curl http://localhost:3000/api/agency/dashboard

# Test Socket.IO connection
# Open browser dev tools and check for connection logs
```

Your government dashboard is now ready to display real-time distress calls from the Astral Sharks mobile app!
