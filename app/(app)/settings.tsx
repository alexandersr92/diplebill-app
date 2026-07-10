import { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { useColorScheme } from 'nativewind';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearSellerSession, logout } from '@/modules/auth/authSlice';
import * as SecureStore from 'expo-secure-store';
import { User, Store, LogOut, KeyRound, Sun, Moon, Monitor } from 'lucide-react-native';

export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const { colorScheme, setColorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    async function loadTheme() {
      try {
        const savedTheme = await SecureStore.getItemAsync('app_theme');
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
          setSelectedTheme(savedTheme);
          setColorScheme(savedTheme);
        }
      } catch (err) {
        console.warn('Error loading theme:', err);
      }
    }
    loadTheme();
  }, [setColorScheme]);

  const changeTheme = async (theme: 'light' | 'dark' | 'system') => {
    try {
      setSelectedTheme(theme);
      setColorScheme(theme);
      await SecureStore.setItemAsync('app_theme', theme);
    } catch (err) {
      console.warn('Error saving theme:', err);
    }
  };

  // Selectores de sesión actual
  const sellerName = useAppSelector((state) => state.auth.sellerName) || 'Sin Vendedor';
  const sellerCode = useAppSelector((state) => state.auth.sellerCode) || 'N/A';
  const storeName = useAppSelector((state) => state.auth.currentStoreName) || 'Sin Sucursal';
  const hasSellerLinked = useAppSelector((state) => state.auth.sellerId) !== null; // Si tiene seller_id de base

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir y cerrar sesión completamente de la aplicación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync('admin_token');
              await SecureStore.deleteItemAsync('seller_store_id');
              dispatch(logout());
            } catch (err) {
              console.error('Error al cerrar sesión:', err);
            }
          }
        }
      ]
    );
  };

  const handleSwitchSeller = () => {
    Alert.alert(
      'Cambiar Vendedor',
      '¿Deseas cerrar la sesión del vendedor actual y volver a la pantalla de PIN de seguridad?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cambiar',
          onPress: () => {
            dispatch(clearSellerSession());
          }
        }
      ]
    );
  };

  // Helper color for icons
  const getIconColor = (selected: boolean) => {
    if (selected) return '#ffffff';
    return colorScheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.45)';
  };

  const getButtonIconColor = () => {
    return colorScheme === 'dark' ? '#ffffff' : '#1e293b';
  };

  const getLogoutIconColor = () => {
    return colorScheme === 'dark' ? '#f87171' : '#dc2626';
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#0c3460]">
      {/* Reusable Header */}
      <Header
        title="Ajustes"
        subtitle="Configuración y sesión del dispositivo"
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 }}>

        {/* Profile Info Card */}
        <View className="bg-white dark:bg-white/10 p-5 rounded-3xl border border-slate-200 dark:border-white/5 mb-6 shadow-sm">
          <View className="flex-row items-center gap-4 mb-4">
            <View className="p-3.5 bg-blue-500/10 rounded-full border border-blue-500/20">
              <User size={24} color="#3b82f6" />
            </View>
            <View className="flex-1">
              <Text className="text-slate-900 dark:text-white text-lg font-black">{sellerName}</Text>
              <Text className="text-slate-500 dark:text-brand-300 text-xs font-bold uppercase tracking-wider">
                Código: {sellerCode}
              </Text>
            </View>
          </View>

          <View className="border-t border-slate-100 dark:border-white/5 pt-4 flex-row items-center gap-3">
            <Store size={18} color={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)'} />
            <View className="flex-1">
              <Text className="text-slate-400 dark:text-white/40 text-[9px] uppercase tracking-wider font-bold">
                Sucursal Asignada
              </Text>
              <Text className="text-slate-700 dark:text-white/80 text-sm font-semibold">{storeName}</Text>
            </View>
          </View>
        </View>

        {/* App Theme Card */}
        <View className="bg-white dark:bg-white/10 p-5 rounded-3xl border border-slate-200 dark:border-white/5 mb-6 shadow-sm">
          <Text className="text-slate-500 dark:text-white/60 text-sm font-bold mb-4 uppercase tracking-wider">
            Tema de la Aplicación
          </Text>

          <View className="flex-row gap-2">
            {/* Light Mode */}
            <Pressable
              onPress={() => changeTheme('light')}
              className={`flex-1 py-3 rounded-2xl items-center justify-center border flex-row gap-1.5 ${
                selectedTheme === 'light'
                  ? 'bg-blue-600 border-blue-500'
                  : 'bg-slate-100 border-slate-200 active:bg-slate-200 dark:bg-white/5 dark:border-white/5 dark:active:bg-white/10'
              }`}
            >
              <Sun size={15} color={getIconColor(selectedTheme === 'light')} />
              <Text className={`text-xs font-bold ${selectedTheme === 'light' ? 'text-white' : 'text-slate-500 dark:text-white/60'}`}>
                Claro
              </Text>
            </Pressable>

            {/* Dark Mode */}
            <Pressable
              onPress={() => changeTheme('dark')}
              className={`flex-1 py-3 rounded-2xl items-center justify-center border flex-row gap-1.5 ${
                selectedTheme === 'dark'
                  ? 'bg-blue-600 border-blue-500'
                  : 'bg-slate-100 border-slate-200 active:bg-slate-200 dark:bg-white/5 dark:border-white/5 dark:active:bg-white/10'
              }`}
            >
              <Moon size={15} color={getIconColor(selectedTheme === 'dark')} />
              <Text className={`text-xs font-bold ${selectedTheme === 'dark' ? 'text-white' : 'text-slate-500 dark:text-white/60'}`}>
                Oscuro
              </Text>
            </Pressable>

            {/* System */}
            <Pressable
              onPress={() => changeTheme('system')}
              className={`flex-1 py-3 rounded-2xl items-center justify-center border flex-row gap-1.5 ${
                selectedTheme === 'system'
                  ? 'bg-blue-600 border-blue-500'
                  : 'bg-slate-100 border-slate-200 active:bg-slate-200 dark:bg-white/5 dark:border-white/5 dark:active:bg-white/10'
              }`}
            >
              <Monitor size={15} color={getIconColor(selectedTheme === 'system')} />
              <Text className={`text-xs font-bold ${selectedTheme === 'system' ? 'text-white' : 'text-slate-500 dark:text-white/60'}`}>
                Sistema
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Device Information Card */}
        <View className="bg-white dark:bg-white/5 p-5 rounded-3xl border border-slate-200 dark:border-white/5 mb-8 shadow-sm">
          <Text className="text-slate-500 dark:text-white/60 text-sm font-bold mb-4 uppercase tracking-wider">
            Información del POS
          </Text>
          <View className="gap-3.5">
            <View className="flex-row justify-between items-center">
              <Text className="text-slate-500 dark:text-white/50 text-xs font-bold">Versión de App</Text>
              <Text className="text-slate-800 dark:text-white text-xs font-mono font-bold">1.0.0 (Expo Router)</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-slate-500 dark:text-white/50 text-xs font-bold">Modo de Conexión</Text>
              <Text className="text-green-600 dark:text-green-400 text-xs font-bold">Online</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="gap-3">
          {/* Cambiar Vendedor — Solo si no es un usuario vinculado directamente a seller_id */}
          {!hasSellerLinked && (
            <Pressable
              onPress={handleSwitchSeller}
              className="bg-white active:bg-slate-100 dark:bg-white/10 dark:active:bg-white/15 py-4 rounded-2xl items-center justify-center border border-slate-200 dark:border-white/5 flex-row gap-2.5 shadow-sm"
            >
              <KeyRound size={18} color={getButtonIconColor()} />
              <Text className="text-slate-800 dark:text-white text-sm font-bold">Cambiar de Vendedor</Text>
            </Pressable>
          )}

          {/* Cerrar Sesión Completa */}
          <Pressable
            onPress={handleLogout}
            className="bg-red-500/10 active:bg-red-500/20 border border-red-500/20 py-4 rounded-2xl items-center justify-center flex-row gap-2.5"
          >
            <LogOut size={18} color={getLogoutIconColor()} />
            <Text className="text-red-600 dark:text-red-400 text-sm font-black uppercase tracking-wider">
              Cerrar Sesión Completa
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
