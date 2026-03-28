import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { apiService } from '../../services/apiService';

export default function ReportScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const pickImage = async () => {
    let result = await ImagePicker.requestCameraPermissionsAsync();
    if (result.status !== 'granted') return;

    let pickerResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!pickerResult.canceled) {
      setImage(pickerResult.assets[0].uri);
    }
  };

  const startRecording = async () => {
    if (Platform.OS === 'web') {
      alert('Audio recording is not supported in this web preview.');
      return;
    }
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync( Audio.RecordingOptionsPresets.HIGH_QUALITY );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setRecording(null);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setAudioUri(uri);
  };

  const submitReport = async () => {
    if (!image && !audioUri) {
      Alert.alert('Incomplete', 'Please add an image or record audio first.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      if (image) {
        formData.append('image', { uri: image, name: 'report.jpg', type: 'image/jpeg' } as any);
      }
      if (audioUri) {
        formData.append('audio', { uri: audioUri, name: 'report.m4a', type: 'audio/m4a' } as any);
      }
      formData.append('timestamp', new Date().toISOString());

      const res = await apiService.postUpload(formData); 
      
      if (res.queued) {
        if (Platform.OS === 'web') {
          alert('Report saved locally. Will upload when online.');
        } else {
          Alert.alert('Offline Mode', 'Report saved locally. Will upload when online.');
        }
      } else {
        setResult(res.data);
        if (Platform.OS === 'web') {
          alert('Report analyzed successfully.');
        } else {
          Alert.alert('Success', 'Report analyzed successfully.');
        }
      }
      setImage(null);
      setAudioUri(null);
    } catch (e) {
      if (Platform.OS === 'web') {
        alert('Report queued locally due to network error.');
      } else {
        Alert.alert('Error', 'Report queued locally due to network error.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Submit Incident Report</Text>

      <View style={styles.mediaContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.previewImage} />
        ) : (
          <View style={styles.placeholderBox}><Text style={styles.placeholderText}>No Image</Text></View>
        )}
        <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
          <Text style={styles.btnText}>📷 Capture Image</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mediaContainer}>
        <Text style={styles.audioLabel}>
          {recording ? '🔴 Recording...' : audioUri ? '🎙️ Audio Recorded' : 'No Audio'}
        </Text>
        <TouchableOpacity 
          style={[styles.audioBtn, recording && styles.recordingBtn]}
          onPress={recording ? stopRecording : startRecording}
        >
          <Text style={styles.btnText}>{recording ? 'Stop Recording' : '🎤 Record Audio'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.submitBtn, isUploading && styles.submitBtnDisabled]}
        onPress={submitReport}
        disabled={isUploading}
      >
        <Text style={styles.submitText}>{isUploading ? 'Uploading...' : 'Submit Report'}</Text>
      </TouchableOpacity>

      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultHeader}>AI Detection Result:</Text>
          <Text style={styles.resultText}>{JSON.stringify(result, null, 2)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C1C1E', padding: 20, paddingTop: 60 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginBottom: 30, textAlign: 'center' },
  mediaContainer: { alignItems: 'center', marginBottom: 30 },
  previewImage: { width: 200, height: 200, borderRadius: 10, marginBottom: 15 },
  placeholderBox: { width: 200, height: 200, borderRadius: 10, backgroundColor: '#2C2C2E', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  placeholderText: { color: '#636366' },
  cameraBtn: { backgroundColor: '#0A84FF', padding: 15, borderRadius: 10, width: 200, alignItems: 'center' },
  audioLabel: { color: '#FFF', fontSize: 16, marginBottom: 15 },
  audioBtn: { backgroundColor: '#32D74B', padding: 15, borderRadius: 10, width: 200, alignItems: 'center' },
  recordingBtn: { backgroundColor: '#FF453A' },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#FF3B30', padding: 20, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  submitBtnDisabled: { backgroundColor: '#8E1D16' },
  submitText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  resultContainer: { marginTop: 30, padding: 15, backgroundColor: '#2C2C2E', borderRadius: 10 },
  resultHeader: { color: '#FFD60A', fontWeight: 'bold', marginBottom: 5 },
  resultText: { color: '#FFF' },
});
