import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { qrApi } from '../api/endpoints';

export default function WorkerDetailScreen({ route }: any) {
  const { worker } = route.params;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{worker.full_name}</Text>
      <Text style={styles.sub}>Worker ID: {worker.worker_id}</Text>

      <View style={styles.info}>
        <Text style={styles.label}>Mobile</Text>
        <Text>{worker.mobile || '—'}</Text>
        <Text style={styles.label}>Aadhaar</Text>
        <Text>{worker.aadhaar_no || '—'}</Text>
        <Text style={styles.label}>PAN</Text>
        <Text>{worker.pan_no || '—'}</Text>
        <Text style={styles.label}>Status</Text>
        <Text>{worker.is_active ? 'Active' : 'Inactive'}</Text>
      </View>

      <Text style={styles.hint}>Worker ID Card (with static QR):</Text>
      {worker.id ? (
        <Image
          source={{ uri: qrApi.workerCard(worker.id) }}
          style={styles.card}
          resizeMode="contain"
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a5276' },
  sub: { color: '#666', marginBottom: 16 },
  info: { marginBottom: 16 },
  label: { fontWeight: '700', color: '#1a5276', marginTop: 10 },
  hint: { marginTop: 20, color: '#666' },
  card: { width: '100%', height: 260, marginTop: 8, backgroundColor: '#f0f0f0', borderRadius: 8 },
});
