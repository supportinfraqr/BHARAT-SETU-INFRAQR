import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { qrApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await qrApi.dashboard();
      setStats(res.data.Data);
    } catch (e) {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <Text style={styles.welcome}>Welcome, {user?.username || 'User'}</Text>
      <Text style={styles.role}>Role: {user?.role || '—'}</Text>

      {stats && (
        <View style={styles.cards}>
          <View style={[styles.card, { backgroundColor: '#1a5276' }]}>
            <Text style={styles.cardNum}>{stats.total_workers}</Text>
            <Text style={styles.cardLabel}>Total Workers</Text>
          </View>
          <View style={[styles.card, { backgroundColor: '#148f77' }]}>
            <Text style={styles.cardNum}>{stats.total_scans}</Text>
            <Text style={styles.cardLabel}>Total Scans</Text>
          </View>
          <View style={[styles.card, { backgroundColor: '#b9770e' }]}>
            <Text style={styles.cardNum}>{stats.active_sites}</Text>
            <Text style={styles.cardLabel}>Active Sites</Text>
          </View>
        </View>
      )}

      {stats?.scan_activity && (
        <View style={styles.activity}>
          <Text style={styles.sectionTitle}>Scan Activity</Text>
          <Text>Today: {stats.scan_activity.today}</Text>
          <Text>This Week: {stats.scan_activity.this_week}</Text>
          <Text>This Month: {stats.scan_activity.this_month}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Scan')}>
          <Text style={styles.actionText}>Scan QR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Workers')}>
          <Text style={styles.actionText}>Workers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Notifications')}>
          <Text style={styles.actionText}>Notifications</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa', padding: 16 },
  welcome: { fontSize: 20, fontWeight: 'bold', color: '#1a5276' },
  role: { fontSize: 13, color: '#666', marginBottom: 16 },
  cards: { flexDirection: 'row', justifyContent: 'space-between' },
  card: { flex: 1, margin: 4, borderRadius: 10, padding: 16, alignItems: 'center' },
  cardNum: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  cardLabel: { color: '#fff', marginTop: 4 },
  activity: { marginTop: 20, padding: 16, backgroundColor: '#fff', borderRadius: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  actions: { marginTop: 20 },
  actionBtn: { backgroundColor: '#1a5276', padding: 14, borderRadius: 8, marginBottom: 10, alignItems: 'center' },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
