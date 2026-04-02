import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { ControlItem } from './src/types';
import { DEFAULT_ITEMS } from './src/data';
import HomeScreen from './src/HomeScreen';
import CustomizeScreen from './src/CustomizeScreen';
import AddControlSheet from './src/AddControlSheet';

const PHONE_W = 393;
const PHONE_H = 852;
const CORNER_RADIUS = 52;

// Fake iOS insets so useSafeAreaInsets() works correctly inside the phone frame
const WEB_INSETS = {
  frame: { x: 0, y: 0, width: PHONE_W, height: PHONE_H },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

function WebStatusBar() {
  return (
    <View style={webStyles.statusBar} pointerEvents="none">
      <Text style={webStyles.time}>9:41</Text>
      <View style={webStyles.statusRight}>
        <Ionicons name="cellular" size={14} color="#1C1C1E" />
        <Ionicons name="wifi" size={14} color="#1C1C1E" />
        <Ionicons name="battery-full" size={16} color="#1C1C1E" />
      </View>
    </View>
  );
}

export default function App() {
  const [activeItems, setActiveItems] = useState<ControlItem[]>(DEFAULT_ITEMS);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showAddControl, setShowAddControl] = useState(false);

  const removeItem = (id: string) =>
    setActiveItems((prev) => prev.filter((i) => i.id !== id));

  const addItem = (item: ControlItem) =>
    setActiveItems((prev) => [...prev, item]);

  const reorderItems = (newItems: ControlItem[]) => setActiveItems(newItems);

  const appContent = (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={Platform.OS === 'web' ? WEB_INSETS : undefined}>
        <StatusBar style="dark" />
        <HomeScreen
          items={activeItems}
          onEditPress={() => setShowCustomize(true)}
        />
        <CustomizeScreen
          visible={showCustomize}
          items={activeItems}
          onClose={() => setShowCustomize(false)}
          onRemove={removeItem}
          onReorder={reorderItems}
          onAddPress={() => setShowAddControl(true)}
        />
        <AddControlSheet
          visible={showAddControl}
          activeItemIds={activeItems.map((i) => i.id)}
          onAdd={addItem}
          onClose={() => setShowAddControl(false)}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  if (Platform.OS !== 'web') {
    return appContent;
  }

  return (
    <View style={webStyles.bg}>
      <View style={webStyles.phoneOuter}>
        {/* Dynamic Island */}
        <View style={webStyles.dynamicIsland} pointerEvents="none" />
        {/* Fake status bar */}
        <WebStatusBar />
        {/* Home indicator */}
        <View style={webStyles.homeIndicator} pointerEvents="none" />
        {/* App content */}
        <View style={webStyles.phoneScreen}>
          {appContent}
        </View>
      </View>
      <Text style={webStyles.hint}>← scroll inside the phone</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

const webStyles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore web
    minHeight: '100vh',
    gap: 16,
  },
  phoneOuter: {
    width: PHONE_W,
    height: PHONE_H,
    borderRadius: CORNER_RADIUS,
    backgroundColor: '#F2F2F7',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 40 },
    shadowOpacity: 0.8,
    shadowRadius: 60,
    elevation: 30,
    position: 'relative',
  },
  dynamicIsland: {
    position: 'absolute',
    top: 11,
    left: (PHONE_W - 120) / 2,
    width: 120,
    height: 34,
    backgroundColor: '#000',
    borderRadius: 20,
    zIndex: 9999,
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 59,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 10,
    zIndex: 9998,
    pointerEvents: 'none' as any,
  },
  time: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 8,
    left: (PHONE_W - 134) / 2,
    width: 134,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#1C1C1E',
    opacity: 0.2,
    zIndex: 9999,
  },
  phoneScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRadius: CORNER_RADIUS,
  },
  hint: {
    color: '#475569',
    fontSize: 13,
  },
});
