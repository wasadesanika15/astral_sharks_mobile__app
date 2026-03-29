// Heatmap Visualization Component
// Add this to your React app

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const HeatmapVisualization = ({ data, timeRange, onPointClick }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // Initialize map
    if (!mapInstanceRef.current && mapRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([40.7128, -74.0060], 10);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !data) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];

    // Add markers for each data point
    data.forEach(point => {
      const color = getMarkerColor(point.type, point.weight);
      const size = getMarkerSize(point.weight);
      
      // Create custom icon
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background-color: ${color};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: 2px solid white;
          opacity: ${0.7 + point.weight * 0.3};
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
      });

      const marker = L.marker([point.lat, point.lng], { icon: customIcon })
        .addTo(mapInstanceRef.current);

      // Add popup with information
      const popupContent = `
        <div style="min-width: 200px;">
          <h4 style="margin: 0 0 8px 0; text-transform: capitalize;">${point.type} Incident</h4>
          <p style="margin: 4px 0;"><strong>Priority:</strong> ${(point.weight * 100).toFixed(0)}%</p>
          <p style="margin: 4px 0;"><strong>Time:</strong> ${new Date(point.timestamp).toLocaleString()}</p>
          ${point.metadata?.battery_level ? `<p style="margin: 4px 0;"><strong>Battery:</strong> ${point.metadata.battery_level}%</p>` : ''}
          ${point.metadata?.threat_level ? `<p style="margin: 4px 0;"><strong>Threat Level:</strong> ${point.metadata.threat_level}/5</p>` : ''}
        </div>
      `;
      
      marker.bindPopup(popupContent);

      // Add click handler
      if (onPointClick) {
        marker.on('click', () => onPointClick(point));
      }

      markersRef.current.push(marker);
    });

    // Fit map to show all markers
    if (data.length > 0) {
      const group = new L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }

  }, [data, onPointClick]);

  const getMarkerColor = (type, weight) => {
    if (type === 'sos') {
      return '#ef4444'; // Red for SOS
    }
    
    // Color based on incident type
    const colors = {
      fire: '#f97316',    // Orange
      medical: '#3b82f6', // Blue
      flood: '#06b6d4',   // Cyan
      manual: '#6b7280'   // Gray
    };
    
    return colors[type] || '#6b7280';
  };

  const getMarkerSize = (weight) => {
    // Size based on weight (priority)
    const baseSize = 20;
    const maxSize = 40;
    return baseSize + (weight * (maxSize - baseSize));
  };

  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        style={{ height: '500px', width: '100%', borderRadius: '8px' }}
      />
      <div className="absolute top-4 right-4 bg-white p-3 rounded shadow z-10">
        <h4 className="font-medium text-sm mb-2">Legend</h4>
        <div className="space-y-1">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span className="text-xs">SOS Emergency</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
            <span className="text-xs">Fire Incident</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span className="text-xs">Medical Emergency</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-cyan-500 mr-2"></div>
            <span className="text-xs">Flood Incident</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
            <span className="text-xs">Manual Report</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t text-xs text-gray-600">
          Size indicates priority level
        </div>
      </div>
      <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded shadow z-10">
        <p className="text-xs text-gray-600">
          {data.length} incidents • {timeRange}
        </p>
      </div>
    </div>
  );
};

export default HeatmapVisualization;
