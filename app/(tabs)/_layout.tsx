import { Slot } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { MD3DarkTheme } from 'react-native-paper';

export default function Layout() {
  return (
    <PaperProvider theme={MD3DarkTheme}>
      <Slot />
    </PaperProvider>
  );
}
