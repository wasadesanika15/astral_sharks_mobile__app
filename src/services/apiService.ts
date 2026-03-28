import axios from 'axios';
import { storageService } from './storageService';
import * as Network from 'expo-network';

// Ensure to replace with your backend IP during dev
const BASE_URL = 'http://192.168.1.100:3000'; // Replace with the actual URL

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

export const apiService = {
  async postSOS(data: any) {
    const isConnected = (await Network.getNetworkStateAsync()).isConnected;
    if (!isConnected) {
      await storageService.pushToQueue('sos_queue', data);
      return { success: false, queued: true };
    }
    
    try {
      const res = await apiClient.post('/sos', data);
      return { success: true, data: res.data };
    } catch (error) {
      await storageService.pushToQueue('sos_queue', data);
      return { success: false, queued: true };
    }
  },

  async retryQueue() {
    const isConnected = (await Network.getNetworkStateAsync()).isConnected;
    if (!isConnected) return;
    
    // Retry SOS queue
    const sosQueue = await storageService.getQueue('sos_queue');
    if (sosQueue.length > 0) {
      for (const req of sosQueue) {
        try {
          await apiClient.post('/sos', req);
        } catch (e) {
           console.error('Retry failed', e);
           return; // Stop retrying if one fails to not double process
        }
      }
      await storageService.clearQueue('sos_queue');
    }
    // Implement similar for upload_queue if needed
  },
  
  async getZones() {
    try {
      const res = await apiClient.get('/zones');
      return res.data;
    } catch (e) {
      console.error('Get zones failed', e);
      return [];
    }
  },

  async postUpload(formData: FormData) {
    const isConnected = (await Network.getNetworkStateAsync()).isConnected;
    if (!isConnected) {
      // Note: pushing FormData to queue might require serializing file URIs instead
      // but for MVP purposes assuming simple object queue
      await storageService.pushToQueue('upload_queue', { timestamp: new Date().toISOString() });
      return { success: false, queued: true };
    }

    try {
      const res = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return { success: true, data: res.data };
    } catch (error) {
       await storageService.pushToQueue('upload_queue', { timestamp: new Date().toISOString() });
       return { success: false, queued: true };
    }
  }
};
