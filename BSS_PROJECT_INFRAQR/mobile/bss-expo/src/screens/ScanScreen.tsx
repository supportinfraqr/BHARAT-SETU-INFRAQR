import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import Geolocation from '../api/geolocation';
import { qrApi } from '../api/endpoints';

export default function ScanScreen() {
  const [qrInput, setQrInput] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locStatus, setLocStatus] = useState('');
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setLocStatus('Location captured'); },
      (err) => setLocStatus(`Location unavailable: ${err.message}`),
    );
  }, []);

  const doScan = async () => {
    if (!qrInput.trim()) { Alert.alert('Error', 'Enter QR reference or scan a code'); return; }
    setBusy(true);
    try {
      const res = await qrApi.scan(qrInput.trim(), lat ?? undefined, lng ?? undefined);
      setResult(res.data);
    } catch (e: any) {
      Alert.alert('Scan failed', e?.response?.data?.Message || 'Could not process QR');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>QR Scan</Text>
      <Text style={styles.hint}>Paste the QR reference or scan from the worker ID card. Location is captured automatically for geo-verification.</Text>

      <Text style={styles.loc}>{locStatus} {lat && lng ? `(${lat.toFixed(4)}, ${lng.toFixed(4)})` : ''}</Text>

      <TextInput
        style={styles.input}
        placeholder="QR reference"
        value={qrInput}
        onChangeText={setQrInput}
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.scanBtn} onPress={doScan} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.scanText}>Verify QR</Text>}
      </TouchableOpacity>

      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Scan Result</Text>
          <Text>Status: {result.Result}</Text>
          {result.Data?.worker && (
            <>
              <Text style={styles.workerName}>{result.Data.worker.full_name}</Text>
              <Text>Worker ID: {result.Data.worker.worker_id}</Text>
            </>
          )}
          {result.Data?.attendance && (
            <View style={styles.att}>
              <Text>Location: {result.Data.attendance.location_status}</Text>
              <Text style={{ fontWeight: 'bold', fontSize: 16, color: result.Data.attendance.attendance_status === 'PRESENT' ? '#148f77' : '#c0392b' }}>
                Attendance: {result.Data.attendance.attendance_status}
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a5276' },
  hint: { marginTop: 8, color: '#666' },
  loc: { marginTop: 12, color: '#148f77', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginTop: 16, fontSize: 16 },
  scanBtn: { backgroundColor: '#1a5276', padding: 14, borderRadius: 8, marginTop: 16, alignItems: 'center' },
  scanText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resultBox: { marginTop: 20, padding: 16, backgroundColor: '#fff', borderRadius: 10 },
  resultTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  workerName: { fontSize: 18, fontWeight: 'bold', marginTop: 6 },
  att: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
});
