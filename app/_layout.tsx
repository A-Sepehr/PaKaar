import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import SplashScreen from './(tabs)/SplashScreen';

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <PaperProvider theme={MD3DarkTheme}>
      {showSplash ? (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      ) : (
        <Slot />
      )}
    </PaperProvider>
  );
}
