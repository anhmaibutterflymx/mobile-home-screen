import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ControlItem } from './types';

// On web we're inside a 393px phone frame; on native use the real screen width
const PHONE_W = 393;
const PADDING = 16;
const GAP = 8;
const CONTENT_W = PHONE_W - PADDING * 2; // 361
const COL_W = (CONTENT_W - GAP * 2) / 3;  // 115
const DOOR_W = (CONTENT_W - GAP) / 2;      // 176.5

const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

function SmallCard({ item }: { item: ControlItem }) {
  return (
    <View style={styles.smallWrapper}>
      <TouchableOpacity style={styles.smallCard} activeOpacity={0.75}>
        <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon as any} size={24} color={item.iconColor} />
        </View>
      </TouchableOpacity>
      {item.label ? <Text style={styles.cardLabel} numberOfLines={2}>{item.label}</Text> : null}
    </View>
  );
}

function WideCard({ item }: { item: ControlItem }) {
  const w = COL_W * 2 + GAP;
  return (
    <View style={[styles.wideWrapper, { width: w }]}>
      <TouchableOpacity style={[styles.wideCard, { width: w }]} activeOpacity={0.75}>
        <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.wideTitle}>{item.title}</Text>
          {item.subtitle ? <Text style={styles.wideSub}>{item.subtitle}</Text> : null}
        </View>
      </TouchableOpacity>
      {item.label ? <Text style={styles.cardLabel} numberOfLines={1}>{item.label}</Text> : null}
    </View>
  );
}

function DoorCard({ item }: { item: ControlItem }) {
  const [unlocking, setUnlocking] = useState(false);

  const handleLongPress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    setUnlocking(true);
    setTimeout(() => setUnlocking(false), 1500);
  };

  return (
    <TouchableOpacity
      style={[styles.doorCard, { width: DOOR_W }]}
      activeOpacity={0.8}
      onLongPress={handleLongPress}
      delayLongPress={300}
    >
      <View style={[styles.doorIconCircle, { backgroundColor: unlocking ? '#EDE8FF' : item.iconBg }]}>
        <Ionicons name={item.icon as any} size={20} color={unlocking ? '#6B4EFF' : item.iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.doorTitle}>{item.title}</Text>
        {item.subtitle
          ? <Text style={styles.doorSub}>{unlocking ? 'Unlocking…' : item.subtitle}</Text>
          : null}
      </View>
    </TouchableOpacity>
  );
}

