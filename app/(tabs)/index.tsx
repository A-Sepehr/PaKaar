import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import { Alert } from 'react-native';
import { AnimatedFAB,useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useWindowDimensions, FlatList } from 'react-native';
import React, { useCallback } from 'react';





type TaskStatus = 'pending' | 'inProgress' | 'done';

type Task = {
  id: string;
  title: string;
  description: string;
  deadline: Date;
  status: TaskStatus;
};

const getRemainingTime = (deadline: Date) => {
  const now = new Date().getTime();
  const diff = new Date(deadline).getTime() - now;
  if (diff <= 0) return 'مهلت تمام شده';

  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `${days} روز، ${hours} ساعت، ${minutes} دقیقه`;
};




export default function Home() {
  const theme = useTheme();

  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const SCREEN_PADDING = 16;
  const GRID_GAP = 16;

  const CARD_WIDTH = isLargeScreen
  ? (width - SCREEN_PADDING * 2 - GRID_GAP) / 2
  : width - SCREEN_PADDING * 2;


  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);



  // Splash
  const [showSplash, setShowSplash] = useState(true);

  // User Name
  const [userName, setUserName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [inputName, setInputName] = useState('');

  const TASKS_KEY = 'tasks_v1';


  // Empty state
  const [tasks, setTasks] = useState<Task[]>([]);

  // Animated for Search/Filter
  const searchShake = useRef(new Animated.Value(0)).current;
  const filterShake = useRef(new Animated.Value(0)).current;

  // Filter Modal
  const [showFilterModal, setShowFilterModal] = useState(false);
// --- State Filter جدید ---
const [filterState, setFilterState] = useState({
  all: true, // فقط این چک خورده پیش‌فرض
  todoPending: false,
  todoInProgress: false,
  todoDone: false,
});

// Add Task 
const [showAddTaskModal, setShowAddTaskModal] = useState(false);
const [newTaskTitle, setNewTaskTitle] = useState('');

//مهلت باقی مانده
const getRemainingTime = (deadline: Date) => {
  const now = new Date().getTime();
  const diff = new Date(deadline).getTime() - now;

  if (diff <= 0) return 'مهلت تمام شده';

  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return `${days} روز، ${hours} ساعت، ${minutes} دقیقه`;
};

// --- State برای Modal تایید حذف و انجام ---
const [confirmModal, setConfirmModal] = useState<{
  visible: boolean;
  type: 'delete' | 'done' | null;
  taskId: string | null;
}>({
  visible: false,
  type: null,
  taskId: null,
});




// --- Handler برای تغییر Checkbox ---
const toggleCheckbox = (key: keyof typeof filterState) => {
  if (key === 'all') {
    // اگر همه زده شد → بقیه همه آنچک
    setFilterState({
      all: true,
      todoPending: false,
      todoInProgress: false,
      todoDone: false,
    });
  } else {
    // تغییر یک Checkbox جداگانه
    const newState = { ...filterState, [key]: !filterState[key], all: false };

    // اگر همه Checkboxهای جداگانه چک شدند → all چک شود
    if (
      newState.todoPending &&
      newState.todoInProgress &&
      newState.todoDone
    ) {
      newState.all = true;
      newState.todoPending = false;
      newState.todoInProgress = false;
      newState.todoDone = false;
    }

    setFilterState(newState);
  }
};

const filteredTasks = tasks.filter(t => {
  if (filterState.all) return true;

  const pendingOK = filterState.todoPending && t.status === 'pending';
  const progOK = filterState.todoInProgress && t.status === 'inProgress';
  const doneOK = filterState.todoDone && t.status === 'done';

  return pendingOK || progOK || doneOK;
});





  // Greeting
  const hours = new Date().getHours();
  let greeting = 'روزت بخیر';
  if (hours < 12) greeting = 'صبحت بخیر';
  else if (hours < 17) greeting = 'روزت بخیر';
  else greeting = 'عصر بخیر';

  const { newTask } = useLocalSearchParams<{ newTask?: string }>();

useEffect(() => {
  const raw = Array.isArray(newTask) ? newTask[0] : newTask;
  if (!raw) return;

  try {
    const decoded = decodeURIComponent(raw); // اگر encode نشده باشه هم مشکلی ایجاد نمی‌کنه (اغلب)
    const parsed = JSON.parse(decoded);

    const task: Task = {
      ...parsed,
      deadline: new Date(parsed.deadline),
    };

    setTasks(prev => {
      // جلوگیری از اضافه شدن دوباره (اگر صفحه رفرش شد یا params دوباره رسید)
      if (prev.some(t => t.id === task.id)) return prev;
      return [...prev, task];
    });
  } catch (e) {
    console.warn('Failed to parse newTask param', e);
  }
}, [newTask]);



useEffect(() => {
  const loadTasks = async () => {
    try {
      const raw = await AsyncStorage.getItem(TASKS_KEY);

      if (!raw) return;

      const parsed = JSON.parse(raw) as Array<Omit<Task, 'deadline'> & { deadline: string }>;
      const loaded: Task[] = parsed.map(t => ({
        ...t,
        deadline: new Date(t.deadline),
      }));

      setTasks(prev => {
        // merge بر اساس id
        const map = new Map<string, Task>();
        prev.forEach(t => map.set(t.id, t));
        loaded.forEach(t => map.set(t.id, t));
        return Array.from(map.values());
      });
    } catch (e) {
      console.warn('Failed to load tasks', e);
    } finally {
      setHydrated(true);
    }
  };

  loadTasks();
}, []);




useEffect(() => {
  if (!hydrated) return;

  const saveTasks = async () => {
    try {
      const serializable = tasks.map(t => ({
        ...t,
        deadline:
          t.deadline instanceof Date
            ? t.deadline.toISOString()
            : new Date(t.deadline as any).toISOString(),
      }));

      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(serializable));
    } catch (e) {
      console.warn('Failed to save tasks', e);
    }
  };

  saveTasks();
}, [tasks, hydrated]);






  // Load username from storage
  useEffect(() => {
    const loadName = async () => {
      const savedName = await AsyncStorage.getItem('userName');
      if (savedName) setUserName(savedName);
      else setShowNameModal(true);
    };
    loadName();
  }, []);

  // Handlers for animated shake
  const shakeAnimation = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -5, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // Save username
  const saveName = async () => {
    if (inputName.trim()) {
      await AsyncStorage.setItem('userName', inputName.trim());
      setUserName(inputName.trim());
      setShowNameModal(false);
    }
  };


  return (
    
    <SafeAreaView style={[styles.container, { backgroundColor: '#1A132C' }]}>
      {/* Name Modal */}
      <Modal visible={showNameModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>اسم خود را وارد کنید</Text>
            <TextInput
              placeholder="مثلاً سپهر"
              placeholderTextColor="#CCC"
              style={styles.modalInput}
              value={inputName}
              onChangeText={setInputName}
            />
            <TouchableOpacity style={styles.modalButton} onPress={saveName}>
              <Text style={styles.modalButtonText}>ثبت</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.filterModalContent}>
            <Text style={styles.modalTitle}>فیلتر تسک‌ها</Text>

            {/* Checkboxes */}
            <View style={styles.checkboxRow}>
              {/* All */}
              <TouchableOpacity style={styles.checkbox} onPress={() => toggleCheckbox('all')}>
                <View style={[styles.checkboxBox, filterState.all && styles.checkedBox]} />
                <Text style={styles.checkboxText}>همه</Text>
              </TouchableOpacity>

              {/* انجام نشده */}
              <TouchableOpacity style={styles.checkbox} onPress={() => toggleCheckbox('todoPending')}>
                <View style={[styles.checkboxBox, filterState.todoPending && styles.checkedBox]} />
                <Text style={styles.checkboxText}>انجام نشده</Text>
              </TouchableOpacity>

              {/* در حال انجام */}
              <TouchableOpacity style={styles.checkbox} onPress={() => toggleCheckbox('todoInProgress')}>
                <View style={[styles.checkboxBox, filterState.todoInProgress && styles.checkedBox]} />
                <Text style={styles.checkboxText}>در حال انجام</Text>
              </TouchableOpacity>

              {/* انجام شده */}
              <TouchableOpacity style={styles.checkbox} onPress={() => toggleCheckbox('todoDone')}>
                <View style={[styles.checkboxBox, filterState.todoDone && styles.checkedBox]} />
                <Text style={styles.checkboxText}>انجام شده</Text>
              </TouchableOpacity>
            </View>

            {/* Buttons */}
            <View style={styles.filterButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, { flex: 1, marginRight: 8 }]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.modalButtonText}>لغو</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { flex: 1, marginLeft: 8 }]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.modalButtonText}>تایید</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.greeting}>{`${greeting} ${userName || '...'}`} 👋</Text>
        <View style={styles.topBarDivider} />
      </View>

      {/* Search + Filter */}
      <View style={styles.searchFilterContainer}>
        <Animated.View style={{ flex: 1, transform: [{ translateX: filterShake }] }}>
          <TextInput
            placeholder="جستجوی تسک..."
            placeholderTextColor="#CCC"
            style={styles.searchInput}
            onFocus={() => shakeAnimation(filterShake)}
          />
        </Animated.View>

        <Animated.View
          style={{ width: 80, marginLeft: 12, transform: [{ translateX: searchShake }] }}
        >
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              shakeAnimation(searchShake);
              setShowFilterModal(true);
            }}
          >
            <Text style={styles.filterText}>فیلتر</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* TodoList */}
      <View style={styles.todoContainer}>
        {tasks.length === 0 ? (
  <Text style={styles.emptyText}>تسکی هنوز ثبت نشده</Text>
) : (
  filteredTasks.length === 0 ? (
    <Text style={styles.emptyText}>تسکی با این فیلتر پیدا نشد</Text>
  ) : (
  <FlatList
  data={filteredTasks}
  key={isLargeScreen ? 'grid' : 'list'}
  numColumns={isLargeScreen ? 2 : 1}
  keyExtractor={item => item.id}
  contentContainerStyle={{ paddingBottom: 120 }}
    renderItem={({ item, index }) => (
      <View style={{ width: CARD_WIDTH, marginBottom: GRID_GAP, marginRight: isLargeScreen && index % 2 === 0 ? GRID_GAP : 0}}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(`./task/${item.id}`)}>
      <TaskCard
        task={item}
        onDelete={() =>
          setTasks(prev => prev.filter(t => t.id !== item.id))
        }
        
        onDone={() =>
          setTasks(prev =>
            prev.map(t =>
              t.id === item.id ? { ...t, status: "done" } : t
            )
          )
        }
      />
      </TouchableOpacity>
    </View>

    )}
  />
))}


      </View>

        {/* Add Task - Title Modal */}
