import axios from 'axios';
import { storageService } from './storageService';
import * as Network from 'expo-network';
import { API_BASE_URL } from '../config/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
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
      await storageService.pushToQueue('upload_queue', { timestamp: new Date().toISOString() });
      return { success: false, queued: true as const };
    }

    try {
      const res = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return { success: true, data: res.data, queued: false as const };
    } catch (error) {
       await storageService.pushToQueue('upload_queue', { timestamp: new Date().toISOString() });
       return { success: false, queued: true as const };
    }
  }
};
