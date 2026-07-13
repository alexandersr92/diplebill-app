import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { useColorScheme } from 'nativewind';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchCashSettingsAndSession,
  openCashSession,
  closeCashSession,
  addCashTransaction
} from '@/modules/billing/cashSlice';
import { clearSellerSession } from '@/modules/auth/authSlice';
import { ShieldCheck, Calendar, User, LayoutGrid, Coins, AlertCircle, PlusCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react-native';
import { getExpenseCategoriesApi } from '@/modules/billing/services/expenseCategoryService';

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
  const [actualUsd, setActualUsd] = useState('');
  const [notes, setNotes] = useState('');

  // Transaction Modal
  const [isTxModalVisible, setIsTxModalVisible] = useState(false);
  const [txType, setTxType] = useState<'in' | 'out'>('out');
  const [txAmount, setTxAmount] = useState('');
  const [txCurrency, setTxCurrency] = useState<'NIO' | 'USD'>('NIO');
  const [txDescription, setTxDescription] = useState('');
  const [txCategoryId, setTxCategoryId] = useState<string | null>(null);
  const [expenseCategories, setExpenseCategories] = useState<{id: string; name: string}[]>([]);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // Cargar sesión al montar o cuando cambie sucursal
  useEffect(() => {
    if (storeId) {
      dispatch(fetchCashSettingsAndSession(storeId));
    }
    getExpenseCategoriesApi().then(res => setExpenseCategories(res.data || [])).catch(console.warn);
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
                  actualUsd: Number(actualUsd) || 0,
                  notes,
                  storeId
                })
              ).unwrap();
              Alert.alert('Caja Cerrada', '¡La sesión de caja se cerró exitosamente!');
              setActualCash('');
              setActualUsd('');
              setNotes('');
            }
          } catch (err: any) {
            Alert.alert('Error al cerrar caja', err || 'Hubo un error de conexión.');
          }
        }
      }
    ]);
  };

  const handleRegisterTx = async () => {
    const amt = Number(txAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido.');
      return;
    }
    if (!txDescription.trim()) {
      Alert.alert('Error', 'Ingresa una descripción o motivo.');
      return;
    }
    if (txType === 'out' && !txCategoryId) {
      Alert.alert('Error', 'Selecciona una categoría de gasto.');
      return;
    }
    setIsSubmittingTx(true);
    try {
      await dispatch(addCashTransaction({
        cashSessionId: activeSession!.id,
        type: txType,
        amount: amt,
        currency: txCurrency,
        expense_category_id: txType === 'out' ? txCategoryId : null,
        description: txDescription.trim(),
        storeId
      })).unwrap();
      Alert.alert('Éxito', 'Movimiento registrado correctamente.');
      setIsTxModalVisible(false);
      setTxAmount('');
      setTxDescription('');
      setTxCategoryId(null);
    } catch (err: any) {
      Alert.alert('Error', err || 'No se pudo registrar.');
    } finally {
      setIsSubmittingTx(false);
    }
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

              {/* Acciones Rápidas */}
              <Pressable
                onPress={() => setIsTxModalVisible(true)}
                className="bg-blue-600/10 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-900/50 p-4 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-70"
              >
                <PlusCircle size={20} color={colorScheme === 'dark' ? '#60a5fa' : '#2563eb'} />
                <Text className="text-blue-700 dark:text-blue-400 font-bold text-sm">Registrar Gasto o Ingreso Extra</Text>
              </Pressable>

              {/* Formulario de Cierre */}
              <View className="bg-white dark:bg-white/10 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none">
                <Text className="text-slate-500 dark:text-white/80 text-xs font-semibold uppercase tracking-wider mb-3">
                  Cierre de Turno
                </Text>

                <View className="mb-4">
                  <Text className="text-slate-500 dark:text-white/60 text-xs mb-1.5 ml-1">Efectivo Real en Caja (C$)</Text>
                  <TextInput
                    value={actualCash}
                    onChangeText={setActualCash}
                    placeholder="Monto total contado en C$"
                    placeholderTextColor={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                    keyboardType="numeric"
                    className="bg-slate-50 dark:bg-white/10 text-slate-900 dark:text-white px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-base"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-slate-500 dark:text-white/60 text-xs mb-1.5 ml-1">Dólares Físicos en Caja (USD)</Text>
                  <TextInput
                    value={actualUsd}
                    onChangeText={setActualUsd}
                    placeholder="Monto total contado en $"
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

      {/* Modal de Transacción (Ajuste/Gasto) */}
      <Modal visible={isTxModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-slate-900 p-6 rounded-t-3xl min-h-[60%]">
            <Text className="text-lg font-black text-slate-900 dark:text-white mb-4">Registrar Movimiento</Text>
            
            <View className="flex-row gap-2 mb-4">
              <Pressable
                onPress={() => setTxType('out')}
                className={`flex-1 py-3 items-center rounded-xl border-2 ${txType === 'out' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-800'}`}
              >
                <ArrowDownCircle size={20} color={txType === 'out' ? '#ef4444' : '#94a3b8'} />
                <Text className={`font-bold mt-1 ${txType === 'out' ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>Gasto / Salida</Text>
              </Pressable>
              <Pressable
                onPress={() => setTxType('in')}
                className={`flex-1 py-3 items-center rounded-xl border-2 ${txType === 'in' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-slate-200 dark:border-slate-800'}`}
              >
                <ArrowUpCircle size={20} color={txType === 'in' ? '#22c55e' : '#94a3b8'} />
                <Text className={`font-bold mt-1 ${txType === 'in' ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>Ingreso Extra</Text>
              </Pressable>
            </View>

            <ScrollView className="flex-1">
              <View className="mb-4 flex-row gap-2">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Monto</Text>
                  <TextInput
                    value={txAmount}
                    onChangeText={setTxAmount}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </View>
                <View className="w-24">
                  <Text className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Moneda</Text>
                  <Pressable
                    onPress={() => setTxCurrency(txCurrency === 'NIO' ? 'USD' : 'NIO')}
                    className="bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 items-center justify-center"
                  >
                    <Text className="font-bold text-slate-900 dark:text-white">{txCurrency === 'NIO' ? 'C$' : 'USD'}</Text>
                  </Pressable>
                </View>
              </View>

              {txType === 'out' && (
                <View className="mb-4">
                  <Text className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Categoría</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                    {expenseCategories.map(c => (
                      <Pressable
                        key={c.id}
                        onPress={() => setTxCategoryId(c.id)}
                        className={`px-4 py-2 mr-2 rounded-lg border-2 ${txCategoryId === c.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}
                      >
                        <Text className={txCategoryId === c.id ? 'text-blue-700 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-300 font-semibold'}>{c.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View className="mb-6">
                <Text className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Descripción / Motivo</Text>
                <TextInput
                  value={txDescription}
                  onChangeText={setTxDescription}
                  placeholder="Ej. Pago de internet..."
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </View>

              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setIsTxModalVisible(false)}
                  className="flex-1 py-4 items-center rounded-xl bg-slate-200 dark:bg-slate-800"
                >
                  <Text className="font-bold text-slate-700 dark:text-slate-300">Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleRegisterTx}
                  disabled={isSubmittingTx}
                  className="flex-1 py-4 items-center rounded-xl bg-blue-600"
                >
                  {isSubmittingTx ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white">Guardar</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
