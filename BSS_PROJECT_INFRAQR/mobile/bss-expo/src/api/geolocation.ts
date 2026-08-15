import * as Location from 'expo-location';

/**
 * Geolocation wrapper using expo-location (works on Android, iOS and web).
 * Mirrors the getCurrentPosition(success, error, options) shape used by ScanScreen.
 */
export default {
  async getCurrentPosition(
    success: (pos: { coords: { latitude: number; longitude: number } }) => void,
    error?: (err: { message: string; code?: number }) => void,
  ) {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        error && error({ message: 'Location permission denied', code: 1 });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      success({ coords: { latitude: loc.coords.latitude, longitude: loc.coords.longitude } });
    } catch (e: any) {
      error && error({ message: e?.message || 'Location unavailable', code: e?.code });
    }
  },
};
