import { useState } from 'react';
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
import { authService, SellerStoreData } from '@/modules/auth/authService';
import { useAppDispatch } from '@/store/hooks';
import { setToken, setFullSession } from '@/modules/auth/authSlice';
import * as SecureStore from 'expo-secure-store';
import { Store, ChevronRight, Check } from 'lucide-react-native';

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const { colorScheme } = useColorScheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para selector de tienda (vendedores con múltiples tiendas)
  const [showStorePicker, setShowStorePicker] = useState(false);
  const [pendingSellerData, setPendingSellerData] = useState<{
    token: string;
    sellerId: string;
    sellerName: string;
    sellerCode: string;
    stores: SellerStoreData[];
  } | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (__DEV__) console.log('1. Llamando a authService.loginAdmin con email:', email.trim());
      const data = await authService.loginAdmin(email.trim(), password);
      if (__DEV__) console.log('2. Respuesta recibida con token:', !!data?.token);

      if (data.token) {
        if (__DEV__) console.log('3. Guardando token en SecureStore...');
        await SecureStore.setItemAsync('admin_token', data.token);

        const seller = data.attributes?.seller;

        if (seller && seller.stores && seller.stores.length > 0) {
          // Usuario con seller vinculado — auto-login
          if (__DEV__)
            console.log('4. Seller detectado:', seller.name, '- Tiendas:', seller.stores.length);

          if (seller.stores.length === 1) {
            // Solo 1 tienda → auto-seleccionar
            const store = seller.stores[0];
            await SecureStore.setItemAsync('seller_store_id', store.id);
            dispatch(
              setFullSession({
                token: data.token,
                sellerId: seller.id,
                sellerName: seller.name,
                sellerCode: seller.code,
                storeId: store.id,
                storeName: store.name
              })
            );
            if (__DEV__) console.log('5. Auto-login completo con tienda:', store.name);
          } else {
            // Múltiples tiendas → mostrar picker con la primera pre-seleccionada
            setPendingSellerData({
              token: data.token,
              sellerId: seller.id,
              sellerName: seller.name,
              sellerCode: seller.code,
              stores: seller.stores
            });
            setSelectedStoreId(seller.stores[0].id);
            setShowStorePicker(true);
            if (__DEV__) console.log('5. Mostrando picker de tiendas...');
          }
        } else {
          // Admin sin seller → flujo normal de 2 pasos
          if (__DEV__) console.log('4. Admin sin seller, flujo normal.');
          dispatch(setToken(data.token));
          if (__DEV__) console.log('5. Token despachado a Redux con éxito.');
        }
      } else {
        setError('No se recibió un token de acceso.');
      }
    } catch (err: any) {
      if (__DEV__) {
        console.error('Error de login admin:', err);
      }
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      if (__DEV__) console.log('6. Finalizando loading (setLoading false).');
      setLoading(false);
    }
  };

  const handleStoreSelected = async () => {
    if (!pendingSellerData || !selectedStoreId) return;

    const store = pendingSellerData.stores.find((s) => s.id === selectedStoreId);
    if (!store) return;

    await SecureStore.setItemAsync('seller_store_id', store.id);
    dispatch(
      setFullSession({
        token: pendingSellerData.token,
        sellerId: pendingSellerData.sellerId,
        sellerName: pendingSellerData.sellerName,
        sellerCode: pendingSellerData.sellerCode,
        storeId: store.id,
        storeName: store.name
      })
    );
    setShowStorePicker(false);
    setPendingSellerData(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0c3460]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center px-8 py-12">
            {/* Header */}
            <View className="items-center mb-10">
              <Text className="text-slate-900 dark:text-white text-4xl font-extrabold tracking-tight">DipleBill</Text>
              <Text className="text-slate-500 dark:text-brand-300 text-base mt-2 font-medium">
                Punto de Venta Móvil
              </Text>
            </View>

            {/* Form Card */}
            <View className="bg-white dark:bg-white/10 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none">
              {error && (
                <View className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-4">
                  <Text className="text-red-600 dark:text-red-200 text-sm font-medium text-center">{error}</Text>
                </View>
              )}

              {/* Email Input */}
              <View className="mb-4">
                <Text className="text-slate-700 dark:text-white/80 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
                  Correo Electrónico
                </Text>
                <TextInput
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError(null);
                  }}
                  placeholder="ejemplo@correo.com"
                  placeholderTextColor={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="bg-slate-50 dark:bg-white/10 text-slate-900 dark:text-white px-4 py-3.5 rounded-xl border border-slate-200 dark:border-white/10 text-base"
                />
              </View>

              {/* Password Input */}
              <View className="mb-6">
                <Text className="text-slate-700 dark:text-white/80 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
                  Contraseña
                </Text>
                <TextInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError(null);
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)'}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="bg-slate-50 dark:bg-white/10 text-slate-900 dark:text-white px-4 py-3.5 rounded-xl border border-slate-200 dark:border-white/10 text-base"
                />
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleLogin}
                disabled={loading}
                className={`py-4 rounded-xl items-center justify-center shadow-md active:opacity-90 ${
                  loading ? 'bg-brand-500/50' : 'bg-brand-500'
                }`}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white text-base font-bold">Iniciar Sesión</Text>
                )}
              </Pressable>
            </View>

            {/* Footer metadata */}
            <View className="items-center mt-12">
              <Text className="text-slate-400 dark:text-white/40 text-xs">DipleBill Mobile POS v1.0.0</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Store Picker Modal — para vendedores con múltiples tiendas */}
      <Modal
        visible={showStorePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}}
      >
        <SafeAreaView className="flex-1 bg-black/60 justify-end">
          <View className="bg-white dark:bg-[#0c3460] rounded-t-3xl border-t border-slate-200 dark:border-white/10 p-6">
            {/* Header */}
            <View className="items-center mb-6">
              <View className="p-3 bg-blue-950/40 rounded-full border border-blue-800/40 mb-3">
                <Store size={28} color="#3b82f6" />
              </View>
              <Text className="text-slate-900 dark:text-white text-xl font-bold">Seleccionar Sucursal</Text>
              <Text className="text-slate-500 dark:text-white/50 text-sm text-center mt-1">
                {pendingSellerData
                  ? `¡Hola ${pendingSellerData.sellerName}! Elige tu sucursal para iniciar.`
                  : 'Elige la sucursal para iniciar.'}
              </Text>
            </View>

            {/* Store list */}
            <FlatList
              data={pendingSellerData?.stores || []}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => {
                const isSelected = selectedStoreId === item.id;
                return (
                  <Pressable
                    onPress={() => setSelectedStoreId(item.id)}
                    className={`p-4 rounded-2xl mb-2 flex-row justify-between items-center border ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500/50'
                        : 'bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/5 active:bg-slate-100 dark:active:bg-white/10'
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <Store size={18} color={isSelected ? '#3b82f6' : (colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)')} />
                      <Text
                        className={`text-sm font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-white'}`}
                      >
                        {item.name}
                      </Text>
                    </View>
                    {isSelected && <Check size={18} color="#3b82f6" />}
                  </Pressable>
                );
              }}
            />

            {/* Confirm button */}
            <Pressable
              onPress={handleStoreSelected}
              disabled={!selectedStoreId}
              className="bg-blue-600 active:bg-blue-700 py-4 rounded-xl items-center justify-center shadow-lg mt-4 flex-row gap-2"
            >
              <ChevronRight size={18} color="#ffffff" />
              <Text className="text-white text-sm font-black uppercase tracking-wider">
                Continuar
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
