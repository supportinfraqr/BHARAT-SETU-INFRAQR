# BSS QR Mobile — React Native (Expo) App

React Native mobile **+ web** app for the BharatSharamSetu QR workforce system.
Connects to the Django backend (`BSS_PROJECT_INFRAQR/backend`).

## Stack
- **Expo 57** (React Native 0.86, React 19, TypeScript)
- **React Navigation** (native-stack + bottom-tabs)
- **expo-camera** — QR camera scanning (native + web)
- **expo-location** — scan location capture (native + web)
- **@react-native-async-storage/async-storage** — token persistence
- **react-native-web** — web support (same codebase → Android/iOS/web)

## One codebase, three platforms
```bash
npm run android   # Android (Expo Go or dev build)
npm run ios       # iOS (needs macOS)
npm run web       # Web at http://localhost:8081
```

## Structure
```
bss-expo/
├── App.tsx                        # SafeAreaProvider + AuthProvider + Navigator
├── app.json                       # name, permissions, plugins (expo-location, expo-camera)
└── src/
    ├── api/
    │   ├── client.ts              # axios instance, BASE_URL, auth interceptors
    │   ├── endpoints.ts           # authApi / qrApi / legacyApi
    │   └── geolocation.ts         # expo-location wrapper (native + web)
    ├── context/AuthContext.tsx    # JWT login/logout, token storage
    ├── navigation/AppNavigator.tsx# tabs (Dashboard/Scan/Workers/Notifications/Profile)
    └── screens/
        ├── LoginScreen.tsx
        ├── DashboardScreen.tsx
        ├── ScanScreen.tsx         # QR verify + geo-verified attendance
        ├── WorkersScreen.tsx
        ├── WorkerDetailScreen.tsx # profile + ID card (QR PNG)
        ├── NotificationsScreen.tsx
        └── ProfileScreen.tsx
```

## Connect to backend
Edit `src/api/client.ts` `BASE_URL`:
- Android emulator: `http://10.0.2.2:8001`
- Web / physical device: `http://<your-LAN-IP>:8001`

## Endpoints used
- `POST /api/auth/login/` — JWT login
- `GET /api/qr/dashboard/` — stats
- `GET /api/qr/workers/` — worker list
- `POST /api/qr/qr/scan/` — QR scan + geo-verified attendance
- `GET /api/qr/notifications/` — alerts
- `GET /api/qr/workers/<id>/card/?format=png` — ID card
- Legacy: `X-Legacy-Login-Id` auto-added for ported endpoints

## Note
Original bare RN app (mobile-only, Android) kept at `../BSSMobile/`.
This Expo app supersedes it with native + web support.
