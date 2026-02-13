import { View, StyleSheet, Animated, Text } from 'react-native';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, useTheme } from 'react-native-paper';

type Props = {
  onFinish: () => void;
  message?: string;
  showcreator?: boolean;
};


export default function SplashScreen({ onFinish, message, showcreator=true}: Props) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // انیمیشن متریال (نرم و مینیمال)
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // تایمر ۳ ثانیه
    const timer = setTimeout(onFinish, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.loaderContainer,
          {
            backgroundColor: theme.colors.surface,
            transform: [{ scale }],
            opacity,
          },
        ]}
      >
        <ActivityIndicator
          animating
          size="large"
          color={theme.colors.primary}
        />
      </Animated.View>
        <Text style={[styles.splashText, { color: theme.colors.onSurface }]}>
        {message ?? 'در حال بارگذاری...'}
      </Text>
      {showcreator && (
      <Text style={[styles.splashText, { color: theme.colors.onSurface }]}>Made by Sepehr</Text>)}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0B1E', // دارک بک‌گراند
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContainer: {
    width: 120,
    height: 120,
    borderRadius: 32, // گوشه‌های نرم (Material 3)
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6, // حس 3D ملایم
  },
  splashText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});
