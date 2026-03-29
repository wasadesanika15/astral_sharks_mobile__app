// Astral Sharks Government API Service
// Add this to your existing government web app

import axios from 'axios';
import io from 'socket.io-client';

// Configuration - Update these URLs for your environment
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Socket.IO client
let socket = null;

// API Service Class
class AstralSharksAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.socket = null;
  }

  // Initialize Socket.IO connection
  initializeSocket() {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    return this.socket;
  }

  // Subscribe to agency updates
  subscribeToAgencyUpdates() {
    if (this.socket) {
      this.socket.emit('subscribe_agency_updates');
    }
  }

  // Unsubscribe from agency updates
  unsubscribeFromAgencyUpdates() {
    if (this.socket) {
      this.socket.emit('unsubscribe_agency_updates');
    }
  }

  // Get dashboard overview
  async getDashboardData() {
    try {
      const response = await apiClient.get('/api/agency/dashboard');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      throw error;
    }
  }

  // Get heatmap data
  async getHeatmapData(timeRange = '24h', incidentType = null) {
    try {
      const params = { timeRange };
      if (incidentType) {
        params.incident_type = incidentType;
      }
      
      const response = await apiClient.get('/api/agency/heatmap', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch heatmap data:', error);
      throw error;
    }
  }

  // Get priority incidents
  async getPriorityIncidents() {
    try {
      const response = await apiClient.get('/api/agency/priority-incidents');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch priority incidents:', error);
      throw error;
    }
  }

  // Get drone deployment recommendations
  async getDroneDeployments() {
    try {
      const response = await apiClient.get('/api/agency/drone-deployments');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch drone deployments:', error);
      throw error;
    }
  }

  // Get statistics
  async getStats(timeframe = '24h') {
    try {
      const response = await apiClient.get('/api/agency/stats', {
        params: { timeframe }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      throw error;
    }
  }

  // Get all active SOS incidents
  async getActiveSOS() {
    try {
      const response = await apiClient.get('/api/sos/active');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch active SOS:', error);
      throw error;
    }
  }

  // Get incident reports
  async getIncidentReports(filters = {}) {
    try {
      const response = await apiClient.get('/api/incidents', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch incident reports:', error);
      throw error;
    }
  }

  // Socket event listeners
  onSOSAlert(callback) {
    if (this.socket) {
      this.socket.on('agency_sos_alert', callback);
    }
  }

  onNewIncident(callback) {
    if (this.socket) {
      this.socket.on('agency_new_incident', callback);
    }
  }

  onConnect(callback) {
    if (this.socket) {
      this.socket.on('connect', callback);
    }
  }

  onDisconnect(callback) {
    if (this.socket) {
      this.socket.on('disconnect', callback);
    }
  }

  // Remove event listeners
  offSOSAlert(callback) {
    if (this.socket) {
      this.socket.off('agency_sos_alert', callback);
    }
  }

  offNewIncident(callback) {
    if (this.socket) {
      this.socket.off('agency_new_incident', callback);
    }
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Create singleton instance
const astralSharksAPI = new AstralSharksAPI();

export default astralSharksAPI;
