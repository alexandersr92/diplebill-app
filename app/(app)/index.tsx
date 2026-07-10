import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import SlideToConfirm from '@/components/SlideToConfirm';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchProducts,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  updateCartItemPrice,
  updateCartItemDiscount,
  clearCart,
  createInvoice
} from '@/modules/billing/billingSlice';
import axiosInstance from '@/helpers/axiosInstance';
import { checkSimilarity, isGenericClientName } from '@/helpers/stringSimilarity';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  Check,
  Landmark,
  DollarSign,
  WalletCards,
  Coins,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { openCashSession } from '@/modules/billing/cashSlice';
import { clearSellerSession } from '@/modules/auth/authSlice';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { printInvoice, shareInvoice } from '@/helpers/invoicePrintHelper';

export default function NuevaVentaScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  // Selectores de Redux
  const storeId = useAppSelector((state) => state.auth.currentStoreId) || '';
  const storeName = useAppSelector((state) => state.auth.currentStoreName) || 'Sucursal';
  const sellerName = useAppSelector((state) => state.auth.sellerName) || 'Vendedor';
  const sellerId = useAppSelector((state) => state.auth.sellerId) || '';
  const { products, cart, isLoading, error } = useAppSelector((state) => state.billing);
  const {
    isOpen: isCashOpen,
    activeSession,
    controlMode,
    isLoading: isCashLoading
  } = useAppSelector((state) => state.cash);

  // Estados locales
  const [search, setSearch] = useState('');
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any | null>(null);
  const [clientName, setClientName] = useState('CONSUMIDOR FINAL');
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, BACS (transfer), CARD, CREDITO
  const [downPayment, setDownPayment] = useState('0'); // Abono inicial
  const [notes, setNotes] = useState('');

  // Estados de Clientes
  const [clients, setClients] = useState<any[]>([]); // Para el dropdown autocompletable
  const [allClients, setAllClients] = useState<any[]>([]); // Para validación de similitud
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [isGenericName, setIsGenericName] = useState(false);
  const [similarClients, setSimilarClients] = useState<any[]>([]);
  const [checkClientModalOpen, setCheckClientModalOpen] = useState(false);
  const [pendingClientName, setPendingClientName] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [isClientNameValidated, setIsClientNameValidated] = useState(false);

  // Metadatos de Pago
  const [exchangeRate, setExchangeRate] = useState(36.5);
  const [cashNio, setCashNio] = useState('');
  const [cashUsd, setCashUsd] = useState('');
  const [transferBank, setTransferBank] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [cardBrand, setCardBrand] = useState('Visa');
  const [cardDigits, setCardDigits] = useState('');
  const [cardRef, setCardRef] = useState('');
  const [cardAmount, setCardAmount] = useState('');

  const getPaymentMethodTheme = () => {
    switch (paymentMethod) {
      case 'CASH':
        return {
          color: '#10b981',
          bgClass: 'bg-emerald-600',
          borderClass: 'border-emerald-500/20',
          textClass: 'text-emerald-400',
          pillBgClass: 'bg-emerald-500/20',
          pillTextClass: 'text-emerald-300'
        };
      case 'CARD':
        return {
          color: '#0c85eb',
          bgClass: 'bg-blue-600',
          borderClass: 'border-blue-500/20',
          textClass: 'text-blue-400',
          pillBgClass: 'bg-blue-500/20',
          pillTextClass: 'text-blue-300'
        };
      case 'TRANSFER':
        return {
          color: '#d97706',
          bgClass: 'bg-amber-600',
          borderClass: 'border-amber-500/20',
          textClass: 'text-amber-400',
          pillBgClass: 'bg-amber-500/20',
          pillTextClass: 'text-amber-300'
        };
      case 'CREDITO':
        return {
          color: '#8b5cf6',
          bgClass: 'bg-purple-600',
          borderClass: 'border-purple-500/20',
          textClass: 'text-purple-400',
          pillBgClass: 'bg-purple-500/20',
          pillTextClass: 'text-purple-300'
        };
      default:
        return {
          color: '#0c85eb',
          bgClass: 'bg-brand-500',
          borderClass: 'border-white/5',
          textClass: 'text-white',
          pillBgClass: 'bg-white/10',
          pillTextClass: 'text-white'
        };
    }
  };

  const paymentTheme = getPaymentMethodTheme();



  // Cargar productos al montar o buscar
  useEffect(() => {
    if (storeId) {
      dispatch(fetchProducts({ storeId, search }));
    }
  }, [dispatch, storeId, search]);

  const fetchClients = async (searchQuery = '') => {
    try {
      const response = await axiosInstance.get('/v1/clients', {
        params: { search: searchQuery, per_page: 50 }
      });
      const clientData = response.data?.data || response.data || [];
      setClients(clientData);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const fetchAllClientsForValidation = async () => {
    try {
      const response = await axiosInstance.get('/v1/clients', {
        params: { per_page: 250 }
      });
      const clientData = response.data?.data || response.data || [];
      setAllClients(clientData);
    } catch (err) {
      console.error('Error fetching all clients:', err);
    }
  };

  const fetchExchangeRate = async () => {
    try {
      const response = await axiosInstance.get('/v1/settings?key=usd_exchange_rate');
      const records = response.data?.data || response.data || [];
      if (records.length > 0) {
        const val = parseFloat(records[0].value);
        if (val > 0) {
          setExchangeRate(val);
          if (__DEV__) {
            console.log('Tasa de cambio cargada de la API:', val);
          }
        }
      }
    } catch (err) {
      if (__DEV__) {
        console.log('No se pudo obtener la tasa de cambio (cajero sin permisos de ajustes):', err);
      }
    }
  };

  useEffect(() => {
    fetchClients();
    fetchAllClientsForValidation();
    fetchExchangeRate();
  }, []);



  // Totales
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmountBeforeDiscount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalDiscount = cart.reduce((sum, item) => sum + (item.discount || 0), 0);
  const totalAmount = Math.max(totalAmountBeforeDiscount - totalDiscount, 0);

  // Totales de cobro/vuelto de pago
  const rawCashNio = parseFloat(cashNio) || 0;
  const rawCashUsd = parseFloat(cashUsd) || 0;
  const rawTransferAmt = parseFloat(transferAmount) || 0;
  const rawCardAmt = parseFloat(cardAmount) || 0;

  const totalPaid = rawCashNio + rawCashUsd * exchangeRate + rawTransferAmt + rawCardAmt;

  const changeDue = Math.max(totalPaid - totalAmount, 0);
  const missingAmount = Math.max(totalAmount - totalPaid, 0);

  const proceedWithCheckout = async (clientId: string | null, customClientName: string) => {
    if (__DEV__) {
      console.log('--- proceedWithCheckout INICIO ---');
      console.log('clientId:', clientId);
      console.log('customClientName:', customClientName);
    }
    const isCredit = paymentMethod === 'CREDITO';
    const initialPayment = Number(downPayment);

    if (isCredit && isNaN(initialPayment)) {
      Alert.alert('Error', 'Ingresa un monto de abono inicial válido.');
      return;
    }

    const invoiceProducts = cart.map((item) => {
      const price = item.product.price;
      const quantity = item.quantity;
      const discount = item.discount || 0;
      const total = price * quantity;
      const grand_total = Math.max(total - discount, 0);
      return {
        product_id: item.product.product_id,
        inventory_id: item.product.inventory_id,
        quantity,
        price,
        total,
        discount,
        tax: 0,
        grand_total
      };
    });

    let metadata: any = {};
    if (!isCredit) {
      if (paymentMethod === 'TRANSFER') {
        metadata = {
          bank: transferBank,
          reference: transferRef.trim()
        };
      } else if (paymentMethod === 'CARD') {
        metadata = {
          card_last_four: cardDigits.trim(),
          reference: cardRef.trim(),
          card_brand: cardBrand
        };
      } else {
        // CASH
        metadata = {
          paid_nio: rawCashNio,
          paid_usd: rawCashUsd,
          exchange_rate: exchangeRate,
          change_nio: changeDue
        };
      }
    }

    const invoiceData = {
      client_id: clientId,
      seller_id: sellerId,
      store_id: storeId,
      invoice_date: new Date().toISOString().split('T')[0],
      invoice_note: notes,
      client_name: customClientName,
      total: totalAmountBeforeDiscount,
      discount: totalDiscount,
      tax: 0,
      grand_total: totalAmount,
      payment_method: isCredit ? 'CASH' : paymentMethod,
      payment_date: new Date().toISOString().split('T')[0],
      isCredit,
      init_payment: isCredit ? initialPayment : 0,
      cash_session_id: activeSession ? activeSession.id : null,
      payment_metadata: metadata,
      products: invoiceProducts
    };

    try {
      const result = await dispatch(createInvoice(invoiceData)).unwrap();
      setLastInvoice(result);
      setIsCartVisible(false);
      setShowSuccessModal(true);
      setCheckoutStep(1);
      setClientName('CONSUMIDOR FINAL');
      setSelectedClientId(null);
      setPaymentMethod('CASH');
      setDownPayment('0');
      setNotes('');
      // Limpiar metadatos
      setCashNio('');
      setCashUsd('');
      setTransferBank('');
      setTransferRef('');
      setTransferAmount('');
      setCardDigits('');
      setCardRef('');
      setCardAmount('');
    } catch (err: any) {
      Alert.alert('Error al facturar', err || 'Ocurrió un error inesperado.');
    }
  };

  const handleClientBlur = async () => {
    // Si ya fue validado o se seleccionó de la lista, no hacemos nada
    if (isClientNameValidated || selectedClientId) return;

    const name = clientName.trim();
    if (!name || name.toLowerCase() === 'consumidor final') {
      setIsClientNameValidated(true);
      return;
    }

    // 1. Validar nombre genérico
    const generic = isGenericClientName(name);

    // 2. Buscar clientes similares en el catálogo completo
    const matches: any[] = [];
    if (!generic) {
      // Match exacto case-insensitive
      const exactMatch = allClients.find((c) => c.name.trim().toLowerCase() === name.toLowerCase());
      if (exactMatch) {
        setSelectedClientId(exactMatch.id);
        setClientName(exactMatch.name);
        setIsClientNameValidated(true);
        return;
      }

      allClients.forEach((c) => {
        const sim = checkSimilarity(name, c.name);
        if (sim >= 0.8) {
          matches.push({ id: c.id, name: c.name });
        }
      });
    }

    if (generic || matches.length > 0) {
      setPendingClientName(name);
      setIsGenericName(generic);
      setSimilarClients(matches);
      setCheckClientModalOpen(true);
    } else {
      setIsClientNameValidated(true);
    }
  };

  const handleCheckout = async () => {
    if (__DEV__) {
      console.log('--- handleCheckout INICIADO ---');
      console.log('cart.length:', cart?.length);
      console.log('totalAmount:', totalAmount);
      console.log('totalPaid:', totalPaid);
      console.log('clientName:', clientName);
      console.log('selectedClientId:', selectedClientId);
      console.log('isClientNameValidated:', isClientNameValidated);
    }
    if (controlMode !== 'NONE' && (!isCashOpen || !activeSession)) {
      Alert.alert(
        'Caja Cerrada',
        'Debes abrir turno en la pestaña de Caja antes de poder facturar.'
      );
      return;
    }
    if (cart.length === 0) {
      Alert.alert('Carrito Vacío', 'Agrega al menos un producto al carrito.');
      return;
    }

    // Validaciones de montos y campos según forma de pago
    const isCredit = paymentMethod === 'CREDITO';
    if (!isCredit) {
      if (totalPaid < totalAmount - 0.01) {
        Alert.alert(
          'Monto Insuficiente',
          `El total pagado (C$ ${totalPaid.toFixed(2)}) no cubre el total de la venta (C$ ${totalAmount.toFixed(2)}).`
        );
        return;
      }

      if (rawTransferAmt > 0) {
        if (!transferBank) {
          Alert.alert('Faltan Datos', 'Selecciona el banco de origen de la transferencia.');
          return;
        }
        if (!transferRef.trim()) {
          Alert.alert('Faltan Datos', 'Ingresa la referencia de la transferencia.');
          return;
        }
      }

      if (rawCardAmt > 0) {
        if (cardDigits.trim().length !== 4) {
          Alert.alert('Datos Inválidos', 'Ingresa los últimos 4 dígitos de la tarjeta.');
          return;
        }
        if (!cardRef.trim()) {
          Alert.alert('Faltan Datos', 'Ingresa el número de referencia / voucher.');
          return;
        }
      }
    }

    // Si ya seleccionó un cliente de la lista
    if (selectedClientId) {
      await proceedWithCheckout(selectedClientId, clientName);
      return;
    }

    // Si escribió un nombre
    const name = clientName.trim();
    if (!name) {
      Alert.alert('Error', 'Por favor ingresa o selecciona un cliente.');
      return;
    }

    if (!isClientNameValidated) {
      // 1. Validar nombre genérico
      const generic = isGenericClientName(name);

      // 2. Buscar si ya existe un cliente con ese nombre exacto (genérico o no)
      const exactMatch = allClients.find((c) => c.name.trim().toLowerCase() === name.toLowerCase());
      if (exactMatch) {
        setSelectedClientId(exactMatch.id);
        await proceedWithCheckout(exactMatch.id, exactMatch.name);
        return;
      }

      // 3. Buscar clientes similares
      const matches: any[] = [];
      if (!generic) {
        allClients.forEach((c) => {
          const sim = checkSimilarity(name, c.name);
          if (sim >= 0.8) {
            matches.push({ id: c.id, name: c.name });
          }
        });
      }

      if (generic || matches.length > 0) {
        setPendingClientName(name);
        setIsGenericName(generic);
        setSimilarClients(matches);
        setCheckClientModalOpen(true);
        return;
      }
    }

    // Si es un nombre nuevo y único (o ya validado como tal), crearlo e ir a venta
    await handleCreateAndCheckout(name);
  };

  const handleCreateAndCheckout = async (name: string) => {
    setIsCreatingClient(true);
    try {
      const clientPayload = {
        name,
        stores: [storeId],
        wholesaler: false
      };
      const res = await axiosInstance.post('/v1/clients', clientPayload);
      const newClientId = res.data?.id || res.data?.data?.id || null;
      // Recargar clientes locales
      fetchClients();
      fetchAllClientsForValidation();
      // Proceder con la venta
      await proceedWithCheckout(newClientId, name);
    } catch (err: any) {
      console.error('Error creating client:', err);
      // Si falla crear el cliente por alguna razón, proceder de todos modos con id null para no bloquear la venta
      await proceedWithCheckout(null, name);
    } finally {
      setIsCreatingClient(false);
    }
  };



  const renderRightActions = (id: string) => {
    return (
      <Pressable
        onPress={() => dispatch(removeFromCart(id))}
        className="bg-red-500 justify-center items-center px-5 rounded-xl mb-2 ml-2"
      >
        <Trash2 size={16} color="#ffffff" />
      </Pressable>
    );
  };

  // Filtrar productos: si no hay búsqueda activa, ocultar los que no tienen inventario
  const filteredProducts = products.filter((item) => {
    if (!search.trim()) {
      return item.stock > 0;
    }
    return true;
  });

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
              Debes iniciar turno de caja para poder comenzar a facturar.
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
          {/* Caja cerrada warning banner */}
      {controlMode === 'SIMPLIFIED' && !isCashOpen && (
        <Pressable
          onPress={() => router.push('/(app)/cash')}
          className="bg-red-500 p-3 flex-row justify-between items-center px-6"
        >
          <Text className="text-white text-xs font-bold flex-1 mr-2">
            ⚠️ La caja está cerrada. Presiona aquí para abrir turno y poder facturar.
          </Text>
          <Plus size={16} color="#ffffff" />
        </Pressable>
      )}

      {/* Reusable Header */}
      <Header
        title="Nueva Venta"
        rightAction={
          cart.length > 0 ? (
            <Pressable
              onPress={() => {
                setCheckoutStep(1);
                setIsCartVisible(true);
              }}
              className="bg-indigo-600 active:bg-indigo-700 rounded-full px-4 py-2 flex-row items-center shadow-md border border-white/10"
            >
              <View className="relative mr-2">
                <ShoppingCart size={15} color="#ffffff" />
                <View className="absolute -top-2 -right-2 bg-red-500 w-4 h-4 rounded-full items-center justify-center">
                  <Text className="text-white text-[8px] font-bold">{totalItems}</Text>
                </View>
              </View>
              <Text className="text-white text-xs font-bold">${totalAmount.toFixed(2)}</Text>
            </Pressable>
          ) : undefined
        }
        searchVal={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar producto por nombre o SKU..."
      />

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View className="bg-white dark:bg-white/10 p-4 rounded-2xl border border-slate-200 dark:border-white/5 mb-3 flex-row justify-between items-center shadow-sm dark:shadow-none">
            <View className="flex-1 mr-4">
              <Text className="text-slate-900 dark:text-white text-base font-semibold leading-tight">{item.name}</Text>
              <Text className="text-slate-500 dark:text-brand-200 text-xs mt-1">SKU: {item.sku}</Text>
              <View className="flex-row items-center mt-1">
                <Text className="text-slate-400 dark:text-white/60 text-xs">
                  Stock: {item.stock} {item.unit_of_measure} •{' '}
                </Text>
                <Text className="text-brand-600 dark:text-brand-300 text-sm font-bold">${item.price.toFixed(2)}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => dispatch(addToCart(item))}
              disabled={item.stock <= 0}
              className={`p-3 rounded-xl items-center justify-center ${
                item.stock > 0 ? 'bg-brand-500 active:bg-brand-600' : 'bg-slate-100 dark:bg-white/5'
              }`}
            >
              <Plus size={18} color={item.stock > 0 ? '#ffffff' : (colorScheme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.25)')} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-20">
              <Text className="text-white/40 text-sm">No se encontraron productos.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoading ? <ActivityIndicator size="small" color="#0c85eb" className="py-4" /> : null
        }
      />



      {/* Cart Modal / Checkout Screen */}
      <Modal
        visible={isCartVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCartVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-black/50 justify-end">
          <View className="bg-slate-50 dark:bg-[#0c3460] rounded-t-3xl border-t border-slate-200 dark:border-white/10 flex-1 mt-12 p-6 justify-between">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center">
                {checkoutStep === 2 ? (
                  <Pressable
                    onPress={() => setCheckoutStep(1)}
                    className="mr-3 p-1 bg-slate-200 dark:bg-white/10 rounded-lg"
                  >
                    <ArrowLeft size={18} color={isDark ? "#ffffff" : "#0f172a"} />
                  </Pressable>
                ) : (
                  <ShoppingCart size={20} color={isDark ? "#ffffff" : "#0f172a"} className="mr-2" />
                )}
                <Text className="text-slate-900 dark:text-white text-xl font-bold">
                  {checkoutStep === 1 ? 'Carrito de Compras' : 'Datos de Facturación'}
                </Text>
              </View>
              <Pressable
                onPress={() => setIsCartVisible(false)}
                className="p-1 px-3 bg-slate-200 dark:bg-white/10 rounded-lg"
              >
                <X size={18} color={isDark ? "#ffffff" : "#0f172a"} />
              </Pressable>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              className="flex-1"
            >
              {checkoutStep === 1 ? (
                <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 mb-4">
                  {/* List items */}
                  {cart.map((item) => (
                    <Swipeable
                      key={item.product.id}
                      renderRightActions={() => renderRightActions(item.product.id)}
                      containerStyle={{ overflow: 'hidden' }}
                    >
                      <View className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-white/5 mb-2">
                        {/* Name and Basic row */}
                        <View className="flex-row justify-between items-center">
                          <View className="flex-1 mr-3">
                            <Text className="text-slate-900 dark:text-white text-sm font-semibold">
                              {item.product.name}
                            </Text>
                            <Text className="text-brand-600 dark:text-brand-300 text-xs font-bold mt-1">
                              ${item.product.price.toFixed(2)} x {item.quantity} = $
                              {(item.product.price * item.quantity).toFixed(2)}
                            </Text>
                          </View>

                          {/* Quantity Controls */}
                          <View className="flex-row items-center">
                            <Pressable
                              onPress={() =>
                                dispatch(
                                  updateCartQuantity({
                                    productId: item.product.id,
                                    quantity: item.quantity - 1
                                  })
                                )
                              }
                              className="bg-slate-100 dark:bg-white/10 p-1.5 rounded-lg mr-2"
                            >
                              <Minus size={14} color={isDark ? "#ffffff" : "#0f172a"} />
                            </Pressable>
                            <Text className="text-slate-900 dark:text-white text-sm font-bold mx-1">{item.quantity}</Text>
                            <Pressable
                              onPress={() =>
                                dispatch(
                                  updateCartQuantity({
                                    productId: item.product.id,
                                    quantity: item.quantity + 1
                                  })
                                )
                              }
                              className="bg-slate-100 dark:bg-white/10 p-1.5 rounded-lg ml-2"
                            >
                              <Plus size={14} color={isDark ? "#ffffff" : "#0f172a"} />
                            </Pressable>
                          </View>
                        </View>

                        {/* Modificadores de Precio y Descuento / Promo */}
                        <View className="flex-row items-center gap-2 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/5">
                          <View className="flex-1 flex-row items-center gap-1.5 bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-white/5">
                            <Text className="text-[9px] text-slate-500 dark:text-white/40 font-bold uppercase tracking-wider shrink-0">Precio C$</Text>
                            <TextInput
                              keyboardType="numeric"
                              value={item.product.price.toString()}
                              onChangeText={(val) => {
                                const num = parseFloat(val) || 0;
                                dispatch(updateCartItemPrice({ productId: item.product.id, price: num }));
                              }}
                              className="flex-1 text-slate-900 dark:text-white text-xs font-black p-0 m-0"
                            />
                          </View>
                          <View className="flex-1 flex-row items-center gap-1.5 bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-white/5">
                            <Text className="text-[9px] text-slate-500 dark:text-white/40 font-bold uppercase tracking-wider shrink-0">Desc C$</Text>
                            <TextInput
                              keyboardType="numeric"
                              value={item.discount > 0 ? item.discount.toString() : ''}
                              onChangeText={(val) => {
                                const maxDiscount = item.product.price * item.quantity;
                                const num = Math.min(parseFloat(val) || 0, maxDiscount);
                                dispatch(updateCartItemDiscount({ productId: item.product.id, discount: num }));
                              }}
                              placeholder="0.00"
                              placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                              className="flex-1 text-slate-900 dark:text-white text-xs font-black p-0 m-0"
                            />
                          </View>
                        </View>
                      </View>
                    </Swipeable>
                  ))}
                </ScrollView>
              ) : (
                <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 mb-4">
                  {/* Cliente / Facturación Form */}
                  <View className="mt-2">
                    <Text className="text-slate-500 dark:text-white/80 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
                      Cliente (Nombre Facturado)
                    </Text>
                    <View className="relative z-50 mb-4">
                      <TextInput
                        value={clientName}
                        onChangeText={(text) => {
                          setClientName(text);
                          setSelectedClientId(null);
                          setIsClientNameValidated(false);
                          if (text.trim().length > 0) {
                            fetchClients(text);
                            setShowClientDropdown(true);
                          } else {
                            setShowClientDropdown(false);
                          }
                        }}
                        onFocus={() => {
                          if (clientName.trim().length > 0) {
                            setShowClientDropdown(true);
                          }
                        }}
                        onBlur={handleClientBlur}
                        placeholder="CLIENTE CONTADO"
                        placeholderTextColor={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"}
                        className="bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm"
                      />

                      {/* Dropdown list of clients matching */}
                      {showClientDropdown && clients.length > 0 && (
                        <View className="absolute top-12 left-0 right-0 bg-white dark:bg-[#07203b] border border-slate-200 dark:border-white/10 rounded-xl mt-1 shadow-2xl max-h-[160px] overflow-hidden z-50">
                          <ScrollView keyboardShouldPersistTaps="handled">
                            {clients.map((c) => (
                              <Pressable
                                key={c.id}
                                onPress={() => {
                                  setClientName(c.name);
                                  setSelectedClientId(c.id);
                                  setIsClientNameValidated(true);
                                  setShowClientDropdown(false);
                                }}
                                className="p-3 border-b border-slate-100 dark:border-white/5 active:bg-slate-50 dark:active:bg-white/5 flex-row justify-between items-center"
                              >
                                <Text className="text-slate-800 dark:text-white text-xs font-semibold">{c.name}</Text>
                                {selectedClientId === c.id && <Check size={14} color="#3b82f6" />}
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>

                    {/* Payment Method Selector (Tabs) */}
                    <Text className="text-slate-500 dark:text-white/80 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
                      Forma de Pago
                    </Text>
                    <View className="flex-row gap-2 mb-4">
                      {[
                        {
                          key: 'CASH',
                          label: 'Efectivo',
                          icon: DollarSign,
                          colorClass: 'bg-emerald-600'
                        },
                        {
                          key: 'CARD',
                          label: 'Tarjeta',
                          icon: WalletCards,
                          colorClass: 'bg-blue-600'
                        },
                        {
                          key: 'TRANSFER',
                          label: 'Transfer.',
                          icon: Landmark,
                          colorClass: 'bg-amber-600'
                        },
                        {
                          key: 'CREDITO',
                          label: 'Crédito',
                          icon: Landmark,
                          colorClass: 'bg-purple-600'
                        }
                      ].map((method) => {
                        const isSelected = paymentMethod === method.key;
                        const Icon = method.icon;
                        return (
                          <Pressable
                            key={method.key}
                            onPress={() => setPaymentMethod(method.key)}
                            className={`flex-1 p-2.5 rounded-xl border items-center justify-center ${
                              isSelected
                                ? `${method.colorClass} border-transparent`
                                : 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/5'
                            }`}
                          >
                            <Icon size={16} color={isSelected ? "#ffffff" : isDark ? "#a1a1aa" : "#64748b"} className="mb-1" />
                            <Text className={`text-[10px] font-bold text-center ${isSelected ? "text-white" : "text-slate-500 dark:text-white"}`}>
                              {method.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Formulario de Metadatos de Pago según método activo */}
                    <View className="mb-4">
                      {paymentMethod === 'CASH' && (
                        <View className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-emerald-500/20 gap-3">
                          <View className="flex-row justify-between items-center mb-1">
                            <Text className="text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
                              Pago en Efectivo
                            </Text>
                            <Pressable
                              onPress={() => {
                                const remaining = Math.max(
                                  totalAmount - (rawTransferAmt + rawCardAmt),
                                  0
                                );
                                setCashNio(remaining.toFixed(2));
                                setCashUsd('');
                              }}
                              className="bg-emerald-100 dark:bg-emerald-500/20 px-2.5 py-1 rounded"
                            >
                              <Text className="text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                Restante NIO
                              </Text>
                            </Pressable>
                          </View>
                          <View className="flex-row gap-3">
                            <View className="flex-1 gap-1.5">
                              <Text className="text-slate-500 dark:text-white/60 text-[10px] font-bold uppercase tracking-wider">
                                Córdobas (C$)
                              </Text>
                              <TextInput
                                value={cashNio}
                                onChangeText={setCashNio}
                                placeholder="0.00"
                                placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                                keyboardType="numeric"
                                className="bg-white dark:bg-white/10 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold"
                              />
                            </View>
                            <View className="flex-1 gap-1.5">
                              <Text className="text-slate-500 dark:text-white/60 text-[10px] font-bold uppercase tracking-wider">
                                Dólares ($)
                              </Text>
                              <TextInput
                                value={cashUsd}
                                onChangeText={setCashUsd}
                                placeholder="0.00"
                                placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                                keyboardType="numeric"
                                className="bg-white dark:bg-white/10 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold"
                              />
                            </View>
                          </View>
                          <Text className="text-slate-400 dark:text-white/40 text-[9px] mt-1.5">
                            Tasa cambio oficial: C$ {exchangeRate.toFixed(2)}
                          </Text>
                        </View>
                      )}

                      {paymentMethod === 'TRANSFER' && (
                        <View className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-amber-500/20 gap-3">
                          <View className="flex-row justify-between items-center mb-1">
                            <Text className="text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
                              Pago por Transferencia
                            </Text>
                            <Pressable
                              onPress={() => {
                                const remaining = Math.max(
                                  totalAmount - (rawCashNio + rawCashUsd * exchangeRate + rawCardAmt),
                                  0
                                );
                                setTransferAmount(remaining.toFixed(2));
                              }}
                              className="bg-amber-100 dark:bg-amber-500/20 px-2.5 py-1 rounded"
                            >
                              <Text className="text-amber-700 dark:text-amber-300 text-[10px] font-bold">Restante</Text>
                            </Pressable>
                          </View>

                          <View className="gap-1.5">
                            <Text className="text-slate-500 dark:text-white/60 text-[10px] font-bold uppercase tracking-wider">
                              Banco de Origen
                            </Text>
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              className="flex-row gap-1"
                            >
                              {['BAC', 'BANPRO', 'LAFISE', 'FICOHSA'].map((b) => (
                                <Pressable
                                  key={b}
                                  onPress={() => setTransferBank(b)}
                                  className={`px-2.5 py-1 rounded-lg border mr-1.5 ${
                                    transferBank === b
                                      ? 'bg-amber-600 border-transparent'
                                      : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5'
                                  }`}
                                >
                                  <Text className={`text-[10px] font-bold ${transferBank === b ? 'text-white' : 'text-slate-700 dark:text-white'}`}>{b}</Text>
                                </Pressable>
                              ))}
                            </ScrollView>
                          </View>

                          <View className="flex-row gap-3">
                            <View className="flex-1 gap-1.5">
                              <Text className="text-slate-500 dark:text-white/60 text-[10px] font-bold uppercase tracking-wider">
                                Referencia
                              </Text>
                              <TextInput
                                value={transferRef}
                                onChangeText={setTransferRef}
                                placeholder="Nº Referencia"
                                placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                                className="bg-white dark:bg-white/10 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold"
                              />
                            </View>
                            <View className="flex-1 gap-1.5">
                              <Text className="text-slate-500 dark:text-white/60 text-[10px] font-bold uppercase tracking-wider">
                                Monto (C$)
                              </Text>
                              <TextInput
                                value={transferAmount}
                                onChangeText={setTransferAmount}
                                placeholder="0.00"
                                placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                                keyboardType="numeric"
                                className="bg-white dark:bg-white/10 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold"
                              />
                            </View>
                          </View>
                        </View>
                      )}

                      {paymentMethod === 'CARD' && (
                        <View className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-blue-500/20 gap-3">
                          <View className="flex-row justify-between items-center mb-1">
                            <Text className="text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wider">
                              Pago con Tarjeta
                            </Text>
                            <Pressable
                              onPress={() => {
                                const remaining = Math.max(
                                  totalAmount -
                                    (rawCashNio + rawCashUsd * exchangeRate + rawTransferAmt),
                                  0
                                );
                                setCardAmount(remaining.toFixed(2));
                              }}
                              className="bg-blue-100 dark:bg-blue-500/20 px-2.5 py-1 rounded"
                            >
                              <Text className="text-blue-700 dark:text-blue-300 text-[10px] font-bold">Restante</Text>
                            </Pressable>
                          </View>

                          <View className="gap-1.5">
                            <Text className="text-slate-500 dark:text-white/60 text-[10px] font-bold uppercase tracking-wider">
                              Franquicia
                            </Text>
                            <View className="flex-row gap-1">
                              {['Visa', 'Mastercard', 'AMEX'].map((brand) => (
                                <Pressable
                                  key={brand}
                                  onPress={() => setCardBrand(brand)}
                                  className={`px-2.5 py-1 rounded-lg border mr-1.5 ${
                                    cardBrand === brand
                                      ? 'bg-blue-600 border-transparent'
                                      : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5'
                                  }`}
                                >
                                  <Text className={`text-[10px] font-bold ${cardBrand === brand ? 'text-white' : 'text-slate-700 dark:text-white'}`}>{brand}</Text>
                                </Pressable>
                              ))}
                            </View>
                          </View>

                          <View className="flex-row gap-2">
                            <View className="flex-1 gap-1.5">
                              <Text className="text-slate-500 dark:text-white/60 text-[10px] font-bold uppercase tracking-wider">
                                Últimos 4
                              </Text>
                              <TextInput
                                value={cardDigits}
                                onChangeText={(t) => setCardDigits(t.replace(/\D/g, ''))}
                                maxLength={4}
                                placeholder="0000"
                                placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                                keyboardType="numeric"
                                className="bg-white dark:bg-white/10 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-center"
                              />
                            </View>
                            <View className="flex-1 gap-1.5">
                              <Text className="text-slate-500 dark:text-white/60 text-[10px] font-bold uppercase tracking-wider">
                                Voucher
                              </Text>
                              <TextInput
                                value={cardRef}
                                onChangeText={setCardRef}
                                placeholder="Ref"
                                placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                                className="bg-white dark:bg-white/10 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold"
                              />
                            </View>
                            <View className="flex-1 gap-1.5">
                              <Text className="text-slate-500 dark:text-white/60 text-[10px] font-bold uppercase tracking-wider">
                                Monto (C$)
                              </Text>
                              <TextInput
                                value={cardAmount}
                                onChangeText={setCardAmount}
                                placeholder="0.00"
                                placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
                                keyboardType="numeric"
                                className="bg-white dark:bg-white/10 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold"
                              />
                            </View>
                          </View>
                        </View>
                      )}

                      {paymentMethod === 'CREDITO' && (
                        <View className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-purple-500/20 mb-4">
                          <View className="gap-2.5 p-1">
                            <View className="flex-row items-center gap-2 mb-1">
                              <AlertCircle size={18} color={isDark ? "#a78bfa" : "#7c3aed"} />
                              <Text className="text-purple-600 dark:text-purple-300 text-xs font-black uppercase tracking-wider">
                                Venta a Crédito
                              </Text>
                            </View>
                            <Text className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                              Se generará un saldo pendiente por cobrar a nombre de{' '}
                              <Text className="text-slate-900 dark:text-white font-bold underline">{clientName}</Text>.
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* GLOBAL TOTAL PANEL (Solo visible en Contado) */}
                      {paymentMethod !== 'CREDITO' && (
                        <View
                          className={`p-4 rounded-2xl border mt-4 ${
                            totalPaid >= totalAmount
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/40'
                              : 'bg-amber-50 dark:bg-amber-500/10 border-amber-500/40'
                          }`}
                        >
                          <View className="flex-row justify-between items-center">
                            <View>
                              <Text className="text-slate-500 dark:text-white/60 text-[10px] font-bold uppercase tracking-wider">
                                Total Pagado (Mixto)
                              </Text>
                              <Text className="text-slate-900 dark:text-white text-base font-black">
                                C$ {totalPaid.toFixed(2)}
                              </Text>
                            </View>
                            <View className="items-end">
                              {totalPaid >= totalAmount ? (
                                <View className="items-end">
                                  <Text className="text-emerald-600 dark:text-green-400 text-[10px] font-black uppercase tracking-wider">
                                    Cambio (Vuelto)
                                  </Text>
                                  <Text className="text-emerald-600 dark:text-green-400 text-lg font-black">
                                    C$ {changeDue.toFixed(2)}
                                  </Text>
                                </View>
                              ) : (
                                <View className="items-end">
                                  <Text className="text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                                    Faltante
                                  </Text>
                                  <Text className="text-amber-600 dark:text-amber-400 text-lg font-black">
                                    C$ {missingAmount.toFixed(2)}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Observaciones / Notas */}
                    <Text className="text-slate-500 dark:text-white/80 text-xs font-semibold uppercase tracking-wider mb-2 ml-1">
                      Observaciones
                    </Text>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Notas internas de la venta..."
                      placeholderTextColor={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"}
                      className="bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm"
                    />
                  </View>
                </ScrollView>
              )}
            </KeyboardAvoidingView>

            {/* Modal Bottom Totals & Submit */}
            <View className="border-t border-slate-200 dark:border-white/10 pt-4">
              {checkoutStep === 1 ? (
                <>
                  <View className="flex-row justify-between items-center mb-2">
                    <View>
                      <Text className="text-slate-600 dark:text-white/60 text-xs font-semibold">Subtotal:</Text>
                      {totalDiscount > 0 && (
                        <Text className="text-red-500 dark:text-red-400 text-xs mt-1">Descuento total:</Text>
                      )}
                    </View>
                    <View className="items-end">
                      <Text className="text-slate-700 dark:text-white/85 text-sm font-semibold">${totalAmountBeforeDiscount.toFixed(2)}</Text>
                      {totalDiscount > 0 && (
                        <Text className="text-red-500 dark:text-red-400 text-xs font-bold mt-1">-${totalDiscount.toFixed(2)}</Text>
                      )}
                    </View>
                  </View>
                  <View className="flex-row justify-between items-center mb-4 border-t border-slate-200 dark:border-white/5 pt-2">
                    <Text className="text-slate-900 dark:text-white text-sm font-bold">Total Neto:</Text>
                    <Text className="text-brand-600 dark:text-brand-300 text-2xl font-black">
                      ${totalAmount.toFixed(2)}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setCheckoutStep(2)}
                    className="bg-brand-500 py-4 rounded-xl items-center justify-center shadow-lg active:opacity-90 flex-row"
                  >
                    <Text className="text-white text-base font-bold mr-2">Siguiente: Facturar</Text>
                    <ArrowRight size={18} color="#ffffff" />
                  </Pressable>
                </>
              ) : (
                <>
                  <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-slate-600 dark:text-white/60 text-sm font-semibold">Total a Pagar:</Text>
                    <Text className="text-brand-600 dark:text-brand-300 text-2xl font-black">
                      ${totalAmount.toFixed(2)}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => {
                      if (isLoading) return;
                      Alert.alert(
                        'Confirmar Venta',
                        '¿Estás seguro de que deseas procesar esta factura?',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Sí, Facturar',
                            onPress: handleCheckout,
                          },
                        ]
                      );
                    }}
                    className={`py-4 rounded-xl items-center justify-center shadow-lg active:opacity-90 flex-row ${
                      isLoading ? 'bg-slate-400 dark:bg-slate-600' : 'bg-brand-500'
                    }`}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" className="mr-2" />
                    ) : null}
                    <Text className="text-white text-base font-bold">
                      {isLoading ? 'Procesando Venta...' : 'Confirmar Venta'}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>

            {/* Modal de Validación de Cliente Similares (CheckClientModal) como overlay absoluto */}
            {checkClientModalOpen && (
              <View className="absolute inset-0 bg-black/75 justify-end z-[99999] rounded-t-3xl">
                <SafeAreaView className="w-full">
                  <View className="bg-white dark:bg-[#0c3460] rounded-t-3xl border-t border-slate-200 dark:border-white/10 p-6 pb-12 shadow-2xl">
                    {/* Icon & Title */}
                    <View className="items-center mb-6">
                      <View
                        className={`p-4 rounded-full border mb-3 ${
                          isGenericName
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40'
                            : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40'
                        }`}
                      >
                        <Coins size={32} color={isGenericName ? '#f59e0b' : '#3b82f6'} />
                      </View>
                      <Text className="text-slate-900 dark:text-white text-lg font-black tracking-tight uppercase text-center">
                        {isGenericName
                          ? 'Nombre de Cliente Genérico'
                          : 'Clientes Similares Detectados'}
                      </Text>
                    </View>

                    {/* Description */}
                    <View className="mb-6">
                      {isGenericName ? (
                        <View className="gap-3">
                          <Text className="text-slate-600 dark:text-slate-300 text-sm text-center">
                            Has ingresado un nombre genérico:{' '}
                            <Text className="text-slate-900 dark:text-white font-bold">"{pendingClientName}"</Text>.
                          </Text>
                          <Text className="text-slate-500 dark:text-slate-400 text-xs text-center leading-relaxed">
                            Para evitar duplicidad en la base de datos, te recomendamos seleccionar
                            el cliente genérico ya existente (ej.{' '}
                            <Text className="font-bold text-slate-900 dark:text-white">"CONSUMIDOR FINAL"</Text>) desde
                            el buscador.
                          </Text>
                        </View>
                      ) : (
                        <View className="gap-3">
                          <Text className="text-slate-600 dark:text-slate-300 text-sm text-center">
                            Ya existen clientes registrados con nombres muy similares a{' '}
                            <Text className="text-slate-900 dark:text-white font-bold">"{pendingClientName}"</Text>.
                          </Text>
                          <Text className="text-slate-500 dark:text-slate-400 text-xs text-center leading-relaxed mb-4">
                            Por favor, confirma si es alguno de ellos antes de crear un nuevo
                            registro:
                          </Text>

                          {/* List of similar clients */}
                          <ScrollView style={{ maxHeight: 150 }} className="gap-2">
                            {similarClients.map((client) => (
                              <Pressable
                                key={client.id}
                                onPress={() => {
                                  setCheckClientModalOpen(false);
                                  setSelectedClientId(client.id);
                                  setClientName(client.name);
                                  setIsClientNameValidated(true);
                                  proceedWithCheckout(client.id, client.name);
                                }}
                                className="bg-slate-50 dark:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 p-3.5 rounded-xl border border-slate-200 dark:border-white/5 flex-row justify-between items-center mb-2"
                              >
                                <Text className="text-slate-700 dark:text-white text-sm font-semibold flex-1 mr-2">
                                  {client.name}
                                </Text>
                                <Text className="text-brand-600 dark:text-brand-300 text-xs font-bold shrink-0">
                                  Seleccionar
                                </Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>

                    {/* Actions */}
                    <View className="gap-2.5">
                      <Pressable
                        onPress={async () => {
                          setCheckClientModalOpen(false);
                          setIsClientNameValidated(true);
                          await handleCreateAndCheckout(pendingClientName);
                        }}
                        className="bg-blue-600 active:bg-blue-700 py-4 rounded-xl items-center justify-center shadow-lg"
                      >
                        <Text className="text-white text-sm font-black uppercase tracking-wider">
                          {isGenericName ? 'Usar de todos modos' : 'Crear como Nuevo Cliente'}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          setCheckClientModalOpen(false);
                          setIsClientNameValidated(false);
                        }}
                        className="bg-slate-100 dark:bg-white/10 active:bg-slate-200 dark:active:bg-white/15 py-4 rounded-xl items-center justify-center border border-slate-200 dark:border-white/5"
                      >
                        <Text className="text-slate-700 dark:text-white text-sm font-bold">
                          {isGenericName ? 'Buscar existente o corregir' : 'Cancelar y Corregir'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </SafeAreaView>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal de Apertura de Caja (STRICT Mode) - Removido y cambiado a vista inline para no tapar el menú inferior */}

      {/* Modal de Venta Exitosa */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <SafeAreaView className="flex-1 bg-black/50 dark:bg-slate-950/90 justify-center items-center p-6">
          <View className="w-full max-w-sm bg-white dark:bg-[#0c3460] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl items-center">
            {/* Green Success Icon */}
            <View className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full items-center justify-center mb-4">
              <CheckCircle size={36} color="#10b981" />
            </View>

            <Text className="text-slate-900 dark:text-white text-xl font-bold text-center">¡Venta Registrada!</Text>
            <Text className="text-slate-600 dark:text-slate-300 text-xs text-center mt-1.5 mb-6">
              La factura {lastInvoice?.invoice_number ? `#${lastInvoice.invoice_number}` : ''} por valor de{' '}
              <Text className="text-brand-600 dark:text-brand-300 font-extrabold">C$ {lastInvoice?.grand_total ? Number(lastInvoice.grand_total).toFixed(2) : '0.00'}</Text>{' '}
              ha sido registrada con éxito.
            </Text>

            <View className="w-full gap-3">
              {/* Option 1: Imprimir */}
              <Pressable
                onPress={() => {
                  if (lastInvoice) {
                    printInvoice(lastInvoice, storeName);
                  }
                }}
                className="w-full bg-blue-600 active:bg-blue-700 py-3.5 rounded-xl flex-row items-center justify-center shadow-lg"
              >
                <Text className="text-white text-sm font-bold uppercase tracking-wider">Imprimir Recibo</Text>
              </Pressable>

              {/* Option 2: Compartir PDF */}
              <Pressable
                onPress={() => {
                  if (lastInvoice) {
                    shareInvoice(lastInvoice, storeName);
                  }
                }}
                className="w-full bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 py-3.5 rounded-xl border border-slate-200 dark:border-white/5 flex-row items-center justify-center"
              >
                <Text className="text-slate-700 dark:text-white text-sm font-bold uppercase tracking-wider">Compartir PDF</Text>
              </Pressable>

              {/* Option 3: Listo (Nueva Venta) */}
              <Pressable
                onPress={() => {
                  setSearch('');
                  setShowSuccessModal(false);
                }}
                className="w-full bg-emerald-600 active:bg-emerald-700 py-3.5 rounded-xl flex-row items-center justify-center shadow-lg mt-1"
              >
                <Text className="text-white text-sm font-bold uppercase tracking-wider">Listo (Nueva Venta)</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
        </>
      )}
    </View>
  );
}
