import React, { useRef, useState, useMemo } from 'react';
import { View, Animated, PanResponder, ActivityIndicator, LayoutChangeEvent } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

interface SlideToConfirmProps {
  onConfirm: () => void;
  text: string;
  isLoading?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

export default function SlideToConfirm({ onConfirm, text, isLoading, theme = 'auto' }: SlideToConfirmProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const { colorScheme } = useColorScheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const isConfirmed = useRef(false);

  const activeTheme = theme === 'auto' ? colorScheme : theme;
  const isDark = activeTheme === 'dark';

  const handleSize = 48;
  const padding = 4;
  const maxSlideDistance = containerWidth > 0 ? containerWidth - handleSize - padding * 2 : 0;

  // Use refs to access latest values inside PanResponder without recreating it
  const maxSlideDistanceRef = useRef(maxSlideDistance);
  maxSlideDistanceRef.current = maxSlideDistance;
  
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isLoadingRef.current && maxSlideDistanceRef.current > 0,
      onMoveShouldSetPanResponder: () => !isLoadingRef.current && maxSlideDistanceRef.current > 0,
      onPanResponderMove: (_, gestureState) => {
        if (isConfirmed.current) return;
        let nextX = gestureState.dx;
        if (nextX < 0) nextX = 0;
        if (nextX > maxSlideDistanceRef.current) nextX = maxSlideDistanceRef.current;
        translateX.setValue(nextX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isConfirmed.current) return;
        if (gestureState.dx >= maxSlideDistanceRef.current * 0.8) {
          isConfirmed.current = true;
          Animated.timing(translateX, {
            toValue: maxSlideDistanceRef.current,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            onConfirmRef.current();
            setTimeout(() => {
              isConfirmed.current = false;
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
              }).start();
            }, 1500);
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  };

  const textOpacity = translateX.interpolate({
    inputRange: [0, Math.max(maxSlideDistance / 2, 1)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      onLayout={handleLayout}
      style={{ padding }}
      className={`rounded-2xl h-14 justify-center border overflow-hidden relative ${
        isDark ? 'bg-white/10 border-white/10' : 'bg-black/5 border-black/10'
      }`}
    >
      <Animated.Text
        style={{ opacity: textOpacity }}
        className={`text-xs font-bold uppercase tracking-wider text-center absolute w-full pointer-events-none ${
          isDark ? 'text-white/60' : 'text-slate-500'
        }`}
      >
        {text}
      </Animated.Text>

      {isLoading ? (
        <View className="absolute right-4 z-10 pointer-events-none">
          <ActivityIndicator size="small" color={isDark ? '#ffffff' : '#0c3460'} />
        </View>
      ) : null}

      <Animated.View
        style={{
          width: handleSize,
          height: handleSize,
          transform: [{ translateX }],
          // Adding cursor pointer for web
          cursor: 'pointer',
          // Touch action none prevents browser scrolling on drag
          touchAction: 'none'
        } as any}
        {...panResponder.panHandlers}
        className="bg-brand-500 active:bg-brand-600 rounded-xl justify-center items-center shadow-lg"
      >
        <ArrowRight size={20} color="#ffffff" />
      </Animated.View>
    </View>
  );
}
