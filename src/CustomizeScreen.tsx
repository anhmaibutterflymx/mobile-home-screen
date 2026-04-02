import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
  LinearTransition,
  FadeOut,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ControlItem } from './types';

// Fixed 393px layout (matches the phone frame)
const PHONE_W  = 393;
const PADDING  = 16;
const GAP      = 8;
const CONTENT  = PHONE_W - PADDING * 2;          // 361

const COL_W    = (CONTENT - GAP * 2) / 3;         // 115  — quick-action grid
const DOOR_W   = (CONTENT - GAP) / 2;             // 176.5 — door grid
const ADD_W    = (CONTENT - GAP * 3) / 4;         // 82.75 — add-placeholder grid

const CARD_H   = COL_W;   // square cards
const DOOR_H   = 74;

const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

// ─── Remove badge ────────────────────────────────────────────────────────────

function RemoveBadge({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.badge}
      onPress={onPress}
      hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
    >
      <Text style={styles.badgeText}>−</Text>
    </TouchableOpacity>
  );
}

// ─── Jiggle wrapper ───────────────────────────────────────────────────────────

function Jiggle({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: object }) {
  const r = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => {
      r.value = withRepeat(
        withSequence(withTiming(-1.4, { duration: 85 }), withTiming(1.4, { duration: 85 })),
        -1, true,
      );
    }, delay);
    return () => clearTimeout(t);
  }, []);
  const anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

// ─── Draggable item ───────────────────────────────────────────────────────────

interface DraggableProps {
  item: ControlItem;
  index: number;
  allItems: ControlItem[];
  onRemove: (id: string) => void;
  onReorder: (items: ControlItem[]) => void;
  setScrollEnabled: (v: boolean) => void;
  wrapStyle?: object;
  cardHeight: number;
  children: React.ReactNode;
}

function DraggableItem({
  item, index, allItems, onRemove, onReorder,
  setScrollEnabled, wrapStyle, cardHeight, children,
}: DraggableProps) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sc = useSharedValue(1);
  const zi = useSharedValue(1);
  const viewRef = useRef<View>(null);
  // store absolute position so parent can find drop target
  const absPos = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const measureSelf = useCallback(() => {
    viewRef.current?.measureInWindow((x, y, w, h) => {
      absPos.current = { x, y, w, h };
    });
  }, []);

  const doReorder = useCallback((endAbsX: number, endAbsY: number) => {
    // Find another item in the same section closest to drop point
    const section = item.section;
    const sectionItems = allItems.filter(i => i.section === section);
    const myIdx = allItems.indexOf(item);

    let closestId: string | null = null;
    let closestDist = Infinity;

    // We need sibling item positions — stored in a shared ref passed via closure
    // Simple fallback: use translation magnitude to determine swap direction
    const distX = tx.value;
    const distY = ty.value;
    const totalDist = Math.sqrt(distX * distX + distY * distY);

    if (totalDist < 20) return; // too small a movement

    // Calculate how many columns
    const cols = section === 'door' ? 2 : 3;
    const itemW = section === 'door' ? DOOR_W : COL_W;
    const itemH = section === 'door' ? DOOR_H : CARD_H;

    // Current grid position
    const curCol = myIdx % cols;
    const curRow = Math.floor(myIdx / cols);

    // Target grid position based on translation
    const targetCol = Math.round(curCol + distX / (itemW + GAP));
    const targetRow = Math.round(curRow + distY / (itemH + GAP));

    const clampedCol = Math.max(0, Math.min(cols - 1, targetCol));
    const clampedRow = Math.max(0, Math.min(Math.ceil(sectionItems.length / cols) - 1, targetRow));
    const targetIdx  = Math.min(clampedRow * cols + clampedCol, sectionItems.length - 1);

    // Find global index of target section item
    let sectionIdx = 0;
    let targetGlobalIdx = -1;
    for (let i = 0; i < allItems.length; i++) {
      if (allItems[i].section === section) {
        if (sectionIdx === targetIdx) { targetGlobalIdx = i; break; }
        sectionIdx++;
      }
    }

    if (targetGlobalIdx !== -1 && targetGlobalIdx !== myIdx) {
      const next = [...allItems];
      const [moved] = next.splice(myIdx, 1);
      next.splice(targetGlobalIdx, 0, moved);
      onReorder(next);
    }
  }, [item, allItems, onReorder, tx, ty]);

  const haptic = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const gesture = Gesture.Pan()
    .activateAfterLongPress(450)
    .onStart(() => {
      runOnJS(haptic)();
      runOnJS(setScrollEnabled)(false);
      runOnJS(measureSelf)();
      sc.value = withSpring(1.07, { damping: 14 });
      zi.value = 50;
    })
    .onUpdate(({ translationX, translationY }) => {
      tx.value = translationX;
      ty.value = translationY;
    })
    .onEnd(({ translationX, translationY, absoluteX, absoluteY }) => {
      runOnJS(doReorder)(absoluteX, absoluteY);
      runOnJS(setScrollEnabled)(true);
      sc.value = withSpring(1, { damping: 14 });
      zi.value = 1;
      tx.value = withSpring(0, { damping: 18 });
      ty.value = withSpring(0, { damping: 18 });
    })
    .onFinalize(() => {
      runOnJS(setScrollEnabled)(true);
      sc.value = withSpring(1, { damping: 14 });
      zi.value = 1;
      tx.value = withSpring(0, { damping: 18 });
      ty.value = withSpring(0, { damping: 18 });
    });

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: sc.value }],
    zIndex: zi.value,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        ref={viewRef as any}
        layout={LinearTransition.springify().damping(18)}
        exiting={FadeOut.duration(180)}
        style={[wrapStyle, anim]}
      >
        <Jiggle style={{ position: 'relative' }}>
          {children}
          <RemoveBadge onPress={() => onRemove(item.id)} />
        </Jiggle>
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Add placeholder ──────────────────────────────────────────────────────────