<Modal visible={showAddTaskModal} transparent animationType="fade">
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>اسم تسک چیه؟</Text>

      <TextInput
        placeholder="مثلاً تمرین "
        placeholderTextColor="#AAA"
        style={styles.modalInput}
        value={newTaskTitle}
        onChangeText={setNewTaskTitle}
        autoFocus
      />

      <View style={{ flexDirection: 'row', width: '100%', marginTop: 12 }}>
        <TouchableOpacity
          style={[styles.modalButton, { flex: 1, backgroundColor: '#444', marginRight: 8 }]}
          onPress={() => setShowAddTaskModal(false)}
        >
          <Text style={styles.modalButtonText}>لغو</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, { flex: 1 }]}
          onPress={() => {
            if (!newTaskTitle.trim()) return;
            setShowAddTaskModal(false);

            router.push({
              pathname: '/add-task-details',
              params: { title: newTaskTitle },
            });
          }}
        >
          <Text style={styles.modalButtonText}>تایید</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

<Modal visible={confirmModal.visible} transparent animationType="fade">
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>
        {confirmModal.type === 'delete'
          ? 'حذف تسک؟'
          : 'تسک انجام شد؟'}
      </Text>

      <Text style={{ color: '#CCC', marginBottom: 16, textAlign: 'center' }}>
        {confirmModal.type === 'delete'
          ? 'این تسک برای همیشه حذف می‌شود'
          : 'وضعیت تسک به مرحله بعدی تغییر می‌کند'}
      </Text>

      <View style={{ flexDirection: 'row', width: '100%' }}>
        <TouchableOpacity
          style={[
            styles.modalButton,
            { flex: 1, backgroundColor: '#444', marginRight: 8 },
          ]}
          onPress={() =>
            setConfirmModal({ visible: false, type: null, taskId: null })
          }
        >
          <Text style={styles.modalButtonText}>لغو</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, { flex: 1 }]}
          onPress={() => {
            if (confirmModal.type === 'done') {
              const found = tasks.find(t => t.id === confirmModal.taskId);
              if (found) {
                const expired = new Date(found.deadline).getTime() <= Date.now();
                if (!expired) {
                  setTasks(prev =>
                    prev.map(t =>
                      t.id === confirmModal.taskId ? { ...t, status: 'done' } : t
                    )
                  );
                } else {
                  Alert.alert('مهلت تمام شده', 'نمی‌توان وضعیت تسک منقضی را تغییر داد.');
                }
              }
            } else if (confirmModal.type === 'delete') {
              setTasks(prev => prev.filter(t => t.id !== confirmModal.taskId));
            }

            setConfirmModal({ visible: false, type: null, taskId: null });
          }}
        >
          <Text style={styles.modalButtonText}>تایید</Text>
        </TouchableOpacity>
        
      </View>
    </View>
  </View>
