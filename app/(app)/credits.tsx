import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { useColorScheme } from 'nativewind';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useRouter } from 'expo-router';
import { clearSellerSession } from '@/modules/auth/authSlice';
import axiosInstance from '@/helpers/axiosInstance';
import {
  Search,
  Landmark,
  DollarSign,
  WalletCards,
  ChevronRight,
  X,
  Check,
  FileSpreadsheet,
  Coins
} from 'lucide-react-native';

interface ActiveCredit {
  id: string;
  credit_number: string;
  client_name: string;
  invoice_number: string;
  total: number;
  debt: number;
  created_at: string;
}

export default function CreditsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const sellerId = useAppSelector((state) => state.auth.sellerId) || '';
  const { isOpen: isCashOpen, activeSession, controlMode, isLoading: isCashLoading } = useAppSelector((state) => state.cash);

  // Estados locales
  const [credits, setCredits] = useState<ActiveCredit[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCredit, setSelectedCredit] = useState<ActiveCredit | null>(null);

  // Formulario de pago
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, CARD, TRANSFER
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [exchangeRate, setExchangeRate] = useState(36.5);
  // Metadatos de pago
  const [cashNio, setCashNio] = useState('');
  const [cashUsd, setCashUsd] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferBank, setTransferBank] = useState('BAC');
  const [transferRef, setTransferRef] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [cardDigits, setCardDigits] = useState('');
  const [cardRef, setCardRef] = useState('');
  const [cardBrand, setCardBrand] = useState('Visa');

  useEffect(() => {
    async function fetchRate() {
      try {
        const response = await axiosInstance.get('/v1/settings?key=usd_exchange_rate');
        const records = response.data?.data || response.data || [];
        if (records.length > 0) {
          const val = parseFloat(records[0].value);
          if (val > 0) {
            setExchangeRate(val);
          }
        }
      } catch (err) {
        if (__DEV__) {
          console.log('No se pudo obtener la tasa de cambio en créditos:', err);
        }
      }
    }
    fetchRate();
  }, []);

  // Cargar créditos
  const loadCredits = async (query = '') => {
    const trimmed = query.trim();
    if (!trimmed) {
      setCredits([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.get('/v1/credits/search-active', {
        params: { search: trimmed }
      });
      setCredits(response.data || []);
    } catch (err) {
      console.error('Error cargando créditos:', err);
      setCredits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredits(search);
  }, [search]);



  const handleOpenPayment = (credit: ActiveCredit) => {
    if (controlMode !== 'NONE' && (!isCashOpen || !activeSession)) {
      Alert.alert(
        'Caja Cerrada',
        'Debes abrir turno en la pestaña de Caja para poder recibir abonos a créditos.'
      );
      return;
    }
    setSelectedCredit(credit);
    const debtStr = String(credit.debt);
    setPaymentMethod('CASH');
    setCashNio(debtStr);
    setCashUsd('');
    setTransferAmount(debtStr);
    setTransferBank('BAC');
    setTransferRef('');
    setCardAmount(debtStr);
    setCardDigits('');
    setCardRef('');
    setCardBrand('Visa');
    setPaymentNotes('');
    setIsPaymentModalVisible(true);
  };

  const handleRegisterPayment = async () => {
    if (!selectedCredit) return;
    if (controlMode !== 'NONE' && !activeSession) return;

    let amount = 0;
    if (paymentMethod === 'CASH') {
      const nio = Number(cashNio) || 0;
      const usd = Number(cashUsd) || 0;
      amount = nio + usd * exchangeRate;
    } else if (paymentMethod === 'TRANSFER') {
      amount = Number(transferAmount) || 0;
    } else if (paymentMethod === 'CARD') {
      amount = Number(cardAmount) || 0;
    }

    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Ingresa un monto de abono válido.');
      return;
    }

    // El abono no puede superar la deuda
    // Agregamos tolerancia por redondeo de flotantes (0.01)
    if (amount > selectedCredit.debt + 0.01) {
      Alert.alert(
        'Error',
        `El abono no puede ser mayor que el saldo pendiente ($${selectedCredit.debt.toFixed(2)}).`
      );
      return;
    }

    let metadata: any = null;
    if (paymentMethod === 'CASH') {
      metadata = {
        paid_nio: Number(cashNio) || 0,
        paid_usd: Number(cashUsd) || 0,
        exchange_rate: exchangeRate,
        change_nio: 0
      };
    } else if (paymentMethod === 'TRANSFER') {
      if (!transferBank.trim()) {
        Alert.alert('Error', 'Por favor ingresa el nombre del banco.');
        return;
      }
      metadata = {
        bank: transferBank.trim(),
        reference: transferRef.trim(),
        amount: amount
      };
    } else if (paymentMethod === 'CARD') {
      if (!cardDigits.trim()) {
        Alert.alert('Error', 'Por favor ingresa los últimos 4 dígitos de la tarjeta.');
        return;
      }
      metadata = {
        card_brand: cardBrand,
        card_last_four: cardDigits.trim(),
        reference: cardRef.trim(),
        amount: amount
      };
    }

    try {
      setSubmittingPayment(true);

      const payload = {
        amount,
        credits_id: [selectedCredit.id],
        seller_id: sellerId,
        payment_method: paymentMethod,
        cash_session_id: activeSession ? activeSession.id : null,
        notes: paymentNotes,
        payment_metadata: metadata
      };

      await axiosInstance.post('/v1/credits/payment', payload);

      Alert.alert('¡Éxito!', 'El abono ha sido registrado correctamente.');
      setIsPaymentModalVisible(false);
      setPaymentNotes('');
      setSelectedCredit(null);
      // Limpiar metadatos
      setCashNio('');
      setCashUsd('');
      setTransferAmount('');
      setTransferBank('BAC');
      setTransferRef('');
      setCardAmount('');
      setCardDigits('');
      setCardRef('');
      setCardBrand('Visa');
      loadCredits(search); // Recargar créditos
    } catch (err: any) {
      Alert.alert(
        'Error al abonar',
        err.response?.data?.message || 'No se pudo registrar el abono.'
      );
    } finally {
      setSubmittingPayment(false);
    }
  };

  const isLocked = controlMode === 'STRICT' && !isCashOpen && !isCashLoading;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#0c3460]">
      {isLocked ? (
        <View style={{ paddingTop: insets.top }} className="flex-1 justify-center items-center p-6">
          <View className="w-full max-w-md bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden items-center">
            {/* Decorative elements */}
            <View className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <View className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            <View className="p-4 bg-blue-950/40 rounded-full border border-blue-800/40 mb-4 mt-2">
              <Coins size={36} color="#3b82f6" />
            </View>
            <Text className="text-white text-lg font-black tracking-tight uppercase text-center">
              Apertura de Caja Requerida
            </Text>
            <Text className="text-slate-400 text-xs font-semibold text-center mt-2 mb-6 px-2">
              Debes iniciar turno de caja para poder consultar cuentas y registrar abonos a créditos.
            </Text>

            <Pressable
              onPress={() => router.push('/(app)/cash')}
              className="w-full bg-blue-600 active:bg-blue-700 rounded-xl py-4 items-center justify-center shadow-lg"
            >
              <Text className="text-white text-sm font-black uppercase tracking-wider">
                Ir a Caja a Abrir Turno
              </Text>
            </Pressable>

            <Pressable
              onPress={() => dispatch(clearSellerSession())}
              className="w-full py-2 items-center justify-center mt-4"
            >
              <Text className="text-slate-500 hover:text-slate-400 text-xs font-bold decoration-solid underline">
                Cerrar Sesión del Vendedor
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {/* Reusable Header */}
          <Header
            title="Cuentas por Cobrar"
            subtitle="Busca créditos por Nº de factura o de crédito"
            searchVal={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar por Nº de factura o de crédito..."
          />

          {/* Credit List */}
          <FlatList
            data={credits}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleOpenPayment(item)}
                className="bg-white dark:bg-white/10 p-4 rounded-2xl border border-slate-200 dark:border-white/5 mb-3 flex-row justify-between items-center active:bg-slate-100 dark:active:bg-white/15 shadow-sm dark:shadow-none"
              >
                <View className="flex-1 mr-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-slate-900 dark:text-white text-sm font-bold">{item.client_name}</Text>
                    <Text className="text-slate-400 dark:text-white/40 text-xs">Factura: {item.invoice_number}</Text>
                  </View>

                  <Text className="text-slate-500 dark:text-white/60 text-xs mt-1.5 font-medium">N° Crédito: {item.credit_number}</Text>

                  <View className="flex-row items-center justify-between mt-3">
                    <View>
                      <Text className="text-slate-400 dark:text-white/40 text-[9px] uppercase tracking-wider font-bold">
                        Deuda Inicial
                      </Text>
                      <Text className="text-slate-600 dark:text-white/80 text-xs font-semibold">
                        ${Number(item.total).toFixed(2)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-brand-600 dark:text-brand-200 text-[9px] font-bold uppercase tracking-wider">
                        Saldo Pendiente
                      </Text>
                      <Text className="text-brand-600 dark:text-brand-300 text-base font-extrabold">
                        ${Number(item.debt).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>

                <ChevronRight size={18} color={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)'} />
              </Pressable>
            )}
            ListEmptyComponent={
              !loading ? (
                <View className="items-center justify-center py-20 px-6">
                  <FileSpreadsheet size={48} color={colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.2)'} className="mb-4" />
                  <Text className="text-slate-400 dark:text-white/40 text-sm text-center leading-relaxed">
                    {search.trim() === ''
                      ? 'Ingresa el número de factura o de crédito para buscar.'
                      : 'No se encontraron créditos activos para la búsqueda.'}
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              loading ? <ActivityIndicator size="small" color="#0c85eb" className="py-4" /> : null
            }
          />

      {/* Payment Modal (Abono) */}
      <Modal
        visible={isPaymentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPaymentModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-black/60 justify-end">
          <View className="bg-[#0c3460] rounded-t-3xl border-t border-white/10 p-6">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-xl font-bold">Registrar Abono</Text>
              <Pressable
                onPress={() => setIsPaymentModalVisible(false)}
                className="p-1 px-3 bg-white/10 rounded-lg"
              >
                <X size={18} color="#ffffff" />
              </Pressable>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <ScrollView keyboardShouldPersistTaps="handled">
                {/* Credit info summary */}
                {selectedCredit && (
                  <View className="bg-white/10 p-4 rounded-xl border border-white/5 mb-4">
                    <Text className="text-white font-bold text-sm">
                      {selectedCredit.client_name}
                    </Text>
                    <View className="flex-row justify-between mt-2">
                      <Text className="text-white/60 text-xs">
                        Factura: {selectedCredit.invoice_number}
                      </Text>
                      <Text className="text-brand-300 text-xs font-bold">
                        Saldo: ${selectedCredit.debt.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Payment Method Selector */}
                <Text className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
                  Forma de Pago
                </Text>
                <View className="flex-row gap-2 mb-4">
                  {[
                    { key: 'CASH', label: 'Efectivo', icon: DollarSign },
                    { key: 'CARD', label: 'Tarjeta', icon: WalletCards },
                    { key: 'TRANSFER', label: 'Transfer.', icon: Landmark }
                  ].map((method) => {
                    const isSelected = paymentMethod === method.key;
                    const Icon = method.icon;
                    return (
                      <Pressable
                        key={method.key}
                        onPress={() => {
                          setPaymentMethod(method.key);
                          if (selectedCredit) {
                            const debtStr = String(selectedCredit.debt);
                            if (method.key === 'CASH') {
                              setCashNio(debtStr);
                              setCashUsd('');
                            } else if (method.key === 'TRANSFER') {
                              setTransferAmount(debtStr);
                            } else if (method.key === 'CARD') {
                              setCardAmount(debtStr);
                            }
                          }
                        }}
                        className={`flex-1 p-3 rounded-xl border items-center justify-center ${
                          isSelected
                            ? 'bg-brand-500 border-transparent'
                            : 'bg-white/10 border-white/5'
                        }`}
                      >
                        <Icon size={16} color="#ffffff" className="mb-1" />
                        <Text className="text-white text-xs font-bold">{method.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Campos Dinámicos según Método de Pago */}
                {paymentMethod === 'CASH' && (
                  <View className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4 gap-3">
                    <Text className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      Desglose de Efectivo
                    </Text>
                    <View className="flex-row gap-3">
                      <View className="flex-1 gap-1">
                        <Text className="text-white/60 text-[10px] font-bold uppercase tracking-wider">
                          Córdobas (C$)
                        </Text>
                        <TextInput
                          value={cashNio}
                          onChangeText={setCashNio}
                          placeholder="0.00"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          keyboardType="numeric"
                          className="bg-white/10 text-white px-3 py-2 rounded-lg border border-white/10 text-sm font-bold"
                        />
                      </View>
                      <View className="flex-1 gap-1">
                        <Text className="text-white/60 text-[10px] font-bold uppercase tracking-wider">
                          Dólares ($)
                        </Text>
                        <TextInput
                          value={cashUsd}
                          onChangeText={setCashUsd}
                          placeholder="0.00"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          keyboardType="numeric"
                          className="bg-white/10 text-white px-3 py-2 rounded-lg border border-white/10 text-sm font-bold"
                        />
                      </View>
                    </View>
                    <Text className="text-white/45 text-[10px]">
                      Tasa cambio oficial: C$ {exchangeRate.toFixed(2)}
                    </Text>
                    {/* Totales y Saldo Restante */}
                    <View className="border-t border-white/10 pt-2 flex-row justify-between">
                      <View>
                        <Text className="text-white/50 text-[10px] font-bold">Monto del Abono</Text>
                        <Text className="text-emerald-400 text-base font-black">
                          C$ {(Number(cashNio) + (Number(cashUsd) * exchangeRate)).toFixed(2)}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-white/50 text-[10px] font-bold">Nuevo Saldo</Text>
                        <Text className="text-brand-300 text-base font-black">
                          C$ {selectedCredit ? Math.max(selectedCredit.debt - (Number(cashNio) + (Number(cashUsd) * exchangeRate)), 0).toFixed(2) : '0.00'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {paymentMethod === 'TRANSFER' && (
                  <View className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4 gap-3">
                    <Text className="text-amber-400 text-xs font-bold uppercase tracking-wider">
                      Detalles de Transferencia
                    </Text>
                    <View className="gap-1">
                      <Text className="text-white/60 text-[10px] font-bold uppercase tracking-wider">
                        Banco de Origen
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="flex-row gap-1 py-1"
                      >
                        {['BAC', 'BANPRO', 'LAFISE', 'FICOHSA'].map((b) => (
                          <Pressable
                            key={b}
                            onPress={() => setTransferBank(b)}
                            className={`px-3 py-1.5 rounded-lg border mr-2 ${
                              transferBank === b
                                ? 'bg-amber-600 border-transparent'
                                : 'bg-white/5 border-white/5'
                            }`}
                          >
                            <Text className="text-white text-[10px] font-bold">{b}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                    <View className="flex-row gap-3">
                      <View className="flex-1 gap-1">
                        <Text className="text-white/60 text-[10px] font-bold uppercase tracking-wider">
                          Nº de Referencia
                        </Text>
                        <TextInput
                          value={transferRef}
                          onChangeText={setTransferRef}
                          placeholder="Nº Referencia"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          className="bg-white/10 text-white px-3 py-2 rounded-lg border border-white/10 text-sm font-bold"
                        />
                      </View>
                      <View className="flex-1 gap-1">
                        <Text className="text-white/60 text-[10px] font-bold uppercase tracking-wider">
                          Monto a Abonar (C$)
                        </Text>
                        <TextInput
                          value={transferAmount}
                          onChangeText={setTransferAmount}
                          placeholder="0.00"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          keyboardType="numeric"
                          className="bg-white/10 text-white px-3 py-2 rounded-lg border border-white/10 text-sm font-bold"
                        />
                      </View>
                    </View>
                  </View>
                )}

                {paymentMethod === 'CARD' && (
                  <View className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4 gap-3">
                    <Text className="text-blue-400 text-xs font-bold uppercase tracking-wider">
                      Detalles de Tarjeta
                    </Text>
                    <View className="gap-1">
                      <Text className="text-white/60 text-[10px] font-bold uppercase tracking-wider">
                        Franquicia
                      </Text>
                      <View className="flex-row gap-2">
                        {['Visa', 'Mastercard', 'AMEX'].map((brand) => (
                          <Pressable
                            key={brand}
                            onPress={() => setCardBrand(brand)}
                            className={`flex-1 py-1.5 rounded-lg border items-center ${
                              cardBrand === brand
                                ? 'bg-blue-600 border-transparent'
                                : 'bg-white/5 border-white/5'
                            }`}
                          >
                            <Text className="text-white text-[10px] font-bold">{brand}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                    <View className="flex-row gap-3">
                      <View className="flex-1 gap-1">
                        <Text className="text-white/60 text-[10px] font-bold uppercase tracking-wider">
                          Últimos 4 Dígitos
                        </Text>
                        <TextInput
                          value={cardDigits}
                          onChangeText={setCardDigits}
                          placeholder="1234"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          keyboardType="numeric"
                          maxLength={4}
                          className="bg-white/10 text-white px-3 py-2 rounded-lg border border-white/10 text-sm font-bold"
                        />
                      </View>
                      <View className="flex-1 gap-1">
                        <Text className="text-white/60 text-[10px] font-bold uppercase tracking-wider">
                          Nº de Referencia
                        </Text>
                        <TextInput
                          value={cardRef}
                          onChangeText={setCardRef}
                          placeholder="Nº Referencia"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          className="bg-white/10 text-white px-3 py-2 rounded-lg border border-white/10 text-sm font-bold"
                        />
                      </View>
                    </View>
                    <View className="gap-1 mt-1">
                      <Text className="text-white/60 text-[10px] font-bold uppercase tracking-wider">
                        Monto a Abonar (C$)
                      </Text>
                      <TextInput
                        value={cardAmount}
                        onChangeText={setCardAmount}
                        placeholder="0.00"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        keyboardType="numeric"
                        className="bg-white/10 text-white px-3 py-2 rounded-lg border border-white/10 text-sm font-bold"
                      />
                    </View>
                  </View>
                )}

                {/* Notes */}
                <View className="mb-6">
                  <Text className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
                    Observaciones
                  </Text>
                  <TextInput
                    value={paymentNotes}
                    onChangeText={setPaymentNotes}
                    placeholder="Ej. Abono quincenal"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    className="bg-white/10 text-white px-4 py-3 rounded-xl border border-white/10 text-sm"
                  />
                </View>

                {/* Submit button */}
                <Pressable
                  onPress={handleRegisterPayment}
                  disabled={submittingPayment}
                  className="bg-brand-500 py-4 rounded-xl items-center justify-center shadow-lg active:opacity-90 flex-row"
                >
                  {submittingPayment ? (
                    <ActivityIndicator size="small" color="#ffffff" className="mr-2" />
                  ) : (
                    <Check size={18} color="#ffffff" className="mr-2" />
                  )}
                  <Text className="text-white text-base font-bold">
                    {submittingPayment ? 'Registrando Abono...' : 'Registrar Abono'}
                  </Text>
                </Pressable>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </SafeAreaView>
      </Modal>
        </>
      )}
    </View>
  );
}
