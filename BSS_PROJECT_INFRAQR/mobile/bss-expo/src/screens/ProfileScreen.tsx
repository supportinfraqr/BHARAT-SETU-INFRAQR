import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const doLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => logout() },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{user?.username || 'User'}</Text>
      <Text style={styles.sub}>Role: {user?.role || '—'}</Text>
      {user?.email ? <Text style={styles.sub}>Email: {user.email}</Text> : null}

      <TouchableOpacity style={styles.logoutBtn} onPress={doLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a5276' },
  sub: { color: '#666', marginTop: 8 },
  logoutBtn: { backgroundColor: '#c0392b', padding: 14, borderRadius: 8, marginTop: 40, alignItems: 'center' },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
