import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ControlItem } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING = 16;
const GAP = 8;
const COLUMN_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP * 2) / 3;

const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

interface SmallCardProps {
  item: ControlItem;
}

function SmallCard({ item }: SmallCardProps) {
  return (
    <View style={styles.smallCardWrapper}>
      <TouchableOpacity
        style={styles.smallCard}
        activeOpacity={0.75}
        onPress={() => {}}
      >
        <View style={[styles.smallCardIconBg, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon as any} size={26} color={item.iconColor} />
        </View>
      </TouchableOpacity>
      {item.label ? (
        <Text style={styles.cardLabel} numberOfLines={2}>
          {item.label}
        </Text>
      ) : null}
    </View>
  );
}

interface WideCardProps {
  item: ControlItem;
}

function WideCard({ item }: WideCardProps) {
  const cardWidth = COLUMN_WIDTH * 2 + GAP;
  return (
    <View style={[styles.wideCardWrapper, { width: cardWidth }]}>
      <TouchableOpacity
        style={[styles.wideCard, { width: cardWidth }]}
        activeOpacity={0.75}
        onPress={() => {}}
      >
        <View style={[styles.wideCardIconBg, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon as any} size={24} color={item.iconColor} />
        </View>
        <View style={styles.wideCardText}>
          <Text style={styles.wideCardTitle}>{item.title}</Text>
          {item.subtitle ? (
            <Text style={styles.wideCardSubtitle}>{item.subtitle}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
      {item.label ? (
        <Text style={styles.cardLabel} numberOfLines={1}>
          {item.label}
        </Text>
      ) : null}
    </View>
  );
}

interface DoorCardProps {
  item: ControlItem;
}

function DoorCard({ item }: DoorCardProps) {
  const [unlocking, setUnlocking] = useState(false);
  const doorWidth = (SCREEN_WIDTH - PADDING * 2 - GAP) / 2;

  const handleLongPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setUnlocking(true);
    setTimeout(() => setUnlocking(false), 1500);
  };

  return (
    <TouchableOpacity
      style={[styles.doorCard, { width: doorWidth }]}
      activeOpacity={0.8}
      onLongPress={handleLongPress}
      delayLongPress={300}
    >
      <View
        style={[
          styles.doorIconCircle,
          { backgroundColor: unlocking ? '#EDE8FF' : item.iconBg },
        ]}
      >
        <Ionicons
          name={item.icon as any}
          size={22}
          color={unlocking ? '#6B4EFF' : item.iconColor}
        />
      </View>
      <View style={styles.doorCardText}>
        <Text style={styles.doorCardTitle}>{item.title}</Text>
        {item.subtitle ? (
          <Text style={styles.doorCardSubtitle}>
            {unlocking ? 'Unlocking...' : item.subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

interface TabBarProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
}

function TabBar({ activeTab, onTabPress }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home', activeIcon: 'home' },
    { id: 'access', label: 'Access', icon: 'key-outline', activeIcon: 'key' },
    { id: 'building', label: 'Building', icon: 'business-outline', activeIcon: 'business' },
    { id: 'account', label: 'Account', icon: 'person-circle-outline', activeIcon: 'person-circle' },
  ];

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || 8 }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={async () => {
              await Haptics.selectionAsync();
              onTabPress(tab.id);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIconWrapper, isActive && styles.tabIconWrapperActive]}>
              <Ionicons
                name={(isActive ? tab.activeIcon : tab.icon) as any}
                size={24}
                color={isActive ? '#6B4EFF' : '#8E8E93'}
              />
            </View>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface HomeScreenProps {
  items: ControlItem[];
  onEditPress: () => void;
}

export default function HomeScreen({ items, onEditPress }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('home');

  const quickActions = items.filter((i) => i.section === 'quick-action');
  const doorItems = items.filter((i) => i.section === 'door');

  // Build rows for quick actions: small=1col, wide=2col
  const renderQuickActionRows = () => {
    const rows: ControlItem[][] = [];
    let currentRow: ControlItem[] = [];
    let currentCols = 0;

    for (const item of quickActions) {
      const itemCols = item.size === 'wide' ? 2 : 1;
      if (currentCols + itemCols > 3) {
        if (currentRow.length > 0) rows.push(currentRow);
        currentRow = [item];
        currentCols = itemCols;
      } else {
        currentRow.push(item);
        currentCols += itemCols;
      }
    }
    if (currentRow.length > 0) rows.push(currentRow);
    return rows;
  };

  const quickActionRows = renderQuickActionRows();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 8, paddingBottom: 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.propertyPill} activeOpacity={0.8}>
            <Text style={styles.propertyText} numberOfLines={1}>
              Unit 1 - The residences at 200 Elm
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bellButton} activeOpacity={0.7}>
            <Ionicons name="notifications" size={20} color="#1C1C1E" />
          </TouchableOpacity>
        </View>

        {/* Welcome section */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeRow}>
            <Text style={styles.welcomeTitle}>Welcome home.</Text>
            <TouchableOpacity onPress={onEditPress} activeOpacity={0.7}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.welcomeSubtitle}>Customize the controls your way</Text>
        </View>

        {/* Quick actions */}
        {quickActionRows.length > 0 && (
          <View style={styles.section}>
            {quickActionRows.map((row, rowIdx) => {
              let colOffset = 0;
              return (
                <View key={rowIdx} style={styles.quickActionRow}>
                  {row.map((item) => {
                    const el =
                      item.size === 'wide' ? (
                        <WideCard key={item.id} item={item} />
                      ) : (
                        <SmallCard key={item.id} item={item} />
                      );
                    return el;
                  })}
                </View>
              );
            })}
          </View>
        )}

        {/* Door cards */}
        {doorItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.doorGrid}>
              {doorItems.map((item) => (
                <DoorCard key={item.id} item={item} />
              ))}
            </View>
          </View>
        )}

        {/* Visitor Passes section */}
        {doorItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Visitor Passes and Delivery Passes</Text>
            <View style={styles.listCard}>
              <View style={styles.listItem}>
                <View style={styles.listItemIcon}>
                  <Ionicons name="people-outline" size={18} color="#6B4EFF" />
                </View>
                <View style={styles.listItemText}>
                  <Text style={styles.listItemTitle}>Mom and Dad</Text>
                  <Text style={styles.listItemSubtitle}>4:00 PM Today</Text>
                </View>
              </View>
              <View style={styles.listDivider} />
              <View style={styles.listItem}>
                <View style={styles.listItemIcon}>
                  <Ionicons name="paw-outline" size={18} color="#6B4EFF" />
                </View>
                <View style={styles.listItemText}>
                  <Text style={styles.listItemTitle}>Dog walker</Text>
                  <Text style={styles.listItemSubtitle}>2:00 PM Today</Text>
                </View>
              </View>
              <View style={styles.listDivider} />
              <View style={styles.listItem}>
                <View style={styles.listItemIcon}>
                  <Ionicons name="business-outline" size={18} color="#6B4EFF" />
                </View>
                <View style={styles.listItemText}>
                  <Text style={styles.listItemTitle}>Service Entrance</Text>
                  <Text style={styles.listItemSubtitle}>3:00 PM Today</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <TabBar activeTab={activeTab} onTabPress={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: PADDING,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  propertyPill: {
    flex: 1,
    backgroundColor: '#E5E5EA',
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  propertyText: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeSection: {
    marginBottom: 20,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  editButton: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B4EFF',
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: GAP,
    marginBottom: GAP,
  },
  // Small card
  smallCardWrapper: {
    width: COLUMN_WIDTH,
    alignItems: 'center',
  },
  smallCard: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH,
    borderRadius: COLUMN_WIDTH / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  smallCardIconBg: {
    width: COLUMN_WIDTH * 0.55,
    height: COLUMN_WIDTH * 0.55,
    borderRadius: (COLUMN_WIDTH * 0.55) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Wide card
  wideCardWrapper: {
    alignItems: 'center',
  },
  wideCard: {
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  wideCardSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 1,
  },
  cardLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  // Door cards
  doorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  doorCard: {
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
  // List card
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemText: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  listItemSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 1,
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 64,
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabIconWrapper: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapperActive: {
    backgroundColor: '#EEEBFF',
  },
  tabLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#6B4EFF',
  },
});
