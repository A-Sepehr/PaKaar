import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import SplashScreen from './(tabs)/SplashScreen';

type TaskStatus = 'pending' | 'inProgress' | 'done';

type Task = {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO string (برای انتقال بین صفحات)
  status: TaskStatus;
};

const ITEM_H = 44;
const VISIBLE = 5; // باید فرد باشد (۵/۷/۹)

function clamp(n: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, n));
}


function WheelPicker({
  data,
  value,
  onChange,
  width = 90,
}: {
  data: number[];
  value: number;
  onChange: (v: number) => void;
  width?: number;
}) {
  const listRef = useRef<FlatList<number>>(null);

  const initialIndex = useMemo(() => {
    const idx = data.indexOf(value);
    return idx >= 0 ? idx : 0;
  }, [data, value]);

  const paddingV = (ITEM_H * (VISIBLE - 1)) / 2;

  const snapToIndex = (index: number) => {
    const i = clamp(index, 0, data.length - 1);
    onChange(data[i]);
    listRef.current?.scrollToOffset({ offset: i * ITEM_H, animated: true });
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_H);
    snapToIndex(index);
  };

  return (
    <View style={[styles.wheelWrap, { width, height: ITEM_H * VISIBLE }]}>
      {/* خطوط راهنما */}
      <View
        style={[
          styles.wheelGuide,
          { top: paddingV, height: ITEM_H },
        ]}
        pointerEvents="none"
      />

      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item) => String(item)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: paddingV }}
        getItemLayout={(_, index) => ({
          length: ITEM_H,
          offset: ITEM_H * index,
          index,
        })}
        initialScrollIndex={initialIndex}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => {
          const isSelected = item === value;
          return (
            <View style={[styles.wheelItem, { height: ITEM_H }]}>
              <Text style={[styles.wheelText, isSelected && styles.wheelTextSelected]}>
                {String(item).padStart(2, '0')}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );


}

export default function AddTaskDeadline() {
  const router = useRouter();
  const { title, description } = useLocalSearchParams<{
    title?: string;
    description?: string;
  }>();

  const safeTitle = title ?? 'تسک جدید';
  const safeDesc = description ?? '';

  const [showPicker, setShowPicker] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // انتخاب روز (امروز + ۶ روز)
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);

  // Wheel ساعت/دقیقه
  const [hour, setHour] = useState<number>(new Date().getHours());
  const [minute, setMinute] = useState<number>(new Date().getMinutes());

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  const buildDeadlineISO = () => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDayOffset);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const deadlineLabel = useMemo(() => {
    const d = new Date(buildDeadlineISO());
    // نمایش فارسی (روی وب هم کار می‌کند)
    try {
      return `${d.toLocaleDateString('fa-IR')} - ${String(d.getHours()).padStart(2, '0')}:${String(
        d.getMinutes()
      ).padStart(2, '0')}`;
    } catch {
      return d.toString();
    }
  }, [selectedDayOffset, hour, minute]);

  const confirm = () => {
  setIsSubmitting(true);

  const newTask = {
    id: Date.now().toString(),
    title: safeTitle,
    description: safeDesc,
    deadline: buildDeadlineISO(),
    status: 'pending',
  };

  setTimeout(() => {
    router.replace({
      pathname: '/',
      params: { newTask: encodeURIComponent(JSON.stringify(newTask)) },
    });
  }, 2000); // ۲ ثانیه لودینگ
};


  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle} numberOfLines={1}>
          {safeTitle}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>زمان انجام را انتخاب کن</Text>

        <TouchableOpacity style={styles.openPickerBtn} onPress={() => setShowPicker(true)}>
          <Text style={styles.openPickerText}>انتخاب تاریخ و ساعت</Text>
        </TouchableOpacity>

        <Text style={styles.previewText}>{deadlineLabel}</Text>
      </View>

      <TouchableOpacity style={styles.confirmButton} onPress={confirm}>
        <Text style={styles.confirmText}>ثبت تسک</Text>
      </TouchableOpacity>
      {isSubmitting && (
  <View style={styles.loadingOverlay}>
    <SplashScreen onFinish={() => {}} message="در حال ثبت تسک..." showcreator={false} />
  </View>
)}


      {/* Modal Picker */}
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>انتخاب زمان</Text>

            {/* روزها */}
            <Text style={styles.sectionTitle}>روز</Text>
            <View style={styles.daysRow}>
              {days.map((d, idx) => {
                const selected = idx === selectedDayOffset;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.dayChip, selected && styles.dayChipSelected]}
                    onPress={() => setSelectedDayOffset(idx)}
                  >
                    <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>
                      {idx === 0 ? 'امروز' : d.toLocaleDateString('fa-IR')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ساعت و دقیقه */}
            <Text style={styles.sectionTitle}>ساعت</Text>
            <View style={styles.wheelsRow}>
              <WheelPicker data={Array.from({ length: 24 }, (_, i) => i)} value={hour} onChange={setHour} />
              <Text style={styles.colon}>:</Text>
              <WheelPicker
                data={Array.from({ length: 60 }, (_, i) => i)} // اگر خواستی 5تایی: length 12 و i*5
                value={minute}
                onChange={setMinute}
              />
            </View>

            {/* actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#444' }]}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.actionText}>لغو</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setShowPicker(false)}>
                <Text style={styles.actionText}>تایید</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A132C', padding: 16 },
  topBar: {
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#7C3AED',
  },
  topTitle: { fontSize: 20, fontWeight: '600', color: '#7C3AED' },

  card: {
    marginTop: 28,
    backgroundColor: '#2B1F45',
    borderRadius: 28,
    padding: 18,
  },
  label: { color: '#FFF', fontSize: 16, marginBottom: 12, textAlign: 'center' },
  openPickerBtn: {
    backgroundColor: '#3A2A5B',
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: 'center',
  },
  openPickerText: { color: '#FFF', fontSize: 15 },
  previewText: { marginTop: 12, color: '#BBB', textAlign: 'center' },

  confirmButton: {
    marginTop: 'auto',
    backgroundColor: '#7C3AED',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#2B1F45',
    padding: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  sectionTitle: { color: '#AAA', marginTop: 14, marginBottom: 8 },

  daysRow: { flexDirection: 'row', flexWrap: 'wrap' },
  dayChip: {
    backgroundColor: '#3A2A5B',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  dayChipSelected: { backgroundColor: '#7C3AED' },
  dayChipText: { color: '#FFF', fontSize: 12 },
  dayChipTextSelected: { color: '#FFF', fontWeight: '600' },

  wheelsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  colon: { color: '#FFF', fontSize: 22, marginHorizontal: 6 },

  wheelWrap: {
    backgroundColor: '#3A2A5B',
    borderRadius: 18,
    overflow: 'hidden',
  },
  wheelGuide: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.08)',
    zIndex: 2,
  },
  wheelItem: { justifyContent: 'center', alignItems: 'center' },
  wheelText: { color: 'rgba(255,255,255,0.55)', fontSize: 18 },
  wheelTextSelected: { color: '#FFF', fontWeight: '700' },

  actionsRow: { flexDirection: 'row', marginTop: 16, gap: 10 },
  actionBtn: {
    flex: 1,
    backgroundColor: '#7C3AED',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionText: { color: '#FFF', fontWeight: '600' },
  loadingOverlay: {
  ...StyleSheet.absoluteFillObject,
  zIndex: 999,
},
});
