import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axiosInstance from '@/helpers/axiosInstance';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchInvoicesList } from '@/modules/billing/billingSlice';
import { printInvoice, shareInvoice } from '@/helpers/invoicePrintHelper';
import {
  ArrowLeft,
  Landmark,
  DollarSign,
  Calendar,
  User,
  FileText,
  CheckCircle,
  Ban,
  AlertTriangle
} from 'lucide-react-native';

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const dispatch = useAppDispatch();
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeId = useAppSelector((state) => state.auth.currentStoreId) || '';
  const storeName = useAppSelector((state) => state.auth.currentStoreName) || 'Sucursal';

  // Estados locales para la factura detallada
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    async function loadInvoiceDetails() {
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/v1/invoices/${id}`);
        // La API puede retornar data en data.data o data
        setInvoice(response.data?.data || response.data);
      } catch (err: any) {
        Alert.alert('Error', 'No se pudieron cargar los detalles de la factura.');
        router.back();
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      loadInvoiceDetails();
    }
  }, [id]);

  const handleCancelInvoice = () => {
    Alert.alert(
      'Anular Factura',
      '¿Estás seguro de que deseas anular esta factura? Esta acción reintegrará el stock y no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Anular',
          style: 'destructive',
          onPress: async () => {
            try {
              setCanceling(true);
              await axiosInstance.delete(`/v1/invoices/${id}`);
              Alert.alert('Factura Anulada', 'La factura ha sido anulada exitosamente.');
              // Refrescar lista de Redux
              if (storeId) {
                dispatch(fetchInvoicesList({ storeId }));
              }
              router.back();
            } catch (err: any) {
              Alert.alert(
                'Error al anular',
                err.response?.data?.message || 'No se pudo anular la factura.'
              );
            } finally {
              setCanceling(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0c3460] justify-center items-center">
        <ActivityIndicator size="large" color="#0c85eb" />
        <Text className="text-slate-500 dark:text-white/60 mt-4 text-sm font-medium">
          Cargando detalles de la factura...
        </Text>
      </SafeAreaView>
    );
  }

  if (!invoice) return null;

  const isCanceled = invoice.invoice_status === 'canceled';
  const isCredit = invoice.invoice_status === 'credit';
  const isProforma = invoice.invoice_status === 'proforma';

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0c3460]">
      {/* Top Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-slate-200 dark:border-white/10">
        <Pressable onPress={() => router.back()} className="p-2 mr-3 bg-white dark:bg-white/10 rounded-xl border border-slate-200 dark:border-white/5 active:bg-slate-100 dark:active:bg-white/15 shadow-sm dark:shadow-none">
          <ArrowLeft size={16} color={colorScheme === 'dark' ? '#ffffff' : '#1e293b'} />
        </Pressable>
        <Text className="text-slate-900 dark:text-white text-lg font-bold">Detalle de Factura</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }} className="flex-1">
        {/* Info Card principal */}
        <View className="bg-white dark:bg-white/10 p-5 rounded-2xl border border-slate-200 dark:border-white/5 mb-6 shadow-sm dark:shadow-none">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-slate-900 dark:text-white text-xl font-bold">#{invoice.invoice_number}</Text>
            <View
              className={`px-3 py-1 rounded-full ${
                isCanceled ? 'bg-red-100 dark:bg-red-500/20' : isCredit ? 'bg-purple-100 dark:bg-purple-500/20' : isProforma ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-green-100 dark:bg-green-500/20'
              }`}
            >
              <Text
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isCanceled ? 'text-red-800 dark:text-red-300' : isCredit ? 'text-purple-800 dark:text-purple-300' : isProforma ? 'text-amber-800 dark:text-amber-300' : 'text-green-800 dark:text-green-300'
                }`}
              >
                {isCanceled ? 'Anulado' : isCredit ? 'Crédito' : isProforma ? 'Proforma' : 'Completado'}
              </Text>
            </View>
          </View>

          <View className="border-t border-slate-100 dark:border-white/10 pt-4 gap-3">
            <View className="flex-row items-center">
              <Calendar size={14} color={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)'} className="mr-2.5" />
              <Text className="text-slate-500 dark:text-white/60 text-sm">Fecha: </Text>
              <Text className="text-slate-800 dark:text-white text-sm font-semibold">
                {new Date(invoice.invoice_date).toLocaleDateString()}
              </Text>
            </View>

            <View className="flex-row items-center">
              <User size={14} color={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)'} className="mr-2.5" />
              <Text className="text-slate-500 dark:text-white/60 text-sm">Cliente: </Text>
              <Text className="text-slate-800 dark:text-white text-sm font-semibold">{invoice.client_name}</Text>
            </View>

            {invoice.seller && (
              <View className="flex-row items-center">
                <User size={14} color={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)'} className="mr-2.5" />
                <Text className="text-slate-500 dark:text-white/60 text-sm">Vendedor: </Text>
                <Text className="text-slate-800 dark:text-white text-sm font-semibold">{invoice.seller}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Artículos de la factura */}
        <View className="bg-white dark:bg-white/10 p-5 rounded-2xl border border-slate-200 dark:border-white/5 mb-6 shadow-sm dark:shadow-none">
          <Text className="text-slate-500 dark:text-white/80 text-xs font-semibold uppercase tracking-wider mb-4 ml-1">
            Artículos Facturados
          </Text>

          <View className="gap-4">
            {(invoice.invoice_details || []).map((item: any) => (
              <View key={item.id} className="flex-row justify-between items-start">
                <View className="flex-1 mr-4">
                  <Text className="text-slate-900 dark:text-white text-sm font-bold leading-tight">
                    {item.product_name}
                  </Text>
                  <Text className="text-slate-400 dark:text-white/40 text-[10px] mt-0.5">SKU: {item.sku || 'N/A'}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-slate-700 dark:text-white/80 text-xs font-medium">
                    {item.quantity} x ${Number(item.price).toFixed(2)}
                  </Text>
                  <Text className="text-brand-600 dark:text-brand-300 text-sm font-bold mt-0.5">
                    ${Number(item.grand_total ?? item.total).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Desglose de Totales */}
        <View className="bg-white dark:bg-white/10 p-5 rounded-2xl border border-slate-200 dark:border-white/5 mb-6 shadow-sm dark:shadow-none">
          <View className="gap-2.5">
            <View className="flex-row justify-between">
              <Text className="text-slate-500 dark:text-white/60 text-sm">Descuento:</Text>
              <Text className="text-slate-800 dark:text-white font-medium text-sm">
                -${Number(invoice.discount ?? 0).toFixed(2)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-500 dark:text-white/60 text-sm">Impuesto:</Text>
              <Text className="text-slate-800 dark:text-white font-medium text-sm">
                ${Number(invoice.tax ?? 0).toFixed(2)}
              </Text>
            </View>
            <View className="border-t border-slate-100 dark:border-white/10 pt-2.5 flex-row justify-between items-center">
              <Text className="text-slate-800 dark:text-white font-bold text-base">Total General:</Text>
              <Text className="text-brand-600 dark:text-brand-300 font-extrabold text-2xl">
                ${Number(invoice.grand_total).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notas y Método de pago */}
        <View className="bg-white dark:bg-white/10 p-5 rounded-2xl border border-slate-200 dark:border-white/5 mb-6 shadow-sm dark:shadow-none">
          <View className="flex-row justify-between mb-3">
            <Text className="text-slate-500 dark:text-white/60 text-sm">Método de Pago:</Text>
            <Text className="text-slate-900 dark:text-white font-bold text-sm uppercase">{invoice.payment_method}</Text>
          </View>
          {invoice.invoice_note && (
            <View className="border-t border-slate-100 dark:border-white/10 pt-3">
              <Text className="text-slate-400 dark:text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-1">
                Observaciones
              </Text>
              <Text className="text-slate-700 dark:text-white/80 text-sm leading-relaxed">{invoice.invoice_note}</Text>
            </View>
          )}
        </View>

        {/* Acciones de Factura */}
        {!isCanceled && (
          <View className="flex-row gap-3 mb-4">
            <Pressable
              onPress={() => printInvoice(invoice, storeName)}
              className="flex-1 bg-blue-600 active:bg-blue-700 py-4 rounded-xl items-center justify-center flex-row shadow-md"
            >
              <Text className="text-white text-sm font-bold uppercase tracking-wider">Imprimir</Text>
            </Pressable>
            <Pressable
              onPress={() => shareInvoice(invoice, storeName)}
              className="flex-1 bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:active:bg-slate-700 border border-slate-350 dark:border-white/5 py-4 rounded-xl items-center justify-center flex-row shadow-md"
            >
              <Text className="text-slate-800 dark:text-white text-sm font-bold uppercase tracking-wider">Compartir PDF</Text>
            </Pressable>
          </View>
        )}

        {/* Botón de anular factura */}
        {!isCanceled && !isProforma && (
          <Pressable
            onPress={handleCancelInvoice}
            disabled={canceling}
            className="bg-red-500/10 border border-red-500/20 py-4 rounded-xl items-center justify-center flex-row shadow-md active:bg-red-500/20 mb-8"
          >
            {canceling ? (
              <ActivityIndicator size="small" color="#dc2626" className="mr-2" />
            ) : (
              <Ban size={16} color={colorScheme === 'dark' ? '#f87171' : '#dc2626'} className="mr-2" />
            )}
            <Text className="text-red-600 dark:text-red-200 text-base font-bold">
              {canceling ? 'Anulando...' : 'Anular Factura'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