</Modal>


      

      {/* Add Task Button */}
      <AnimatedFAB
        icon="plus"
        label='اضافه کردن تسک'
        onPress={() => {
    setNewTaskTitle('');
    setShowAddTaskModal(true);
  }}
        style={styles.fabStyle}
        extended={true}
      />
    </SafeAreaView>


    
  );
  type TaskStatus = 'pending' | 'inProgress' | 'done';
  type Task = {
  id: string;
  title: string;
  description: string;
  deadline: Date;
  status: TaskStatus;
};

function TaskCard({
  task,
  onDelete,
  onDone,
}: {
  task: Task;
  onDelete: () => void;
  onDone: () => void;
}) {
  const statusConfig = {
    pending: { text: 'انجام نشده', color: '#EF4444' },
    inProgress: { text: 'در حال انجام', color: '#FACC15' },
    done: { text: 'انجام شده', color: '#22C55E' },
  };

  const status = statusConfig[task.status];
  const isExpired = new Date(task.deadline).getTime() <= Date.now();

  return (
    <View style={styles.taskCard}>
      <Text style={styles.taskTitle} numberOfLines={1}>
        {task.title}
      </Text>

         <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
           <Text style={styles.statusText}>{status.text}</Text>
         </View>

         {task.status !== 'done' && (
           <Text style={styles.deadlineText}>⏳ {getRemainingTime(task.deadline)}</Text>
         )}

      <View style={styles.taskActions}>
        <TouchableOpacity onPress={() =>
          setConfirmModal({
            visible: true,
            type: 'delete',
            taskId: task.id,
          })
        }>
          <Text style={styles.actionText}>🗑️</Text>
        </TouchableOpacity>
        {task.status === 'pending' && !isExpired && (
          <TouchableOpacity onPress={() =>
            setTasks(prev => prev.map(t =>
              t.id === task.id ? { ...t, status: 'inProgress' } : t
            ))
          }>
            <Text style={styles.actionText}>⏳</Text>
          </TouchableOpacity>
        )}

        {task.status !== 'done' && !isExpired && (
          <TouchableOpacity onPress={() =>
            setConfirmModal({
              visible: true,
              type: 'done',
              taskId: task.id,
            })
          }>
            <Text style={styles.actionText}>✅</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
  
}



const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  topBar: { paddingVertical: 20 },
  greeting: { fontSize: 22, fontWeight: '600', color: '#7C3AED' },
  topBarDivider: {
    height: 4,
    backgroundColor: '#7C3AED',
    borderRadius: 4,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  fabStyle: {
    bottom: 16,
    right: 16,
    position: 'absolute',
    boxSizing: 'border-box',
  },
  searchFilterContainer: { flexDirection: 'row', marginTop: 20, marginBottom: 12, alignItems: 'center' },
  searchInput: {
    flex: 1,
    backgroundColor: '#2B1F45',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    color: '#FFF',
  },
  filterButton: {
    height: 48,
    backgroundColor: '#7C3AED',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterText: { color: '#FFF', fontWeight: '600' },
  todoContainer: { flex: 1, marginTop: 20, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#AAA', fontSize: 16 },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  addButtonText: { color: '#FFF', fontSize: 32, fontWeight: '600' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '80%', backgroundColor: '#2B1F45', borderRadius: 20, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 18, color: '#FFF', marginBottom: 16, textAlign: 'center' },
  modalInput: { width: '100%', backgroundColor: '#3A2A5B', borderRadius: 20, padding: 12, color: '#FFF', marginBottom: 16 },
  modalButton: { width: '100%', padding: 12, borderRadius: 20, backgroundColor: '#7C3AED', alignItems: 'center', marginTop: 8 },
  modalButtonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  filterModalContent: { width: '80%', backgroundColor: '#2B1F45', borderRadius: 20, padding: 24, alignItems: 'center' },
  checkboxRow: { width: '100%', marginBottom: 16 },
  checkbox: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkboxBox: { width: 20, height: 20, borderWidth: 2, borderColor: '#CCC', borderRadius: 4, marginRight: 12 },
  checkedBox: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  checkboxText: { color: '#FFF', fontSize: 16 },
  filterButtonsRow: { flexDirection: 'row', width: '100%' },

  taskCard: {
  backgroundColor: '#2B1F45',
  borderRadius: 24,
  padding: 16,
}
,
taskTitle: {
  color: '#FFF',
  fontSize: 16,
  fontWeight: '600',
  marginBottom: 8,
},
statusBadge: {
  alignSelf: 'flex-start',
  borderRadius: 12,
  paddingHorizontal: 10,
  paddingVertical: 4,
  marginBottom: 12,
},
statusText: {
  color: '#000',
  fontSize: 12,
  fontWeight: '600',
},
taskActions: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 'auto',
},
actionText: {
  fontSize: 20,
},
deadlineText: {
  color: '#BBB',
  fontSize: 12,
  marginBottom: 8,
},

});