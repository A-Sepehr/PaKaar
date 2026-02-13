import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

export default function AddTaskDetails() {
  const router = useRouter();
  const { title } = useLocalSearchParams<{ title: string }>();

  const [description, setDescription] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Description Input */}
      <TextInput
        placeholder="توضیحات تسک رو بنویس..."
        placeholderTextColor="#AAA"
        style={styles.descriptionInput}
        multiline
        value={description}
        onChangeText={setDescription}
      />

      {/* Confirm Button */}
      <TouchableOpacity
        style={styles.confirmButton}
        onPress={() => {
          if (!description.trim()) return;

          //  انتخاب زمان
          router.push({
          pathname: '/add-task-deadline',
          params: { title, description },
        });

        }}
      >
        <Text style={styles.confirmText}>ادامه</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A132C',
    padding: 16,
  },
  topBar: {
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#7C3AED',
  },
  topTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#7C3AED',
  },
  descriptionInput: {
    flex: 1,
    marginTop: 20,
    backgroundColor: '#2B1F45',
    borderRadius: 24,
    padding: 16,
    color: '#FFF',
    textAlignVertical: 'top',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

