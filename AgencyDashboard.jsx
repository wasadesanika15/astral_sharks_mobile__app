// Government Agency Dashboard Component
// Add this to your React app

import React, { useState, useEffect, useCallback } from 'react';
import astralSharksAPI from './astralSharksAPI';

const AgencyDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [priorityIncidents, setPriorityIncidents] = useState([]);
  const [droneDeployments, setDroneDeployments] = useState([]);
  const [stats, setStats] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');

  // Initialize connection and fetch data
  useEffect(() => {
    initializeDashboard();
    
    return () => {
      astralSharksAPI.disconnect();
    };
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      
      // Initialize Socket.IO
      const socket = astralSharksAPI.initializeSocket();
      
      socket.on('connect', () => {
        setConnected(true);
        console.log('Connected to Astral Sharks backend');
      });

      socket.on('disconnect', () => {
        setConnected(false);
        console.log('Disconnected from Astral Sharks backend');
      });

      // Subscribe to agency updates
      astralSharksAPI.subscribeToAgencyUpdates();

      // Set up real-time event listeners
      setupEventListeners();

      // Fetch initial data
      await fetchAllData();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setupEventListeners = useCallback(() => {
    // Listen for new SOS alerts
    astralSharksAPI.onSOSAlert((data) => {
      console.log('New SOS Alert:', data);
      // Update dashboard data with new SOS
      setDashboardData(prev => ({
        ...prev,
        data: {
          ...prev.data,
          activeSOS: [data, ...(prev.data?.activeSOS || [])],
          stats: {
            ...prev.data?.stats,
            activeSOSCount: (prev.data?.stats?.activeSOSCount || 0) + 1
          }
        }
      }));
    });

    // Listen for new incidents
    astralSharksAPI.onNewIncident((data) => {
      console.log('New Incident:', data);
      // Update dashboard data with new incident
      setDashboardData(prev => ({
        ...prev,
        data: {
          ...prev.data,
          recentIncidents: [data, ...(prev.data?.recentIncidents || [])]
        }
      }));
    });
  }, []);

  const fetchAllData = async () => {
    try {
      const [dashboard, heatmap, priority, drones, statistics] = await Promise.all([
        astralSharksAPI.getDashboardData(),
        astralSharksAPI.getHeatmapData(timeRange),
        astralSharksAPI.getPriorityIncidents(),
        astralSharksAPI.getDroneDeployments(),
        astralSharksAPI.getStats(timeRange)
      ]);

      setDashboardData(dashboard);
      setHeatmapData(heatmap.data?.heatmapPoints || []);
      setPriorityIncidents(priority.data?.incidents || []);
      setDroneDeployments(drone.data?.recommendations || []);
      setStats(statistics.data?.stats);
    } catch (err) {
      setError(err.message);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setLoading(true);
    await fetchAllData();
    setLoading(false);
  };

  // Handle time range change
  const handleTimeRangeChange = async (newTimeRange) => {
    setTimeRange(newTimeRange);
    try {
      const [heatmap, statistics] = await Promise.all([
        astralSharksAPI.getHeatmapData(newTimeRange),
        astralSharksAPI.getStats(newTimeRange)
      ]);
      setHeatmapData(heatmap.data?.heatmapPoints || []);
      setStats(statistics.data?.stats);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading Astral Sharks Dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Astral Sharks Agency Dashboard</h1>
        <div className="flex items-center mt-2">
          <div className={`w-3 h-3 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={() => handleTimeRangeChange('1h')}
            className={`px-4 py-2 rounded ${timeRange === '1h' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
          >
            1 Hour
          </button>
          <button
            onClick={() => handleTimeRangeChange('24h')}
            className={`px-4 py-2 rounded ${timeRange === '24h' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
          >
            24 Hours
          </button>
          <button
            onClick={() => handleTimeRangeChange('7d')}
            className={`px-4 py-2 rounded ${timeRange === '7d' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
          >
            7 Days
          </button>
        </div>
        <button
          onClick={refreshData}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      {dashboardData?.data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm font-medium text-gray-500">Active SOS</h3>
            <p className="text-2xl font-bold text-red-600">{dashboardData.data.stats.activeSOSCount}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm font-medium text-gray-500">Incidents Today</h3>
            <p className="text-2xl font-bold text-blue-600">{dashboardData.data.stats.totalIncidentsToday}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm font-medium text-gray-500">High Priority</h3>
            <p className="text-2xl font-bold text-orange-600">{dashboardData.data.stats.highPriorityIncidents}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm font-medium text-gray-500">Avg Response Time</h3>
            <p className="text-2xl font-bold text-green-600">{stats?.avgResponseTime || 'N/A'}</p>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Incidents */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-bold mb-4">Priority Incidents</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {priorityIncidents.length === 0 ? (
              <p className="text-gray-500">No high priority incidents</p>
            ) : (
              priorityIncidents.map((incident) => (
                <div key={incident.id} className="border rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{incident.incidentType?.toUpperCase() || incident.incident_type?.toUpperCase()}</h4>
                      <p className="text-sm text-gray-600">
                        Priority Score: {(incident.priorityScore * 100).toFixed(1)}%
                      </p>
                      {incident.title && (
                        <p className="text-sm">{incident.title}</p>
                      )}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      incident.priorityScore >= 0.8 ? 'bg-red-100 text-red-800' :
                      incident.priorityScore >= 0.6 ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {incident.priorityScore >= 0.8 ? 'Critical' :
                       incident.priorityScore >= 0.6 ? 'High' : 'Medium'}
                    </div>
                  </div>
                  {incident.recommendations && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700">Recommendations:</p>
                      <ul className="text-xs text-gray-600 list-disc list-inside">
                        {incident.recommendations.slice(0, 2).map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Drone Deployments */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-bold mb-4">Drone Deployments</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {droneDeployments.length === 0 ? (
              <p className="text-gray-500">No drone deployments recommended</p>
            ) : (
              droneDeployments.map((deployment, index) => (
                <div key={index} className="border rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium capitalize">{deployment.type} Deployment</h4>
                      <p className="text-sm text-gray-600">{deployment.droneType}</p>
                      <p className="text-sm">{deployment.reason}</p>
                      <p className="text-xs text-gray-500">ETA: {deployment.estimatedTime}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      deployment.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      deployment.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {deployment.priority}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span>Available: 3</span>
              <span>Deployed: 2</span>
              <span>Maintenance: 1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Section */}
      <div className="mt-6 bg-white rounded shadow p-4">
        <h2 className="text-xl font-bold mb-4">Distress Call Heatmap ({heatmapData.length} points)</h2>
        <div className="bg-gray-200 rounded h-64 flex items-center justify-center">
          <p className="text-gray-600">
            Heatmap visualization component goes here
            <br />
            <span className="text-sm">Use Leaflet/Mapbox with {heatmapData.length} data points</span>
          </p>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Last updated: {dashboardData?.data?.lastUpdated ? new Date(dashboardData.data.lastUpdated).toLocaleString() : 'Never'}
      </div>
    </div>
  );
};

export default AgencyDashboard;
