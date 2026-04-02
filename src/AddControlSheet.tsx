import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  TextInput,
  Pressable,
  Keyboard,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ControlItem } from './types';
import { ALL_ITEMS } from './data';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PADDING = 16;
const GAP = 8;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

interface AddControlSheetProps {
  visible: boolean;
  activeItemIds: string[];
  onAdd: (item: ControlItem) => void;
  onClose: () => void;
}

export default function AddControlSheet({
  visible,
  activeItemIds,
  onAdd,
  onClose,
}: AddControlSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [searchText, setSearchText] = useState('');
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 200,
        mass: 0.8,
      });
      backdropOpacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withSpring(SHEET_HEIGHT, {
        damping: 20,
        stiffness: 200,
      });
      backdropOpacity.value = withTiming(0, { duration: 200 });
      setTimeout(() => {
        setIsRendered(false);
        setSearchText('');
      }, 350);
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const availableItems = ALL_ITEMS.filter(
    (item) => !activeItemIds.includes(item.id),
  );

  const filteredItems = searchText.trim()
    ? availableItems.filter((item) =>
        item.title.toLowerCase().includes(searchText.toLowerCase()),
      )
    : availableItems;

  const quickActionItems = filteredItems.filter((i) => i.section === 'quick-action');
  const doorItems = filteredItems.filter((i) => i.section === 'door');

  const handleAdd = async (item: ControlItem) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAdd(item);
    onClose();
  };

  const SMALL_CARD_SIZE = (SCREEN_WIDTH - PADDING * 2 - GAP * 3) / 4;
  const DOOR_CARD_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP) / 2;

  if (!isRendered && !visible) return null;

  return (
    <Modal transparent visible={isRendered || visible} animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { height: SHEET_HEIGHT }, sheetStyle]}>
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search controls"
              placeholderTextColor="#8E8E93"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Quick actions section */}
          {quickActionItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick actions</Text>
              <View style={styles.quickActionGrid}>
                {quickActionItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.smallCard, { width: SMALL_CARD_SIZE, height: SMALL_CARD_SIZE }]}
                    onPress={() => handleAdd(item)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.smallCardIconBg,
                        { backgroundColor: item.iconBg, width: SMALL_CARD_SIZE * 0.5, height: SMALL_CARD_SIZE * 0.5, borderRadius: SMALL_CARD_SIZE * 0.25 },
                      ]}
                    >
                      <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
                    </View>
                    <Text style={[styles.smallCardLabel, { marginTop: 4 }]} numberOfLines={2}>
                      {item.label || item.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Access points section */}
          {doorItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Access points</Text>
              <View style={styles.doorGrid}>
                {doorItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.doorCard, { width: DOOR_CARD_WIDTH }]}
                    onPress={() => handleAdd(item)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.doorIconCircle, { backgroundColor: item.iconBg }]}>
                      <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
                    </View>
                    <View style={styles.doorCardText}>
                      <Text style={styles.doorCardTitle}>{item.title}</Text>
                      {item.subtitle ? (
                        <Text style={styles.doorCardSubtitle}>{item.subtitle}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Activity section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity</Text>
            <View style={styles.listCard}>
              <View style={styles.listItem}>
                <View style={styles.listItemIcon}>
                  <Ionicons name="people-outline" size={16} color="#6B4EFF" />
                </View>
                <View style={styles.listItemText}>
                  <Text style={styles.listItemTitle}>Visitor Passes and Delivery Passes</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
              </View>
            </View>
          </View>

          {filteredItems.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No controls found</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#C7C7CC',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  searchContainer: {
    paddingHorizontal: PADDING,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1E',
    padding: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: PADDING,
    paddingTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  smallCard: {
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    ...cardShadow,
  },
  smallCardIconBg: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallCardLabel: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 14,
  },
  doorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  doorCard: {
    height: 72,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
    ...cardShadow,
  },
  doorIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doorCardText: {
    flex: 1,
  },
  doorCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  doorCardSubtitle: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...cardShadow,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  listItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDE8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemText: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
});