function AddPlaceholder({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.addWrap}>
      <TouchableOpacity style={styles.addCircle} onPress={onPress} activeOpacity={0.7}>
        <Ionicons name="add" size={24} color="#C7C7CC" />
      </TouchableOpacity>
      <Text style={styles.addLabel}>Add control</Text>
    </View>
  );
}

// ─── Customize screen ─────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  items: ControlItem[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onReorder: (items: ControlItem[]) => void;
  onAddPress: () => void;
}

export default function CustomizeScreen({ visible, items, onClose, onRemove, onReorder, onAddPress }: Props) {
  const insets = useSafeAreaInsets();
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const quickActions = items.filter(i => i.section === 'quick-action');
  const doorItems    = items.filter(i => i.section === 'door');

  // Pack quick actions into 3-column rows
  const qaRows: ControlItem[][] = [];
  let row: ControlItem[] = []; let cols = 0;
  for (const item of quickActions) {
    const c = item.size === 'wide' ? 2 : 1;
    if (cols + c > 3) { qaRows.push(row); row = [item]; cols = c; }
    else              { row.push(item); cols += c; }
  }
  if (row.length) qaRows.push(row);

  const renderSmall = (item: ControlItem, idx: number) => (
    <DraggableItem key={item.id} item={item} index={idx} allItems={items}
      onRemove={onRemove} onReorder={onReorder} setScrollEnabled={setScrollEnabled}
      wrapStyle={styles.smallWrap} cardHeight={CARD_H}
    >
      <View style={styles.smallCard}>
        <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon as any} size={24} color={item.iconColor} />
        </View>
      </View>
    </DraggableItem>
  );

  const renderWide = (item: ControlItem, idx: number) => {
    const w = COL_W * 2 + GAP;
    return (
      <DraggableItem key={item.id} item={item} index={idx} allItems={items}
        onRemove={onRemove} onReorder={onReorder} setScrollEnabled={setScrollEnabled}
        wrapStyle={[styles.wideWrap, { width: w }]} cardHeight={CARD_H}
      >
        <View style={[styles.wideCard, { width: w }]}>
          <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
            <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.wideTitle}>{item.title}</Text>
            {item.subtitle ? <Text style={styles.wideSub}>{item.subtitle}</Text> : null}
          </View>
        </View>
      </DraggableItem>
    );
  };

  const renderDoor = (item: ControlItem, idx: number) => (
    <DraggableItem key={item.id} item={item} index={idx} allItems={items}
      onRemove={onRemove} onReorder={onReorder} setScrollEnabled={setScrollEnabled}
      wrapStyle={{ width: DOOR_W }} cardHeight={DOOR_H}
    >
      <View style={[styles.doorCard, { width: DOOR_W }]}>
        <View style={[styles.doorIcon, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.doorTitle}>{item.title}</Text>
          {item.subtitle ? <Text style={styles.doorSub}>{item.subtitle}</Text> : null}
        </View>
      </View>
    </DraggableItem>
  );

  let gi = 0; // global index for jiggle delay

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.container, { paddingTop: insets.top || 16 }]}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color="#1C1C1E" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Customize home screen</Text>
            <View style={{ width: 34 }} />
          </View>

          <ScrollView
            scrollEnabled={scrollEnabled}
            contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Quick-action rows */}
            {qaRows.map((r, ri) => (
              <View key={`qar-${ri}`} style={styles.qaRow}>
                {r.map(item => item.size === 'wide' ? renderWide(item, gi++) : renderSmall(item, gi++))}
              </View>
            ))}

            {/* Labels under quick actions */}
            {quickActions.length > 0 && (
              <View style={styles.qaRow}>
                {quickActions.map(item => (
                  <View key={`lbl-${item.id}`} style={{
                    width: item.size === 'wide' ? COL_W * 2 + GAP : COL_W,
                    alignItems: 'center',
                  }}>
                    {item.label
                      ? <Text style={styles.cardLabel} numberOfLines={2}>{item.label}</Text>
                      : null}
                  </View>
                ))}
              </View>
            )}

            {/* Door grid */}
            {doorItems.length > 0 && (
              <Animated.View layout={LinearTransition.springify()} style={styles.doorGrid}>
                {doorItems.map(item => renderDoor(item, gi++))}
              </Animated.View>
            )}

            {/* Add-control placeholders — 4 columns, 3 rows */}
            <View style={styles.addSection}>
              {[0, 1, 2].map(row => (
                <View key={`ar-${row}`} style={styles.addRow}>
                  {[0, 1, 2, 3].map(col => (
                    <AddPlaceholder key={`ap-${row}-${col}`} onPress={onAddPress} />
                  ))}
                </View>
              ))}
            </View>

          </ScrollView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: PADDING, paddingVertical: 12,
  },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  scroll:       { paddingHorizontal: PADDING, paddingTop: 12 },

  // Quick-action
  qaRow:  { flexDirection: 'row', gap: GAP, marginBottom: 4, alignItems: 'flex-start' },
  smallWrap: { width: COL_W, alignItems: 'center' },
  smallCard: {
    width: COL_W, height: CARD_H,
    borderRadius: COL_W / 2,
    backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    ...shadow,
  },
  iconCircle: {
    width: COL_W * 0.5, height: COL_W * 0.5,
    borderRadius: COL_W * 0.25,
    alignItems: 'center', justifyContent: 'center',
  },
  wideWrap: { alignItems: 'center' },
  wideCard: {
    height: CARD_H,
    borderRadius: CARD_H / 2,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14, gap: 10,
    ...shadow,
  },
  wideTitle: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  wideSub:   { fontSize: 11, color: '#8E8E93', marginTop: 1 },
  cardLabel: { fontSize: 11, color: '#8E8E93', textAlign: 'center', lineHeight: 15, marginTop: 3 },

  // Door
  doorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginTop: 8, marginBottom: 8 },
  doorCard: {
    height: DOOR_H,
    borderRadius: 14,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12, gap: 10,
    ...shadow,
  },
  doorIcon:  { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  doorTitle: { fontSize: 13, fontWeight: '600', color: '#1C1C1E' },
  doorSub:   { fontSize: 11, color: '#8E8E93', marginTop: 2 },

  // Remove badge
  badge: {
    position: 'absolute', top: -7, left: -7, zIndex: 20,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#007AFF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#F2F2F7',
  },
  badgeText: {
    color: '#FFF', fontSize: 16, fontWeight: '300',
    lineHeight: 18, includeFontPadding: false, textAlignVertical: 'center',
  },

  // Add placeholders
  addSection: { marginTop: 12 },
  addRow:     { flexDirection: 'row', gap: GAP, marginBottom: GAP + 4 },
  addWrap:    { width: ADD_W, alignItems: 'center' },
  addCircle:  {
    width: ADD_W, height: ADD_W,
    borderRadius: ADD_W / 2,
    backgroundColor: '#FFF',
    borderWidth: 1.5, borderColor: '#E5E5EA',
    alignItems: 'center', justifyContent: 'center',
  },
  addLabel: { fontSize: 10, color: '#8E8E93', marginTop: 5, textAlign: 'center' },
});