function TabBar({ activeTab, onTabPress }: { activeTab: string; onTabPress: (t: string) => void }) {
  const insets = useSafeAreaInsets();
  const tabs = [
    { id: 'home',     label: 'Home',     icon: 'home-outline',           activeIcon: 'home' },
    { id: 'access',   label: 'Access',   icon: 'key-outline',            activeIcon: 'key' },
    { id: 'building', label: 'Building', icon: 'business-outline',       activeIcon: 'business' },
    { id: 'account',  label: 'Account',  icon: 'person-circle-outline',  activeIcon: 'person-circle' },
  ];
  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || 8 }]}>
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              onTabPress(tab.id);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIconWrap, active && styles.tabIconActive]}>
              <Ionicons name={(active ? tab.activeIcon : tab.icon) as any} size={23} color={active ? '#6B4EFF' : '#8E8E93'} />
            </View>
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function HomeScreen({ items, onEditPress }: { items: ControlItem[]; onEditPress: () => void }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('home');

  const quickActions = items.filter((i) => i.section === 'quick-action');
  const doorItems    = items.filter((i) => i.section === 'door');

  // Pack quick actions into 3-column rows (small=1col, wide=2col)
  const qaRows: ControlItem[][] = [];
  let row: ControlItem[] = [];
  let cols = 0;
  for (const item of quickActions) {
    const c = item.size === 'wide' ? 2 : 1;
    if (cols + c > 3) { qaRows.push(row); row = [item]; cols = c; }
    else               { row.push(item); cols += c; }
  }
  if (row.length) qaRows.push(row);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.propertyPill} activeOpacity={0.8}>
            <Text style={styles.propertyText} numberOfLines={1}>Unit 1 - The residences at 200 Elm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
            <Ionicons name="notifications" size={18} color="#1C1C1E" />
          </TouchableOpacity>
        </View>

        {/* Welcome */}
        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeTitle}>Welcome home.</Text>
          <TouchableOpacity onPress={onEditPress} activeOpacity={0.7}>
            <Text style={styles.editBtn}>Edit</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.welcomeSub}>Customize the controls your way</Text>

        {/* Quick actions */}
        {qaRows.length > 0 && (
          <View style={styles.section}>
            {qaRows.map((r, ri) => (
              <View key={ri} style={styles.qaRow}>
                {r.map((item) =>
                  item.size === 'wide'
                    ? <WideCard key={item.id} item={item} />
                    : <SmallCard key={item.id} item={item} />
                )}
              </View>
            ))}
          </View>
        )}

        {/* Door cards */}
        {doorItems.length > 0 && (
          <View style={[styles.section, styles.doorGrid]}>
            {doorItems.map((item) => <DoorCard key={item.id} item={item} />)}
          </View>
        )}

        {/* Visitor passes */}
        {doorItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Visitor Passes and Delivery Passes</Text>
            <View style={styles.listCard}>
              {[
                { icon: 'people-outline', label: 'Mom and Dad',       sub: '4:00 PM Today' },
                { icon: 'paw-outline',    label: 'Dog walker',        sub: '2:00 PM Today' },
                { icon: 'business-outline', label: 'Service Entrance', sub: '3:00 PM Today' },
              ].map((row, i, arr) => (
                <React.Fragment key={row.label}>
                  <View style={styles.listItem}>
                    <View style={styles.listIconWrap}>
                      <Ionicons name={row.icon as any} size={16} color="#6B4EFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listTitle}>{row.label}</Text>
                      <Text style={styles.listSub}>{row.sub}</Text>
                    </View>
                  </View>
                  {i < arr.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <TabBar activeTab={activeTab} onTabPress={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content:   { paddingHorizontal: PADDING, paddingBottom: 24 },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  propertyPill: {
    flex: 1,
    backgroundColor: '#E5E5EA',
    borderRadius: 100,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  propertyText: { fontSize: 14, color: '#1C1C1E', fontWeight: '500' },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center',
  },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  welcomeTitle: { fontSize: 26, fontWeight: '700', color: '#1C1C1E' },
  editBtn:      { fontSize: 16, fontWeight: '500', color: '#6B4EFF' },
  welcomeSub:   { fontSize: 13, color: '#8E8E93', marginBottom: 20 },
  section:      { marginBottom: 12 },
  qaRow:        { flexDirection: 'row', gap: GAP, marginBottom: GAP, alignItems: 'flex-start' },
  // Small card
  smallWrapper: { width: COL_W, alignItems: 'center' },
  smallCard: {
    width: COL_W, height: COL_W,
    borderRadius: COL_W / 2,
    backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    ...cardShadow,
  },
  iconCircle: {
    width: COL_W * 0.5, height: COL_W * 0.5,
    borderRadius: COL_W * 0.25,
    alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { fontSize: 11, color: '#8E8E93', textAlign: 'center', marginTop: 5, lineHeight: 15 },
  // Wide card
  wideWrapper: { alignItems: 'center' },
  wideCard: {
    height: COL_W,
    borderRadius: COL_W / 2,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    ...cardShadow,
  },
  wideTitle: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  wideSub:   { fontSize: 12, color: '#8E8E93', marginTop: 1 },
  // Door card
  doorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  doorCard: {
    height: 74,
    borderRadius: 16,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
    ...cardShadow,
  },
  doorIconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  doorTitle: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  doorSub:   { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  // List card
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 },
  listCard: { backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden', ...cardShadow },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, gap: 12 },
  listIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EDE8FF', alignItems: 'center', justifyContent: 'center' },
  listTitle: { fontSize: 14, fontWeight: '500', color: '#1C1C1E' },
  listSub:   { fontSize: 12, color: '#8E8E93', marginTop: 1 },
  divider:   { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E5EA', marginLeft: 58 },
  // Tab bar
  tabBar:        { flexDirection: 'row', backgroundColor: '#FFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E5EA', paddingTop: 8, paddingHorizontal: 8 },
  tabItem:       { flex: 1, alignItems: 'center' },
  tabIconWrap:   { width: 48, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tabIconActive: { backgroundColor: '#EEEBFF' },
  tabLabel:      { fontSize: 10, color: '#8E8E93', marginTop: 2, fontWeight: '500' },
  tabLabelActive:{ color: '#6B4EFF' },
});
