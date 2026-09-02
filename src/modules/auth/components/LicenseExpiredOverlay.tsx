import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppDispatch } from '@/store/hooks';
import { logout } from '@/modules/auth/authSlice';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

interface Props {
  message?: string;
}

export function LicenseExpiredOverlay({ message }: Props) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('admin_token');
    await SecureStore.deleteItemAsync('seller_store_id');
    dispatch(logout());
    router.replace('/login');
  };

  return (
    <View style={StyleSheet.absoluteFill} className="z-[9999] flex-1 items-center justify-center bg-slate-950/95 px-6">
      <View className="w-full max-w-sm bg-slate-900 border border-red-900/50 rounded-3xl p-8 items-center shadow-lg">
        <View className="p-4 bg-red-950/40 rounded-full border border-red-800/40 mb-6">
          <Text className="text-red-500 text-3xl font-black">!</Text>
        </View>
        
        <Text className="text-white text-xl font-black tracking-tight uppercase text-center mb-2">
          Licencia Expirada
        </Text>
        
        <Text className="text-slate-400 text-sm font-medium text-center mb-6 leading-5">
          El tiempo de uso de tu licencia ha concluido y el acceso al sistema ha sido suspendido.
        </Text>

        {!!message && (
          <View className="w-full bg-red-950/30 border border-red-900/50 rounded-xl p-4 mb-8">
            <Text className="text-red-200 text-sm text-center font-medium leading-5">
              {message}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3.5 flex-row items-center justify-center"
        >
          <Text className="text-white text-sm font-bold uppercase tracking-wider">
            Cerrar Sesión
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
