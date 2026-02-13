import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import dayjs from 'dayjs';
import jalaliday from 'jalaliday';

dayjs.extend(jalaliday);

/* ------------------ Utils ------------------ */

const persianMonths = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

function getDaysInJalaliMonth(year: number, month: number) {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isJalaliLeap(year) ? 30 : 29;
}

function isJalaliLeap(year: number) {
  const mod = year % 33;
  return [1, 5, 9, 13, 17, 22, 26, 30].includes(mod);
}

/* ------------------ Screen ------------------ */

export default function AddTaskDeadline() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    description?: string;
  }>();

  const today = dayjs().calendar('jalali');

  const [year, setYear] = useState(today.year());
  const [month, setMonth] = useState(today.month() + 1);
  const [day, setDay] = useState(today.date());

  const [hour, setHour] = useState(today.hour());
  const [minute, setMinute] = useState(today.minute());

  const maxDays = useMemo(
    () => getDaysInJalaliMonth(year, month),
    [year, month]
  );

  if (day > maxDays) setDay(maxDays);

  const finalDate = useMemo(() => {
    return dayjs()
      .calendar('jalali')
      .year(year)
      .month(month - 1)
      .date(day)
      .hour(hour)
      .minute(minute)
      .second(0);
  }, [year, month, day, hour, minute]);

  const isValid = finalDate.isAfter(dayjs());

  const confirm = () => {
  if (!isValid) return;

  router.push({
    pathname: '/',
    params: {
      newTask: JSON.stringify({
        id: Date.now().toString(),
        title: params.title,
        description: params.description,
        deadline: finalDate.toISOString(),
        status: 'pending',
      }),
    },
  });
};


  return (
    <View style={styles.container}>
      <Text style={styles.header}>انتخاب زمان انجام</Text>

      {/* Year Input */}
      <Text style={styles.label}>سال</Text>
      <TextInput
        value={String(year)}
        onChangeText={t => setYear(Number(t) || today.year())}
        keyboardType="numeric"
        style={styles.yearInput}
      />

      {/* Month & Day */}
      <View style={styles.row}>
        <Wheel
          label="ماه"
          data={persianMonths}
          index={month - 1}
          onChange={i => setMonth(i + 1)}
        />

        <Wheel
          label="روز"
          data={Array.from({ length: maxDays }, (_, i) => String(i + 1))}
          index={day - 1}
          onChange={i => setDay(i + 1)}
        />
      </View>

      {/* Time */}
      <View style={styles.row}>
        <Wheel
          label="ساعت"
          data={Array.from({ length: 24 }, (_, i) => i.toString())}
          index={hour}
          onChange={setHour}
        />

        <Wheel
          label="دقیقه"
          data={Array.from({ length: 60 }, (_, i) => i.toString())}
          index={minute}
          onChange={setMinute}
        />
      </View>

      <Text style={styles.preview}>
        📅 {day} {persianMonths[month - 1]} {year} ⏰ {hour}:
        {minute.toString().padStart(2, '0')}
      </Text>

      {!isValid && (
        <Text style={styles.error}>تاریخ باید بعد از الان باشد</Text>
      )}

      <View style={styles.actions}>
        <Pressable style={styles.cancel} onPress={() => router.back()}>
          <Text style={styles.btnText}>لغو</Text>
        </Pressable>
        <Pressable
          style={[styles.confirm, !isValid && { opacity: 0.4 }]}
          onPress={confirm}
          disabled={!isValid}
        >
          <Text style={styles.btnText}>تأیید</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------ Wheel ------------------ */

function Wheel({
  data,
  index,
  onChange,
  label,
}: {
  data: string[];
  index: number;
  onChange: (i: number) => void;
  label: string;
}) {
  const ITEM_HEIGHT = 40;

  return (
    <View style={styles.wheel}>
      <Text style={styles.wheelLabel}>{label}</Text>

      <FlatList
        data={data}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        keyExtractor={(_, i) => i.toString()}
        getItemLayout={(_, i) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * i,
          index: i,
        })}
        initialScrollIndex={index}
        onMomentumScrollEnd={e => {
          const i = Math.round(
            e.nativeEvent.contentOffset.y / ITEM_HEIGHT
          );
          onChange(i);
        }}
        renderItem={({ item, index: i }) => (
          <Pressable
            onPress={() => onChange(i)}
            style={[
              styles.wheelItem,
              i === index && styles.wheelActive,
            ]}
          >
            <Text
              style={[
                styles.wheelText,
                i === index && styles.wheelTextActive,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}


/* ------------------ Styles ------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1b102d',
    padding: 20,
  },
  header: {
    color: '#fff',
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    color: '#b9a7ff',
    marginBottom: 6,
  },
  yearInput: {
    backgroundColor: '#2a1b45',
    color: '#fff',
    borderRadius: 14,
    padding: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 12,
  },
  wheel: {
    height: 160,
    width: 110,
    backgroundColor: '#2a1b45',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  wheelLabel: {
    color: '#c9baff',
    marginBottom: 6,
  },
  wheelItem: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelActive: {
    backgroundColor: '#6c4cff33',
    borderRadius: 12,
  },
  wheelText: {
    color: '#aaa',
  },
  wheelTextActive: {
    color: '#fff',
    fontSize: 16,
  },
  preview: {
    marginTop: 20,
    textAlign: 'center',
    color: '#fff',
  },
  error: {
    color: '#ff6b6b',
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  cancel: {
    flex: 1,
    backgroundColor: '#3a2a55',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirm: {
    flex: 1,
    backgroundColor: '#7b5cff',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
  },
});
