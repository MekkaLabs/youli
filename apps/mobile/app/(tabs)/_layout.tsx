import React, { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { BottomNav, type TabKey } from '../../src/organisms/BottomNav';
import { CopilotBar } from '../../src/organisms/CopilotBar';
import { colors } from '../../src/theme/tokens';

// Mapeamento tab -> rota expo-router
const tabToHref: Record<TabKey, string> = {
  dashboard: '/(tabs)/dashboard',
  tarefas:   '/(tabs)/tarefas',
  copilot:   '',          // abre modal
  habitos:   '/(tabs)/habitos',
  perfil:    '/(tabs)/perfil',
};

export default function TabsLayout() {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  return (
    <View style={{ flex: 1 }}>
      {/* Expo Router Tabs (oculto visualmente — usamos nosso BottomNav) */}
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="tarefas" />
        <Tabs.Screen name="habitos" />
        <Tabs.Screen name="metas" />
        <Tabs.Screen name="insights" />
        <Tabs.Screen name="perfil" />
        <Tabs.Screen name="financeiro" />
        <Tabs.Screen name="calendario" />
        <Tabs.Screen name="fitness" />
      </Tabs>

      {/* Custom Bottom Nav */}
      <View style={styles.navWrap}>
        <BottomNav
          active={activeTab}
          onPress={(tab) => {
            if (tab === 'copilot') { setCopilotOpen(true); return; }
            setActiveTab(tab);
          }}
        />
      </View>

      {/* Copilot Modal */}
      <Modal visible={copilotOpen} transparent animationType="none" onRequestClose={() => setCopilotOpen(false)}>
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.overlay}>
          <Animated.View entering={SlideInDown.springify()} exiting={SlideOutDown.springify()} style={styles.copilotSheet}>
            <CopilotBar currentSection={activeTab} onClose={() => setCopilotOpen(false)} />
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  navWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  copilotSheet: { margin: 16, marginBottom: 90 },
});
