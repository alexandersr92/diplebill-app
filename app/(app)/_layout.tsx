import { withLayoutContext } from 'expo-router';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { Platform } from 'react-native';

const NativeTabNavigator = createNativeBottomTabNavigator();
export const Tabs = withLayoutContext(NativeTabNavigator.Navigator);

export default function AppLayout() {
  return (
    <Tabs
      translucent={true}
      screenOptions={{
        headerShown: false,
        // Apple Music style colors
        tabBarActiveTintColor: '#fc3c44', 
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: {
          backgroundColor: Platform.select({
            ios: 'transparent', // Liquid Glass effect native
            android: '#0c3460'
          }),
          position: Platform.select({
            ios: 'absolute',
            android: 'relative'
          }),
          borderTopWidth: Platform.select({
            ios: 0,
            android: 1
          }),
          borderTopColor: 'rgba(255, 255, 255, 0.1)'
        }
      }}
    >
      {/* 1. Facturas */}
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Facturas',
          tabBarIcon: () => Platform.OS === 'ios' ? { sfSymbol: 'doc.text.fill' } : undefined
        }}
      />

      {/* 2. Créditos */}
      <Tabs.Screen
        name="credits"
        options={{
          title: 'Créditos',
          tabBarIcon: () => Platform.OS === 'ios' ? { sfSymbol: 'building.columns.fill' } : undefined
        }}
      />

      {/* 3. Facturar (Middle / Standout) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Facturar',
          tabBarIcon: () => Platform.OS === 'ios' ? { sfSymbol: 'cart.fill' } : undefined
        }}
      />

      {/* 4. Caja */}
      <Tabs.Screen
        name="cash"
        options={{
          title: 'Caja',
          tabBarIcon: () => Platform.OS === 'ios' ? { sfSymbol: 'dollarsign.circle.fill' } : undefined
        }}
      />

      {/* 5. Ajustes */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: () => Platform.OS === 'ios' ? { sfSymbol: 'gearshape.fill' } : undefined
        }}
      />

      {/* Details hidden from tab navigation */}
      <Tabs.Screen
        name="invoice-detail"
        options={{
          href: null,
          tabBarItemHidden: true
        }}
      />
    </Tabs>
  );
}
