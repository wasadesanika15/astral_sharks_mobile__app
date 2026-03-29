# Astral Sharks Government Agency API Documentation

## 🏛️ Overview

The Astral Sharks backend provides dedicated API endpoints for government agency dashboards to monitor distress calls, analyze patterns, and coordinate emergency responses.

## 🔗 Base URL

```
http://localhost:3000
```

## 📡 API Endpoints

### 📊 Dashboard Overview
**GET** `/api/agency/dashboard`

Get aggregated dashboard data with statistics and recent incidents.

**Response:**
```json
{
  "ok": true,
  "data": {
    "stats": {
      "activeSOSCount": 3,
      "totalIncidentsToday": 12,
      "incidentsByType": {
        "fire": 4,
        "medical": 3,
        "flood": 2,
        "manual": 3
      },
      "highPriorityIncidents": 2
    },
    "activeSOS": [...],
    "recentIncidents": [...],
    "lastUpdated": "2024-03-29T02:30:00.000Z"
  }
}
```

### 🔥 Heatmap Data
**GET** `/api/agency/heatmap`

Get weighted location data for heatmap visualization.

**Query Parameters:**
- `timeRange`: `1h`, `24h`, `7d` (default: `24h`)
- `incident_type`: `fire`, `medical`, `flood`, `manual` (optional)

**Response:**
```json
{
  "ok": true,
  "data": {
    "heatmapPoints": [
      {
        "lat": 40.7128,
        "lng": -74.0060,
        "weight": 1.0,
        "type": "sos",
        "timestamp": "2024-03-29T02:30:00.000Z",
        "metadata": {
          "battery_level": 85
        }
      }
    ],
    "timeRange": "24h",
    "totalPoints": 25,
    "generatedAt": "2024-03-29T02:30:00.000Z"
  }
}
```

### 🎯 AI Priority Engine
**GET** `/api/agency/priority-incidents`

Get incidents ranked by AI-calculated priority scores.

**Response:**
```json
{
  "ok": true,
  "data": {
    "incidents": [
      {
        "id": 123,
        "priorityScore": 0.95,
        "incidentType": "sos",
        "recommendations": [
          "Dispatch emergency services immediately",
          "Urgent: Device battery critical"
        ]
      }
    ],
    "summary": {
      "critical": 2,
      "high": 5,
      "medium": 8,
      "low": 15
    }
  }
}
```

### 🚁 Drone Deployments
**GET** `/api/agency/drone-deployments`

Get AI-powered drone deployment recommendations.

**Response:**
```json
{
  "ok": true,
  "data": {
    "recommendations": [
      {
        "type": "immediate",
        "target": {
          "latitude": 40.7128,
          "longitude": -74.0060,
          "emergencyId": "RES-123-K",
          "priority": "critical"
        },
        "droneType": "reconnaissance",
        "estimatedTime": "5-10 minutes",
        "reason": "Active SOS emergency"
      }
    ],
    "totalDeployments": 3,
    "droneStatus": {
      "available": 3,
      "deployed": 2,
      "maintenance": 1
    }
  }
}
```

### 📈 Real-time Statistics
**GET** `/api/agency/stats`

Get aggregated statistics for different timeframes.

**Query Parameters:**
- `timeframe`: `1h`, `24h`, `7d` (default: `24h`)

**Response:**
```json
{
  "ok": true,
  "data": {
    "stats": {
      "total_incidents": 12,
      "fire_incidents": 4,
      "medical_incidents": 3,
      "flood_incidents": 2,
      "manual_incidents": 3,
      "avg_threat_level": 3.2,
      "active_sos": 2,
      "avg_battery": 67.5,
      "responseRate": 85.5,
      "avgResponseTime": "8.5 minutes"
    },
    "timeframe": "24h",
    "generatedAt": "2024-03-29T02:30:00.000Z"
  }
}
```

## 🔄 Real-time Updates

### Socket.IO Connection

Connect to the backend for real-time updates:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Subscribe to agency updates
socket.emit('subscribe_agency_updates');

// Listen for new SOS alerts
socket.on('agency_sos_alert', (data) => {
  console.log('New SOS:', data);
  // data includes: id, emergency_id, latitude, longitude, battery_level, priorityScore, recommendations
});

// Listen for new incidents
socket.on('agency_new_incident', (data) => {
  console.log('New incident:', data);
  // data includes: id, incident_type, latitude, longitude, title, threat_level, priorityScore, recommendations
});
```

### Socket.IO Events

- `subscribe_agency_updates` - Subscribe to real-time agency updates
- `unsubscribe_agency_updates` - Unsubscribe from agency updates
- `agency_sos_alert` - New SOS alert with priority scoring
- `agency_new_incident` - New incident report with AI analysis

## 🤖 AI Priority Engine

The AI priority engine calculates scores based on:

### SOS Incident Factors:
- **Base Score**: 0.8 (high priority)
- **Battery Level**: +0.15 if <20%, +0.05 if <50%
- **Recency**: +0.05 if <1 minute old

### Incident Report Factors:
- **Type Priority**: Medical (0.8), Fire (0.7), Flood (0.6), Manual (0.4)
- **Threat Level**: +0.3 × (threat_level / 5)
- **Recency**: +0.1 if <1 hour old

### Recommendation System:

**SOS Incidents:**
- Dispatch emergency services immediately
- Battery critical alerts if <20%

**Fire Incidents:**
- Deploy fire department
- Evacuation orders for high threat levels

**Medical Incidents:**
- Dispatch medical units
- Prepare nearest hospital

**Flood Incidents:**
- Deploy rescue teams
- Monitor water levels

## 🔒 CORS Configuration

Add your government dashboard URL to the `ALLOWED_ORIGINS` environment variable:

```env
ALLOWED_ORIGINS=https://agency.gov.example.com,https://dashboard.emergency.gov
```

## 📱 Integration Example

### React Component Example:

```javascript
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const AgencyDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize Socket.IO
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    // Subscribe to agency updates
    newSocket.emit('subscribe_agency_updates');

    // Listen for real-time updates
    newSocket.on('agency_sos_alert', (data) => {
      console.log('New SOS alert:', data);
      // Update UI with new SOS
    });

    newSocket.on('agency_new_incident', (data) => {
      console.log('New incident:', data);
      // Update UI with new incident
    });

    // Fetch initial data
    fetchDashboardData();
    fetchHeatmapData();

    return () => {
      newSocket.emit('unsubscribe_agency_updates');
      newSocket.close();
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/agency/dashboard');
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const fetchHeatmapData = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/agency/heatmap?timeRange=24h');
      setHeatmapData(response.data.data.heatmapPoints);
    } catch (error) {
      console.error('Failed to fetch heatmap data:', error);
    }
  };

  return (
    <div>
      <h1>Astral Sharks Agency Dashboard</h1>
      {/* Render dashboard components */}
    </div>
  );
};

export default AgencyDashboard;
```

## 🚀 Quick Start

1. **Configure CORS** - Add your dashboard URL to `ALLOWED_ORIGINS`
2. **Connect to API** - Use the endpoints above
3. **Enable Real-time** - Connect via Socket.IO
4. **Display Data** - Render heatmaps, priority lists, and statistics

## 📞 Support

For integration support, contact the Astral Sharks development team or refer to the mobile app documentation.
