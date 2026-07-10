import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { authService, StoreData } from '@/modules/auth/authService';
import { useAppDispatch } from '@/store/hooks';
import { setSellerSession, logout } from '@/modules/auth/authSlice';
import * as SecureStore from 'expo-secure-store';
import { ShieldAlert, Store, LogOut, ChevronDown, Check, User } from 'lucide-react-native';

export default function SellerLoginScreen() {
  const dispatch = useAppDispatch();
  const { colorScheme } = useColorScheme();

  // Lista de tiendas y estados de carga
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [isStoreModalVisible, setIsStoreModalVisible] = useState(false);

  // Campos de formulario
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar lista de tiendas al montar
  useEffect(() => {
    async function loadStores() {
      try {
        setError(null);
        setLoadingStores(true);
        const list = await authService.fetchStoresList();
        setStores(list);
        if (list.length === 1) {
          setSelectedStore(list[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar las sucursales.');
      } finally {
        setLoadingStores(false);
      }
    }
    loadStores();
  }, []);

  const handleSellerLogin = async () => {
    if (!selectedStore) {
      setError('Por favor, selecciona una sucursal.');
      return;
    }
    if (!code.trim()) {
      setError('Por favor, ingresa tu código de vendedor.');
      return;
    }
    if (!pin.trim()) {
      setError('Por favor, ingresa tu PIN de seguridad.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await authService.loginSeller(selectedStore.id, code.trim(), pin.trim());

      if (res.seller) {
        // Actualizar estado de Redux con la sesión del vendedor
        dispatch(
          setSellerSession({
            sellerId: res.seller.id,
            sellerName: res.seller.name,
            sellerCode: res.seller.code,
            storeId: selectedStore.id,
            storeName: selectedStore.name
          })
        );
        // Expo Router redirige automáticamente porque cambia el estado de auth.isSellerAuthenticated
      } else {
        setError('Error al validar las credenciales del vendedor.');
      }
    } catch (err: any) {
      if (__DEV__) {
        console.error('Error de login vendedor:', err);
      }
      setError(err.message || 'Credenciales incorrectas.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('admin_token');
      dispatch(logout());
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  if (loadingStores) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0c3460] justify-center items-center">
        <ActivityIndicator size="large" color="#0c85eb" />
        <Text className="text-slate-500 dark:text-white/60 mt-4 text-sm font-medium">Cargando sucursales...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0c3460]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center px-8 py-12">
            {/* Header */}
            <View className="items-center mb-8">
              <Text className="text-slate-900 dark:text-white text-4xl font-extrabold tracking-tight">DipleBill</Text>
              <Text className="text-slate-500 dark:text-brand-300 text-base mt-2 font-medium">Acceso Vendedor</Text>
            </View>

            {/* Form Card */}
            <View className="bg-white dark:bg-white/10 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none">
              {error && (
                <View className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-4">
                  <Text className="text-red-600 dark:text-red-200 text-sm font-medium text-center">{error}</Text>
                </View>
              )}

              {/* Selector de Sucursal */}
              <View className="mb-4">
                <Text className="text-slate-700 dark:text-white/80 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
                  Sucursal / Tienda
                </Text>
                <Pressable
                  onPress={() => setIsStoreModalVisible(true)}
                  className="bg-slate-50 dark:bg-white/10 text-slate-900 dark:text-white px-4 py-3.5 rounded-xl border border-slate-200 dark:border-white/10 flex-row justify-between items-center"
                >
                  <View className="flex-row items-center">
                    <Store size={18} color={colorScheme === 'dark' ? '#b9dffe' : '#3b82f6'} className="mr-2" />
                    <Text className="text-slate-900 dark:text-white text-base font-medium">
                      {selectedStore ? selectedStore.name : 'Seleccionar Sucursal'}
                    </Text>
                  </View>
                  <ChevronDown size={18} color={colorScheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.6)'} />
                </Pressable>
              </View>

              {/* Código de Vendedor */}
              <View className="mb-4">
                <Text className="text-slate-700 dark:text-white/80 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
                  Código de Vendedor
                </Text>
                <View className="relative justify-center">
                  <User size={18} color={colorScheme === 'dark' ? '#b9dffe' : '#3b82f6'} className="absolute left-4 z-10" />
                  <TextInput
                    value={code}
                    onChangeText={(text) => {
                      setCode(text);
                      setError(null);
                    }}
                    placeholder="Ej. VEND-01"
                    placeholderTextColor={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)'}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    className="bg-slate-50 dark:bg-white/10 text-slate-900 dark:text-white pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-white/10 text-base"
                  />
                </View>
              </View>

              {/* PIN de Seguridad */}
              <View className="mb-6">
                <Text className="text-slate-700 dark:text-white/80 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
                  PIN de Seguridad
                </Text>
                <TextInput
                  value={pin}
                  onChangeText={(text) => {
                    setPin(text.replace(/\D/g, ''));
                    setError(null);
                  }}
                  placeholder="PIN Numérico"
                  placeholderTextColor={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)'}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={10}
                  className="bg-slate-50 dark:bg-white/10 text-slate-900 dark:text-white px-4 py-3.5 rounded-xl border border-slate-200 dark:border-white/10 text-base tracking-widest"
                />
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleSellerLogin}
                disabled={loading}
                className={`py-4 rounded-xl items-center justify-center shadow-md active:opacity-90 ${
                  loading ? 'bg-brand-500/50' : 'bg-brand-500'
                }`}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white text-base font-bold">Desbloquear Pantalla</Text>
                )}
              </Pressable>
            </View>

            {/* Logout Admin Button */}
            <Pressable
              onPress={handleAdminLogout}
              className="mt-8 flex-row items-center justify-center self-center py-2 px-4 rounded-lg bg-slate-200/50 dark:bg-black/20 border border-slate-300 dark:border-white/5 active:bg-slate-300/50 dark:active:bg-black/35"
            >
              <LogOut size={14} color={colorScheme === 'dark' ? '#f0f7ff' : '#1e293b'} className="mr-2" />
              <Text className="text-slate-700 dark:text-white/80 text-xs font-semibold">
                Cerrar sesión de administrador
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Selector de Sucursales */}
      <Modal
        visible={isStoreModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsStoreModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white dark:bg-[#0c3460] rounded-t-3xl border-t border-slate-200 dark:border-white/10 p-6 max-h-[60%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-slate-900 dark:text-white text-xl font-bold">Seleccionar Sucursal</Text>
              <Pressable
                onPress={() => setIsStoreModalVisible(false)}
                className="py-1 px-3 bg-slate-100 dark:bg-white/10 rounded-lg"
              >
                <Text className="text-slate-600 dark:text-white/80 text-sm font-medium">Cerrar</Text>
              </Pressable>
            </View>

            <FlatList
              data={stores}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedStore?.id === item.id;
                return (
                  <Pressable
                    onPress={() => {
                      setSelectedStore(item);
                      setIsStoreModalVisible(false);
                      setError(null);
                    }}
                    className={`p-4 rounded-xl mb-3 flex-row justify-between items-center border ${
                      isSelected ? 'bg-blue-600 border-blue-500' : 'bg-slate-50 border-slate-200 dark:bg-white/10 dark:border-white/5'
                    }`}
                  >
                    <View className="flex-row items-center">
                      <Store size={18} color={isSelected ? '#ffffff' : (colorScheme === 'dark' ? '#ffffff' : '#1e293b')} className="mr-3" />
                      <Text className={`text-base font-medium ${isSelected ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{item.name}</Text>
                    </View>
                    {isSelected && <Check size={18} color="#ffffff" />}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
