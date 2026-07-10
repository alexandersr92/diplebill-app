import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useAppSelector } from '@/store/hooks';
import { SingleInvoice } from '@/modules/billing/billingSlice';
import { FileText, ChevronRight, DollarSign, Calendar, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import axiosInstance from '@/helpers/axiosInstance';
import Header from '@/components/Header';

export default function InvoicesScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const storeId = useAppSelector((state) => state.auth.currentStoreId) || '';
  const storeName = useAppSelector((state) => state.auth.currentStoreName) || 'Sucursal';

  const [invoices, setInvoices] = useState<SingleInvoice[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async (pageNumber = 1, isRefresh = false) => {
    if (!storeId) return;
    if (loading && !isRefresh) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get('/v1/invoices', {
        params: {
          store_id: storeId,
          sort_by: 'created_at',
          order: 'desc',
          per_page: 20,
          page: pageNumber
        }
      });

      const records = response.data?.data || response.data || [];

      if (isRefresh || pageNumber === 1) {
        setInvoices(records);
        setPage(1);
        setHasMore(records.length === 20);
      } else {
        setInvoices((prev) => [...prev, ...records]);
        setPage(pageNumber);
        setHasMore(records.length === 20);
      }
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      setError(err?.response?.data?.message || 'Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(1, true);
  }, [storeId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices(1, true);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchInvoices(page + 1, false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-800 dark:text-green-300', label: 'Completado' };
      case 'canceled':
        return { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-800 dark:text-red-300', label: 'Anulado' };
      case 'credit':
        return { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-800 dark:text-purple-300', label: 'Crédito' };
      default:
        return { bg: 'bg-gray-100 dark:bg-gray-500/20', text: 'text-gray-800 dark:text-gray-300', label: status };
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#0c3460]">
      {/* Reusable Header */}
      <Header
        title="Historial de Ventas"
        subtitle={`${storeName} • Recientes primero`}
        rightAction={
          <Pressable
            onPress={() => fetchInvoices(1, true)}
            className="p-3 bg-white/15 active:bg-white/25 rounded-xl border border-white/10 shadow-sm"
          >
            <RefreshCw size={16} color="#ffffff" />
          </Pressable>
        }
      />

      {/* Invoice List */}
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colorScheme === 'dark' ? '#ffffff' : '#0c85eb'} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => {
          const status = getStatusStyle(item.invoice_status || 'completed');
          return (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(app)/invoice-detail',
                  params: { id: item.id }
                })
              }
              className="bg-white dark:bg-white/10 p-4 rounded-2xl border border-slate-200 dark:border-white/5 mb-3 flex-row justify-between items-center active:bg-slate-100 dark:active:bg-white/15 shadow-sm dark:shadow-none"
            >
              <View className="flex-1 mr-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-slate-900 dark:text-white text-base font-bold">#{item.invoice_number}</Text>
                  <View className={`px-2.5 py-0.5 rounded-full ${status.bg}`}>
                    <Text
                      className={`text-[10px] font-bold uppercase tracking-wider ${status.text}`}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>

                <Text className="text-slate-700 dark:text-white/80 text-sm mt-1.5 font-medium">{item.client_name}</Text>

                <View className="flex-row items-center mt-2 gap-4">
                  <View className="flex-row items-center">
                    <Calendar size={12} color={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)'} className="mr-1" />
                    <Text className="text-slate-500 dark:text-white/40 text-xs">
                      {new Date(item.invoice_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <DollarSign size={12} color={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)'} className="mr-0.5" />
                    <Text className="text-brand-600 dark:text-brand-300 font-extrabold text-sm">
                      ${Number(item.grand_total).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>

              <ChevronRight size={18} color={colorScheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)'} />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-20">
              <FileText size={48} color={colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.2)'} className="mb-4" />
              <Text className="text-slate-400 dark:text-white/40 text-sm">
                {error ? error : 'No hay facturas registradas.'}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading ? <ActivityIndicator size="small" color="#0c85eb" className="py-4" /> : null
        }
      />
    </View>
  );
}
