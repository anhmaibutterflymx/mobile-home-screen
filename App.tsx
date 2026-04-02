import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ControlItem } from './src/types';
import { DEFAULT_ITEMS } from './src/data';
import HomeScreen from './src/HomeScreen';
import CustomizeScreen from './src/CustomizeScreen';
import AddControlSheet from './src/AddControlSheet';

export default function App() {
  const [activeItems, setActiveItems] = useState<ControlItem[]>(DEFAULT_ITEMS);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showAddControl, setShowAddControl] = useState(false);

  const removeItem = (id: string) => {
    setActiveItems((prev) => prev.filter((i) => i.id !== id));
  };

  const addItem = (item: ControlItem) => {
    setActiveItems((prev) => [...prev, item]);
  };

  const reorderItems = (newItems: ControlItem[]) => {
    setActiveItems(newItems);
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
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
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
