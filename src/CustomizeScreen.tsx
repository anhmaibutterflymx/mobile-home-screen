import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING = 16;
const GAP = 8;
const COLUMN_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP * 2) / 3;
const DOOR_CARD_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP) / 2;

const cardShadow = {
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
      style={styles.removeBadge}
      onPress={onPress}
      hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
    >
      <Text style={styles.removeBadgeText}>−</Text>
    </TouchableOpacity>
  );
}

// ─── Draggable item wrapper ───────────────────────────────────────────────────

interface DraggableItemProps {
  item: ControlItem;
  index: number;
  items: ControlItem[];
  onRemove: (id: string) => void;
  onReorder: (newItems: ControlItem[]) => void;
  setIsDragging: (v: boolean) => void;
  children: (isLifted: boolean) => React.ReactNode;
  wrapperStyle?: object;
}

function DraggableItem({
  item,
  index,
  items,
  onRemove,
  onReorder,
  setIsDragging,
  children,
  wrapperStyle,
}: DraggableItemProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const zIndex = useSharedValue(1);
  const [isLifted, setIsLifted] = useState(false);

  // Jiggle animation
  useEffect(() => {
    const timeout = setTimeout(() => {
      rotation.value = withRepeat(
        withSequence(
          withTiming(-1.5, { duration: 90 }),
          withTiming(1.5, { duration: 90 }),
        ),
        -1,
        true,
      );
    }, index * 30);
    return () => clearTimeout(timeout);
  }, []);

  const startDrag = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLifted(true);
    setIsDragging(true);
  }, []);

  const endDrag = useCallback(
    (absX: number, absY: number) => {
      // Find drop target by measuring all siblings — use a simple position-based swap
      // We pass back absolute coords; parent compares against other items' positions
      setIsLifted(false);
      setIsDragging(false);
    },
    [],
  );

  const gesture = Gesture.Pan()
    .activateAfterLongPress(450)
    .onStart(() => {
      runOnJS(startDrag)();
      scale.value = withSpring(1.06, { damping: 15 });
      zIndex.value = 100;
    })
    .onUpdate(({ translationX, translationY }) => {
      translateX.value = translationX;
      translateY.value = translationY;
    })
    .onEnd(({ absoluteX, absoluteY }) => {
      runOnJS(endDrag)(absoluteX, absoluteY);
      scale.value = withSpring(1, { damping: 15 });
      zIndex.value = 1;
      translateX.value = withSpring(0, { damping: 20 });
      translateY.value = withSpring(0, { damping: 20 });
    })
    .onFinalize(() => {
      runOnJS(setIsDragging)(false);
      runOnJS(setIsLifted)(false);
      scale.value = withSpring(1, { damping: 15 });
      zIndex.value = 1;
      translateX.value = withSpring(0, { damping: 20 });
      translateY.value = withSpring(0, { damping: 20 });
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
    zIndex: zIndex.value,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        layout={LinearTransition.springify().damping(18)}
        exiting={FadeOut.duration(200)}
        style={[wrapperStyle, animStyle]}
      >
        {children(isLifted)}
        <RemoveBadge onPress={() => onRemove(item.id)} />
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Add placeholder ──────────────────────────────────────────────────────────

function AddPlaceholder({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.addPlaceholderWrapper}>
      <TouchableOpacity style={styles.addPlaceholder} onPress={onPress} activeOpacity={0.7}>
        <Ionicons name="add" size={26} color="#C7C7CC" />
      </TouchableOpacity>
      <Text style={styles.addLabel}>Add control</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

interface CustomizeScreenProps {
  visible: boolean;
  items: ControlItem[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onReorder: (items: ControlItem[]) => void;
  onAddPress: () => void;
}

export default function CustomizeScreen({
  visible,
  items,
  onClose,
  onRemove,
  onReorder,
  onAddPress,
}: CustomizeScreenProps) {
  const insets = useSafeAreaInsets();
  const [isDragging, setIsDragging] = useState(false);

  const quickActions = items.filter((i) => i.section === 'quick-action');
  const doorItems = items.filter((i) => i.section === 'door');

  // Build rows for quick actions (3-column layout, wide=2 cols)
  const quickActionRows = (() => {
    const rows: ControlItem[][] = [];
    let currentRow: ControlItem[] = [];
    let colCount = 0;
    for (const item of quickActions) {
      const cols = item.size === 'wide' ? 2 : 1;
      if (colCount + cols > 3) {
        if (currentRow.length) rows.push(currentRow);
        currentRow = [item];
        colCount = cols;
      } else {
        currentRow.push(item);
        colCount += cols;
      }
    }
    if (currentRow.length) rows.push(currentRow);
    return rows;
  })();

  const renderSmallCard = (item: ControlItem, idx: number) => (
    <DraggableItem
      key={item.id}
      item={item}
      index={idx}
      items={items}
      onRemove={onRemove}
      onReorder={onReorder}
      setIsDragging={setIsDragging}
      wrapperStyle={styles.customizeSmallWrapper}
    >
      {(isLifted) => (
        <View style={[styles.customizeSmallCard, isLifted && styles.cardLifted]}>
          <View style={[styles.smallCardIconBg, { backgroundColor: item.iconBg }]}>
            <Ionicons name={item.icon as any} size={26} color={item.iconColor} />
          </View>
        </View>
      )}
    </DraggableItem>
  );

  const renderWideCard = (item: ControlItem, idx: number) => {
    const cardWidth = COLUMN_WIDTH * 2 + GAP;
    return (
      <DraggableItem
        key={item.id}
        item={item}
        index={idx}
        items={items}
        onRemove={onRemove}
        onReorder={onReorder}
        setIsDragging={setIsDragging}
        wrapperStyle={[styles.customizeWideWrapper, { width: cardWidth }]}
      >
        {(isLifted) => (
          <View style={[styles.customizeWideCard, { width: cardWidth }, isLifted && styles.cardLifted]}>
            <View style={[styles.wideCardIconBg, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon as any} size={24} color={item.iconColor} />
            </View>
            <View style={styles.wideCardText}>
              <Text style={styles.wideCardTitle}>{item.title}</Text>
              {item.subtitle ? <Text style={styles.wideCardSubtitle}>{item.subtitle}</Text> : null}
            </View>
          </View>
        )}
      </DraggableItem>
    );
  };

  const renderDoorCard = (item: ControlItem, idx: number) => (
    <DraggableItem
      key={item.id}
      item={item}
      index={idx}
      items={items}
      onRemove={onRemove}
      onReorder={onReorder}
      setIsDragging={setIsDragging}
      wrapperStyle={{ width: DOOR_CARD_WIDTH }}
    >
      {(isLifted) => (
        <View style={[styles.customizeDoorCard, { width: DOOR_CARD_WIDTH }, isLifted && styles.cardLifted]}>
          <View style={[styles.doorIconCircle, { backgroundColor: item.iconBg }]}>
            <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
          </View>
          <View style={styles.doorCardText}>
            <Text style={styles.doorCardTitle}>{item.title}</Text>
            {item.subtitle ? <Text style={styles.doorCardSubtitle}>{item.subtitle}</Text> : null}
          </View>
        </View>
      )}
    </DraggableItem>
  );

  let globalIdx = 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#1C1C1E" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Customize home screen</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!isDragging}
          >
            {/* Quick action rows */}
            {quickActionRows.map((row, rowIdx) => (
              <View key={`row-${rowIdx}`} style={styles.quickActionRow}>
                {row.map((item) => {
                  const idx = globalIdx++;
                  if (item.size === 'wide') return renderWideCard(item, idx);
                  return renderSmallCard(item, idx);
                })}
              </View>
            ))}

            {/* Labels row for quick actions */}
            {quickActions.length > 0 && (
              <View style={styles.labelsRow}>
                {quickActionRows.flat().map((item) => (
                  <View
                    key={`lbl-${item.id}`}
                    style={{
                      width: item.size === 'wide' ? COLUMN_WIDTH * 2 + GAP : COLUMN_WIDTH,
                      alignItems: 'center',
                    }}
                  >
                    {item.label ? (
                      <Text style={styles.cardLabel} numberOfLines={2}>
                        {item.label}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}

            {/* Door grid */}
            {doorItems.length > 0 && (
              <Animated.View layout={LinearTransition.springify().damping(18)} style={styles.doorGrid}>
                {doorItems.map((item) => renderDoorCard(item, globalIdx++))}
              </Animated.View>
            )}

            {/* Add placeholders — 3 rows of 4 */}
            <View style={styles.addSection}>
              {[0, 1, 2].map((rowIdx) => (
                <View key={`add-row-${rowIdx}`} style={styles.addRow}>
                  {[0, 1, 2, 3].map((colIdx) => (
                    <AddPlaceholder
                      key={`add-${rowIdx}-${colIdx}`}
                      onPress={onAddPress}
                    />
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
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    paddingVertical: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: PADDING,
    paddingTop: 12,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: GAP,
    marginBottom: 4,
  },
  labelsRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  cardLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
  // Small card
  customizeSmallWrapper: {
    width: COLUMN_WIDTH,
    alignItems: 'center',
  },
  customizeSmallCard: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH,
    borderRadius: COLUMN_WIDTH / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  smallCardIconBg: {
    width: COLUMN_WIDTH * 0.52,
    height: COLUMN_WIDTH * 0.52,
    borderRadius: (COLUMN_WIDTH * 0.52) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Wide card
  customizeWideWrapper: {
    alignItems: 'center',
  },
  customizeWideCard: {
    height: COLUMN_WIDTH,
    borderRadius: COLUMN_WIDTH / 2,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    ...cardShadow,
  },
  wideCardIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  wideCardText: {
    flex: 1,
  },
  wideCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  wideCardSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 1,
  },
  // Door grid
  doorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    marginBottom: 20,
  },
  customizeDoorCard: {
    height: 76,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
    ...cardShadow,
  },
  doorIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doorCardText: {
    flex: 1,
  },
  doorCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  doorCardSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  // Lifted card state
  cardLifted: {
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  // Remove badge
  removeBadge: {
    position: 'absolute',
    top: -7,
    left: -7,
    zIndex: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F2F2F7',
  },
  removeBadgeText: {
    color: '#fff',
    fontSize: 17,
    lineHeight: 19,
    fontWeight: '300',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  // Add placeholders
  addSection: {
    marginTop: 4,
  },
  addRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP + 4,
    justifyContent: 'flex-start',
  },
  addPlaceholderWrapper: {
    width: COLUMN_WIDTH,
    alignItems: 'center',
  },
  addPlaceholder: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH,
    borderRadius: COLUMN_WIDTH / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 6,
    textAlign: 'center',
  },
});
