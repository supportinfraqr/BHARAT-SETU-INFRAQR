import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { qrApi } from '../api/endpoints';

export default function WorkersScreen({ navigation }: any) {
  const [workers, setWorkers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await qrApi.workers();
      setWorkers(res.data || []);
    } catch (e) {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('WorkerDetail', { worker: item })}>
      <Text style={styles.name}>{item.full_name}</Text>
      <Text style={styles.sub}>ID: {item.worker_id}</Text>
      <Text style={styles.sub}>Contractor: {item.contractor ? item.contractor : 'Unbound'}</Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      style={styles.container}
      data={workers}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      ListEmptyComponent={<Text style={styles.empty}>No workers</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  row: { backgroundColor: '#fff', padding: 16, marginHorizontal: 12, marginTop: 8, borderRadius: 8 },
  name: { fontSize: 16, fontWeight: '600', color: '#1a5276' },
  sub: { color: '#666', marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
});
