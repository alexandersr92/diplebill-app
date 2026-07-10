import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  searchVal?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
}

export default function Header({
  title,
  subtitle,
  rightAction,
  searchVal,
  onSearchChange,
  searchPlaceholder
}: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingTop: Math.max(insets.top, 12) }}
      className="bg-[#0c3460] dark:bg-[#0a2648] px-6 pb-4 border-b border-[#0a2c52] dark:border-white/5 shadow-md"
    >
      <View className="flex-row justify-between items-center">
        <View className="flex-grow mr-2">
          <Text className="text-white text-2xl font-bold">{title}</Text>
          {subtitle ? (
            <Text className="text-white/60 text-xs mt-0.5 font-medium">{subtitle}</Text>
          ) : null}
        </View>
        {rightAction ? <View>{rightAction}</View> : null}
      </View>

      {onSearchChange !== undefined ? (
        <View className="relative justify-center mt-3 mb-1">
          <View className="absolute left-4 z-10 h-full justify-center">
            <Search size={18} color="rgba(255, 255, 255, 0.6)" />
          </View>
          <TextInput
            value={searchVal}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder || 'Buscar...'}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            className="bg-white/15 text-white pl-11 pr-4 py-2.5 rounded-xl border border-white/10 text-sm"
          />
        </View>
      ) : null}
    </View>
  );
}
