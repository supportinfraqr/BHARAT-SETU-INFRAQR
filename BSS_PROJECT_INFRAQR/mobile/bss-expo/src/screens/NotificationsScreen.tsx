import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { qrApi } from '../api/endpoints';

export default function NotificationsScreen() {
  const [items, setItems] = useState<any[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const res = await qrApi.notifications();
        setItems(res.data || []);
      } catch (e) {}
    })();
  }, []));

  const renderItem = ({ item }: any) => (
    <View style={styles.row}>
      <Text style={styles.type}>{item.notification_type}</Text>
      <Text>{item.message}</Text>
      <Text style={styles.date}>{item.created_at}</Text>
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      ListEmptyComponent={<Text style={styles.empty}>No notifications</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  row: { backgroundColor: '#fff', padding: 16, marginHorizontal: 12, marginTop: 8, borderRadius: 8 },
  type: { fontWeight: '700', color: '#1a5276', marginBottom: 4 },
  date: { color: '#999', marginTop: 6, fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
});
