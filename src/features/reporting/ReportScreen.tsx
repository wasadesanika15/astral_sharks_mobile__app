import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/apiService';
import AppHeader from '../../shared/components/AppHeader';
import { colors, radii, space } from '../../theme/rescueNet';

const THREATS = ['Critical', 'Environmental', 'Medical', 'Security'] as const;
type Threat = (typeof THREATS)[number];

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export default function ReportScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [threat, setThreat] = useState<Threat>('Critical');
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [uploadPct, setUploadPct] = useState(0);
  const [receiptHash, setReceiptHash] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const recordMs = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      const status = await requestRecordingPermissionsAsync();
      if (!status.granted) return;
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);

  useEffect(() => {
    if (recorderState.isRecording) {
      recordMs.current = Date.now();
      tickRef.current = setInterval(() => {}, 500);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [recorderState.isRecording]);

  const recordingElapsed =
    recorderState.isRecording && recordMs.current
      ? Date.now() - recordMs.current
      : recorderState.durationMillis || 0;

  const pickImage = async () => {
    const result = await ImagePicker.requestCameraPermissionsAsync();
    if (result.status !== 'granted') return;
    const pickerResult = await ImagePicker.launchCameraAsync({
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
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Microphone access is required to record audio.');
        return;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      recordMs.current = Date.now();
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recorderState.isRecording) return;
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) setAudioUri(uri);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const runUploadProgress = () =>
    new Promise<void>((resolve) => {
      let p = 0;
      const id = setInterval(() => {
        p += 9;
        if (p >= 90) {
          clearInterval(id);
          setUploadPct(90);
          resolve();
          return;
        }
        setUploadPct(p);
      }, 120);
    });

  const submitReport = async () => {
    if (!image && !audioUri) {
      Alert.alert('Incomplete', 'Please add an image or record audio first.');
      return;
    }

    setPhase('uploading');
    setUploadPct(0);
    setReceiptHash(null);

    await runUploadProgress();

    const formData = new FormData();
    if (image) {
      formData.append('image', { uri: image, name: 'report.jpg', type: 'image/jpeg' } as any);
    }
    if (audioUri) {
      formData.append('audio', { uri: audioUri, name: 'report.m4a', type: 'audio/m4a' } as any);
    }
    formData.append('timestamp', new Date().toISOString());
    formData.append('threatLevel', threat);
    formData.append('description', description);

    try {
      const res = await apiService.postUpload(formData);
      setUploadPct(100);

      if (res.success && res.data) {
        setResult(res.data);
        setReceiptHash(
          res.data.receiptHash ||
            `8XF-${Math.random().toString(36).slice(2, 8).toUpperCase()}-KL`
        );
        setPhase('success');
        setImage(null);
        setAudioUri(null);
        setDescription('');
      } else if (!res.success && (res as any).queued) {
        setPhase('idle');
        if (Platform.OS === 'web') {
          alert('Report saved locally. Will upload when online.');
        } else {
          Alert.alert('Offline Mode', 'Report saved locally. Will upload when online.');
        }
      } else {
        setPhase('idle');
        if (Platform.OS === 'web') alert('Upload failed.');
        else Alert.alert('Error', 'Could not complete upload.');
      }
    } catch {
      setPhase('idle');
      if (Platform.OS === 'web') {
        alert('Report queued locally due to network error.');
      } else {
        Alert.alert('Error', 'Report queued locally due to network error.');
      }
    }
  };

  const isRecording = recorderState.isRecording;

  return (
    <View style={styles.root}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Report Incident</Text>
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityText}>PRIORITY ALPHA</Text>
          </View>
        </View>
        <Text style={styles.intro}>
          Provide precise details for rapid deployment. Your telemetry and media are encrypted and
          broadcast to nearby responders.
        </Text>

        <TouchableOpacity style={styles.mediaCard} onPress={pickImage} activeOpacity={0.9}>
          <View style={styles.mediaTexture} />
          {image ? (
            <Image source={{ uri: image }} style={styles.preview} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={48} color={colors.coralSoft} />
              <Text style={styles.mediaTitle}>Tap to capture evidence</Text>
              <Text style={styles.mediaSub}>VISUAL CONFIRMATION REQUIRED</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.voiceCard}>
          <View style={styles.voiceHead}>
            <Ionicons name="mic" size={18} color={colors.gold} />
            <Text style={styles.voiceHeadText}>VOICE LOG</Text>
          </View>
          <View style={styles.voiceRow}>
            <TouchableOpacity
              style={[styles.recDot, isRecording && styles.recDotOn]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Ionicons name={isRecording ? 'stop' : 'mic'} size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.waveform}>
              {[0.3, 0.6, 0.4, 0.8, 0.5, 0.7, 0.35].map((h, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveBar,
                    { height: 8 + h * 22, opacity: isRecording ? 1 : 0.35 },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.timer}>
              {formatDuration(recordingElapsed)}
              {isRecording ? ' REC…' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.stopRecBtn}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Text style={styles.stopRecBtnText}>
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.threatCard}>
          <View style={styles.threatHead}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.blue} />
            <Text style={styles.threatHeadText}>THREAT LEVEL</Text>
          </View>
          <View style={styles.threatGrid}>
            {THREATS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.threatChip, threat === t && styles.threatChipOn]}
                onPress={() => setThreat(t)}
              >
                <Text style={[styles.threatChipText, threat === t && styles.threatChipTextOn]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.descCard}>
          <Text style={styles.descLabel}>SITUATION DESCRIPTION</Text>
          <TextInput
            style={styles.descInput}
            placeholder="Describe the current state, number of people involved, and immediate needs..."
            placeholderTextColor={colors.textMuted}
            multiline
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
        </View>

        {phase === 'uploading' && (
          <View style={styles.uploadBar}>
            <ActivityDot />
            <Text style={styles.uploadText}>Uploading encrypted data package…</Text>
            <Text style={styles.uploadPct}>{uploadPct}%</Text>
          </View>
        )}

        {phase === 'success' && receiptHash && (
          <View style={styles.successBar}>
            <Ionicons name="checkmark-circle" size={22} color={colors.blue} />
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>Report Transmitted</Text>
              <Text style={styles.successSub}>RECEIPT HASH: {receiptHash}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, phase === 'uploading' && styles.submitDisabled]}
          onPress={submitReport}
          disabled={phase === 'uploading'}
          activeOpacity={0.9}
        >
          <Ionicons name="paper-plane" size={22} color={colors.text} />
          <Text style={styles.submitText}>
            {phase === 'uploading' ? 'Submitting…' : 'Submit Report'}
          </Text>
        </TouchableOpacity>

        {result && phase === 'idle' && (
          <View style={styles.jsonBox}>
            <Text style={styles.jsonLabel}>Server response</Text>
            <Text style={styles.jsonText}>{JSON.stringify(result, null, 2)}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ActivityDot() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true })
    ).start();
  }, [spin]);
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate: rot }] }}>
      <View style={styles.spinner} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: space.lg, paddingBottom: 120 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
    gap: 12,
  },
  pageTitle: { flex: 1, fontSize: 26, fontWeight: '900', color: colors.text },
  priorityBadge: {
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  priorityText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, color: colors.gold },
  intro: {
    marginTop: space.md,
    marginBottom: space.xl,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  mediaCard: {
    minHeight: 200,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
    overflow: 'hidden',
  },
  mediaTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.06,
    backgroundColor: colors.coral,
  },
  preview: { width: '100%', height: 220, resizeMode: 'cover' },
  mediaTitle: { marginTop: 12, fontSize: 16, fontWeight: '800', color: colors.text },
  mediaSub: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  voiceCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.lg,
  },
  voiceHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: space.md },
  voiceHeadText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.gold,
  },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recDotOn: { backgroundColor: '#B91C1C' },
  waveform: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, height: 40 },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.coral,
  },
  timer: { fontSize: 13, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  stopRecBtn: {
    marginTop: space.md,
    backgroundColor: colors.bgElevated,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stopRecBtnText: { fontWeight: '800', color: colors.textSecondary },
  threatCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.lg,
  },
  threatHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: space.md },
  threatHeadText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.textSecondary,
  },
  threatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  threatChip: {
    width: '47%',
    paddingVertical: 14,
    borderRadius: radii.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  threatChipOn: {
    borderColor: colors.coral,
    backgroundColor: 'rgba(255, 92, 77, 0.12)',
  },
  threatChipText: { fontWeight: '800', color: colors.textMuted, fontSize: 13 },
  threatChipTextOn: { color: colors.coralSoft },
  descCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.lg,
  },
  descLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.peach,
    marginBottom: space.sm,
  },
  descInput: {
    minHeight: 100,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    padding: space.md,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  uploadBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    padding: space.md,
    borderRadius: radii.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  uploadText: { flex: 1, fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  uploadPct: { fontSize: 14, fontWeight: '900', color: colors.text },
  spinner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: colors.border,
    borderTopColor: colors.coral,
  },
  successBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    padding: space.md,
    borderRadius: radii.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  successTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  successSub: { fontSize: 11, fontWeight: '700', color: colors.blue, marginTop: 4 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.coralSoft,
    paddingVertical: 18,
    borderRadius: radii.lg,
    marginBottom: space.lg,
    shadowColor: colors.coral,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  submitDisabled: { opacity: 0.65 },
  submitText: { fontSize: 17, fontWeight: '900', color: colors.text },
  jsonBox: {
    padding: space.md,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    marginBottom: 24,
  },
  jsonLabel: { color: colors.gold, fontWeight: '800', marginBottom: 8 },
  jsonText: { color: colors.textSecondary, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
