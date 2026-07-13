import '../global.css';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, DeviceEventEmitter } from 'react-native';
import { LicenseExpiredOverlay } from '@/modules/auth/components/LicenseExpiredOverlay';
import * as SecureStore from 'expo-secure-store';
import { useAppDispatch } from '@/store/hooks';
import { setToken, setFullSession, logout } from '@/modules/auth/authSlice';
import { authService } from '@/modules/auth/authService';
import { useSegments, useRouter } from 'expo-router';
import { useAppSelector } from '@/store/hooks';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isSellerAuthenticated = useAppSelector((state) => state.auth.isSellerAuthenticated);

  const [licenseExpired, setLicenseExpired] = useState<{ isExpired: boolean; message?: string }>({
    isExpired: false,
  });

  useEffect(() => {
    async function initializeAuth() {
      try {
        const token = await SecureStore.getItemAsync('admin_token');
        if (token) {
          // Validar el token con la API — ahora retorna datos del usuario
          const user = await authService.validateAdminToken(token);
          if (user) {
            // ¿El usuario tiene un seller vinculado?
            if (user.seller && user.seller.stores.length > 0) {
              // Leer tienda guardada o usar la primera asignada
              const savedStoreId = await SecureStore.getItemAsync('seller_store_id');
              const matchedStore = savedStoreId
                ? user.seller.stores.find((s) => s.id === savedStoreId)
                : null;
              const selectedStore = matchedStore || user.seller.stores[0];

              // Persistir la tienda seleccionada para futuros reinicios
              await SecureStore.setItemAsync('seller_store_id', selectedStore.id);

              // Login completo en un solo dispatch
              dispatch(
                setFullSession({
                  token,
                  sellerId: user.seller.id,
                  sellerName: user.seller.name,
                  sellerCode: user.seller.code,
                  storeId: selectedStore.id,
                  storeName: selectedStore.name
                })
              );
            } else {
              // Admin sin seller → flujo normal de 2 pasos
              dispatch(setToken(token));
            }
          } else {
            // Token expirado o inválido
            await SecureStore.deleteItemAsync('admin_token');
            await SecureStore.deleteItemAsync('seller_store_id');
            dispatch(logout());
          }
        }
      } catch (error) {
        console.error('Error al inicializar sesión:', error);
      } finally {
        setIsReady(true);
      }
    }
    initializeAuth();
  }, [dispatch]);

  // Manejar redirecciones basadas en el estado de autenticación
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    if (!isAuthenticated) {
      if (!inAuthGroup || segments[1] !== 'login') {
        router.replace('/(auth)/login');
      }
    } else if (!isSellerAuthenticated) {
      if (segments[1] !== 'seller-login') {
        router.replace('/(auth)/seller-login');
      }
    } else {
      if (!inAppGroup) {
        router.replace('/(app)');
      }
    }
  }, [isReady, isAuthenticated, isSellerAuthenticated, segments]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('LICENSE_EXPIRED', (event: any) => {
      setLicenseExpired({
        isExpired: true,
        message: event?.message,
      });
    });

    return () => subscription.remove();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {licenseExpired.isExpired && <LicenseExpiredOverlay message={licenseExpired.message} />}
      {children}
      {!isReady && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: '#600c0cff',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
          }}
        >
          <ActivityIndicator size="large" color="#0c85eb" />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <AppInitializer>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
        </AppInitializer>
      </Provider>
    </GestureHandlerRootView>
  );
}
