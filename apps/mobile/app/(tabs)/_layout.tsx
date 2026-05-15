import React, { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { BottomNav, type TabKey } from '../../src/organisms/BottomNav';
import { CopilotBar } from '../../src/organisms/CopilotBar';
import { useCopilotContext } from '../../src/hooks/useCopilotContext';
import { useProfile } from '../../src/store';
import { colors } from '../../src/theme/tokens';

const tabToHref: Record<string, string> = {
  dashboard:  '/(tabs)/dashboard',
  habitos:    '/(tabs)/habitos',
  metas:      '/(tabs)/metas',
  tarefas:    '/(tabs)/tarefas',
  insights:   '/(tabs)/insights',
  financeiro: '/(tabs)/financeiro',
  calendario: '/(tabs)/calendario',
  fitness:    '/(tabs)/fitness',
  simular:    '/(tabs)/simular',
  perfil:     '/(tabs)/perfil',
  focus:      '/(tabs)/focus',
};

function getActiveTab(pathname: string): TabKey {
  if (pathname.includes('habitos'))    return 'habitos';
  if (pathname.includes('metas'))      return 'metas';
  if (pathname.includes('tarefas'))    return 'tarefas';
  if (pathname.includes('insights'))   return 'insights';
  if (pathname.includes('financeiro')) return 'financeiro';
  if (pathname.includes('calendario')) return 'calendario';
  if (pathname.includes('fitness'))    return 'fitness';
  if (pathname.includes('simular'))    return 'simular';
  if (pathname.includes('perfil'))     return 'perfil';
  if (pathname.includes('focus'))      return 'focus';
  return 'dashboard';
}

export default function TabsLayout() {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);
  const { profile } = useProfile();
  const userContext = useCopilotContext();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>

      <View style={styles.navWrap}>
        <BottomNav
          active={activeTab}
          onPress={(tab) => {
            if (tab === 'copilot') { setCopilotOpen(true); return; }
            const href = tabToHref[tab];
            if (href) router.replace(href as any);
          }}
        />
      </View>

      <Modal visible={copilotOpen} transparent animationType="slide" onRequestClose={() => setCopilotOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.copilotSheet}>
            <CopilotBar
              currentSection={activeTab}
              onClose={() => setCopilotOpen(false)}
              orchestratorName={profile.orchestratorName}
              userContext={userContext}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  navWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  copilotSheet: { margin: 16, marginBottom: 90 },
});
