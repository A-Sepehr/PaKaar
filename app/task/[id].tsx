import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TASKS_KEY = 'tasks_v1';

type TaskStatus = 'pending' | 'inProgress' | 'done';

type StoredTask = {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO
  status: TaskStatus;
};

const statusConfig: Record<TaskStatus, { text: string; color: string }> = {
  pending: { text: 'انجام نشده', color: '#EF4444' },
  inProgress: { text: 'در حال انجام', color: '#FACC15' },
  done: { text: 'انجام شده', color: '#22C55E' },
};

const getRemainingTime = (deadlineISO: string) => {
  const now = Date.now();
  const diff = new Date(deadlineISO).getTime() - now;

  if (diff <= 0) return 'مهلت تمام شده';

  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return `${days} روز، ${hours} ساعت، ${minutes} دقیقه`;
};

export default function TaskDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [task, setTask] = useState<StoredTask | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const remaining = useMemo(() => (task ? getRemainingTime(task.deadline) : ''), [task]);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(TASKS_KEY);
        if (!raw) {
          setTask(null);
          return;
        }
        const arr = JSON.parse(raw) as StoredTask[];
        const found = arr.find(t => t.id === id) ?? null;
        setTask(found);

        if (found) {
          setEditTitle(found.title);
          setEditDesc(found.description);
        }
      } catch (e) {
        console.warn('Failed to load task', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const saveEdits = async () => {
    if (!task) return;

    const title = editTitle.trim();
    const description = editDesc.trim();

    if (!title) return;

    try {
      const raw = await AsyncStorage.getItem(TASKS_KEY);
      const arr = raw ? (JSON.parse(raw) as StoredTask[]) : [];

      const updated: StoredTask[] = arr.map(t =>
        t.id === task.id ? { ...t, title, description } : t
      );

      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updated));

      // آپدیت local state
      setTask(prev => (prev ? { ...prev, title, description } : prev));
      setIsEditing(false);

      // برگرد برای دیدن تغییرات
      router.back();
    } catch (e) {
      console.warn('Failed to save task edits', e);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#BBB' }}>در حال بارگذاری...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle} numberOfLines={1}>
            جزئیات تسک
          </Text>
        </View>

        <Text style={{ color: '#BBB', textAlign: 'center', marginTop: 30 }}>
          تسک پیدا نشد
        </Text>
      </View>
    );
  }

  const st = statusConfig[task.status];

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1, backgroundColor: '#1A132C' }]}
      behavior={'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <View style={styles.container}> 
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.topTitle} numberOfLines={1}>
          {task.title}
        </Text>

        <TouchableOpacity
          onPress={() => setIsEditing(v => !v)}
          style={styles.editBtn}
        >
          <Text style={styles.editText}>{isEditing ? 'لغو' : 'ویرایش'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        {/* Status + Remaining */}
        <View style={styles.card}>
          <Text style={styles.label}>وضعیت</Text>
          <View style={[styles.badge, { backgroundColor: st.color }]}>
            <Text style={styles.badgeText}>{st.text}</Text>
          </View>

          <View style={{ height: 14 }} />

          <Text style={styles.label}>مهلت باقی‌مانده</Text>
          <Text style={styles.value}>⏳ {remaining}</Text>
        </View>

        {/* Title */}
        <View style={styles.card}>
          <Text style={styles.label}>اسم تسک</Text>
          {isEditing ? (
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              style={styles.input}
              placeholder="اسم تسک..."
              placeholderTextColor="#AAA"
            />
          ) : (
            <Text style={styles.value}>{task.title}</Text>
          )}
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.label}>توضیحات</Text>
          {isEditing ? (
            <TextInput
              value={editDesc}
              onChangeText={setEditDesc}
              style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
              placeholder="توضیحات..."
              placeholderTextColor="#AAA"
              multiline
            />
          ) : (
            <Text style={styles.value}>
              {task.description?.trim() ? task.description : 'بدون توضیحات'}
            </Text>
          )}
        </View>

        {/* Save */}
        {isEditing && (
          <TouchableOpacity style={styles.saveBtn} onPress={saveEdits}>
            <Text style={styles.saveText}>ذخیره تغییرات</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A132C', padding: 16 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#7C3AED',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2B1F45',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backText: { color: '#FFF', fontSize: 20, fontWeight: '700' },

  topTitle: { flex: 1, color: '#7C3AED', fontSize: 18, fontWeight: '700' },

  editBtn: {
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2B1F45',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  editText: { color: '#FFF', fontWeight: '700' },

  card: {
    marginTop: 16,
    backgroundColor: '#2B1F45',
    borderRadius: 24,
    padding: 16,
  },
  label: { color: '#AAA', marginBottom: 8, fontSize: 13 },
  value: { color: '#FFF', fontSize: 15, lineHeight: 22 },

  badge: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: { color: '#000', fontWeight: '800', fontSize: 12 },

  input: {
    backgroundColor: '#3A2A5B',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 15,
  },

  saveBtn: {
    marginTop: 18,
    backgroundColor: '#7C3AED',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
