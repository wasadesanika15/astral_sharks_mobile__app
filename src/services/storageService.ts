import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageService = {
  async save(key: string, value: any) {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (e) {
      console.error('Error saving storage', e);
    }
  },
  
  async read(key: string) {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.error('Error reading storage', e);
      return null;
    }
  },
  
  async pushToQueue(queueKey: string, item: any) {
    const currentQueue = await this.read(queueKey) || [];
    currentQueue.push(item);
    await this.save(queueKey, currentQueue);
  },
  
  async getQueue(queueKey: string) {
    return await this.read(queueKey) || [];
  },
  
  async clearQueue(queueKey: string) {
    await this.save(queueKey, []);
  }
};
