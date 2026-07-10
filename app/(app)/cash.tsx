import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { useColorScheme } from 'nativewind';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchCashSettingsAndSession,
  openCashSession,
  closeCashSession
} from '@/modules/billing/cashSlice';
import { clearSellerSession } from '@/modules/auth/authSlice';
import { ShieldCheck, Calendar, User, LayoutGrid, Coins, AlertCircle } from 'lucide-react-native';

export default function CashScreen() {
  const dispatch = useAppDispatch();
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const storeId = useAppSelector((state) => state.auth.currentStoreId) || '';
  const storeName = useAppSelector((state) => state.auth.currentStoreName) || 'Sucursal';
  const sellerName = useAppSelector((state) => state.auth.sellerName) || 'Vendedor';
  const { activeSession, isOpen, totals, isLoading, error } = useAppSelector((state) => state.cash);

  // Estados locales para formularios
  const [openingBalance, setOpeningBalance] = useState('');
  const [cashRegisterName, setCashRegisterName] = useState('');
  const [openingError, setOpeningError] = useState<string | null>(null);
  const [isOpeningCash, setIsOpeningCash] = useState(false);
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');

  // Cargar sesión al montar o cuando cambie sucursal
  useEffect(() => {
    if (storeId) {
      dispatch(fetchCashSettingsAndSession(storeId));
    }
  }, [dispatch, storeId]);

  const handleOpenCash = async () => {
    const balance = Number(openingBalance);
    if (isNaN(balance) || balance < 0) {
      setOpeningError('El fondo inicial de apertura debe ser un número mayor o igual a 0.');
      return;
    }

    setIsOpeningCash(true);
    setOpeningError(null);

    try {
      await dispatch(
        openCashSession({
          storeId,
          openingBalance: balance,
          cashRegisterName: cashRegisterName.trim() || undefined
        })
      ).unwrap();
      Alert.alert('Caja Abierta', `Se inició el turno con un fondo de $${balance.toFixed(2)}.`);
      setOpeningBalance('');
      setCashRegisterName('');
    } catch (err: any) {
      setOpeningError(err || 'No se pudo abrir la sesión de caja.');
    } finally {
      setIsOpeningCash(false);
    }
  };

  const handleLogoutSellerStrict = () => {
    dispatch(clearSellerSession());
  };

  const handleCloseCash = async () => {
    const cash = Number(actualCash);
    if (isNaN(cash) || cash < 0) {
      Alert.alert('Error', 'Por favor, ingresa el conteo de efectivo válido.');
      return;
    }

    Alert.alert('Confirmar Cierre', '¿Estás seguro de que deseas cerrar la caja con este conteo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí, Cerrar',
        style: 'destructive',
        onPress: async () => {
          try {
            if (activeSession) {
              await dispatch(
                closeCashSession({
                  cashSessionId: activeSession.id,
                  actualCash: cash,
                  notes,
                  storeId
                })
              ).unwrap();
              Alert.alert('Caja Cerrada', '¡La sesión de caja se cerró exitosamente!');
              setActualCash('');
              setNotes('');
            }
          } catch (err: any) {
            Alert.alert('Error al cerrar caja', err || 'Hubo un error de conexión.');
          }
        }
      }
    ]);
  };

  if (isLoading && !activeSession) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0c3460] justify-center items-center">
        <ActivityIndicator size="large" color="#0c85eb" />
        <Text className="text-slate-500 dark:text-white/60 mt-4 text-sm font-medium">Cargando estado de caja...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#0c3460]">
      {/* Reusable Header */}
      <Header
        title="Control de Caja"
        subtitle={`${storeName} • ${sellerName}`}
      />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 px-6 py-6 justify-between">
          {/* Estado de la Caja */}
          {!isOpen ? (
            /* VISTA DE CAJA CERRADA (SOLICITAR APERTURA) */
            <View className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden my-auto self-center">
              {/* Decorative elements */}
              <View className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
              <View className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

              <View className="items-center mb-6">
                <View className="p-4 bg-blue-950/40 rounded-full border border-blue-800/40 mb-3">
                  <Coins size={32} color="#3b82f6" />
                </View>
                <Text className="text-slate-900 dark:text-white text-lg font-black tracking-tight uppercase text-center">
                  Apertura de Caja
                </Text>
                <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold text-center mt-1">
                  Se requiere registrar el fondo inicial para iniciar la facturación
                </Text>
              </View>

              {/* Info panel */}
              <View className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50 dark:bg-slate-950/40 mb-5 gap-2 w-full">
                <View className="flex-row justify-between items-center">
                  <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold">Sucursal:</Text>
                  <Text className="text-slate-800 dark:text-white text-xs font-bold truncate max-w-[200px]">
                    {storeName}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold">Cajero/Vendedor:</Text>
                  <Text className="text-slate-800 dark:text-white text-xs font-bold">{sellerName}</Text>
                </View>
              </View>

              {/* Form */}
              <View className="gap-4 w-full">
                <View className="gap-1.5">
                  <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Fondo Inicial de Apertura ($)
                  </Text>
                  <View className="relative justify-center">
                    <Text className="absolute left-4 z-10 text-sm font-black text-slate-500">$</Text>
                    <TextInput
                      value={openingBalance}
                      onChangeText={setOpeningBalance}
                      placeholder="0.00"
                      placeholderTextColor={colorScheme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                      keyboardType="numeric"
                      className="pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-base font-black"
                      editable={!isOpeningCash}
                    />
                  </View>
                </View>

                <View className="gap-1.5">
                  <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nombre/Número de Caja (Opcional)
                  </Text>
                  <TextInput
                    placeholder="Ej: Caja Principal, Caja Estación 2"
                    placeholderTextColor={colorScheme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                    value={cashRegisterName}
                    onChangeText={setCashRegisterName}
                    className="px-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    editable={!isOpeningCash}
                  />
                </View>

                {openingError && (
                  <View className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl flex-row items-center gap-2">
                    <Text className="text-red-400 text-xs font-bold flex-1">{openingError}</Text>
                  </View>
                )}

                <View className="gap-2.5 pt-2">
                  <Pressable
                    onPress={handleOpenCash}
                    disabled={isOpeningCash}
                    className="w-full bg-blue-600 active:bg-blue-700 rounded-xl py-4 items-center justify-center shadow-lg"
                  >
                    {isOpeningCash ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text className="text-white text-sm font-black uppercase tracking-wider text-center">
                        Abrir Caja e Iniciar
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={handleLogoutSellerStrict}
                    disabled={isOpeningCash}
                    className="w-full py-2 items-center justify-center"
                  >
                    <Text className="text-slate-500 hover:text-slate-600 text-xs font-bold decoration-solid underline">
                      Cerrar Sesión del Vendedor
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            /* VISTA DE CAJA ABIERTA (CIERRE Y TOTALES) */
            <View className="flex-1 gap-6">
              {/* Resumen de la sesión activa */}
              <View className="bg-white dark:bg-white/10 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <ShieldCheck size={18} color="#4ade80" style={{ marginRight: 8 }} />
                    <Text className="text-slate-800 dark:text-white font-bold text-base">Sesión Abierta</Text>
                  </View>
                  <Text className="text-slate-500 dark:text-white/60 text-xs font-medium">
                    ID: {activeSession?.id.slice(0, 8)}...
                  </Text>
                </View>

                <View className="border-t border-slate-100 dark:border-white/10 pt-3 gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 dark:text-white/60 text-sm">Apertura:</Text>
                    <Text className="text-slate-700 dark:text-white font-medium text-sm">
                      {activeSession?.opened_at
                        ? new Date(activeSession.opened_at).toLocaleTimeString()
                        : 'N/A'}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 dark:text-white/60 text-sm">Fondo Inicial:</Text>
                    <Text className="text-slate-800 dark:text-white font-bold text-sm">
                      ${Number(activeSession?.opening_balance).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Totales Recaudados */}
              <View className="bg-white dark:bg-white/10 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
                <Text className="text-slate-500 dark:text-white/80 text-xs font-semibold uppercase tracking-wider mb-3">
                  Resumen de Ventas
                </Text>

                <View className="gap-2.5">
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 dark:text-white/60 text-sm">Efectivo:</Text>
                    <Text className="text-slate-700 dark:text-white font-semibold text-sm">
                      ${Number(totals?.invoice_cash ?? 0).toFixed(2)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 dark:text-white/60 text-sm">Tarjetas:</Text>
                    <Text className="text-slate-700 dark:text-white font-semibold text-sm">
                      ${Number(totals?.invoice_card ?? 0).toFixed(2)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 dark:text-white/60 text-sm">Transferencias:</Text>
                    <Text className="text-slate-700 dark:text-white font-semibold text-sm">
                      ${Number(totals?.invoice_transfer ?? 0).toFixed(2)}
                    </Text>
                  </View>
                  <View className="border-t border-slate-100 dark:border-white/10 pt-2 flex-row justify-between items-center">
                    <Text className="text-slate-700 dark:text-white/80 font-bold text-sm">Esperado en Caja:</Text>
                    <Text className="text-brand-600 dark:text-brand-300 font-extrabold text-lg">
                      ${Number(totals?.expected_cash ?? 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Formulario de Cierre */}
              <View className="bg-white dark:bg-white/10 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
                <Text className="text-slate-500 dark:text-white/80 text-xs font-semibold uppercase tracking-wider mb-3">
                  Cierre de Turno
                </Text>

                <View className="mb-4">
                  <Text className="text-slate-500 dark:text-white/60 text-xs mb-1.5 ml-1">Efectivo Real en Caja</Text>
                  <TextInput
                    value={actualCash}
                    onChangeText={setActualCash}
                    placeholder="Monto total contado"
                    placeholderTextColor={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                    keyboardType="numeric"
                    className="bg-slate-50 dark:bg-white/10 text-slate-900 dark:text-white px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-base"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-slate-500 dark:text-white/60 text-xs mb-1.5 ml-1">Observaciones</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Ej. Todo cuadra correctamente"
                    placeholderTextColor={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                    multiline
                    numberOfLines={3}
                    className="bg-slate-50 dark:bg-white/10 text-slate-900 dark:text-white px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-base text-left"
                  />
                </View>

                <Pressable
                  onPress={handleCloseCash}
                  className="bg-red-500 py-4 rounded-xl items-center justify-center shadow-md active:opacity-90"
                >
                  <Text className="text-white text-base font-bold">
                    Cerrar Caja (Corte de Turno)
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Footer */}
          <View className="items-center mt-6 mb-6">
            <Text className="text-slate-400 dark:text-white/40 text-xs">Corte diario DipleBill</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
