import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { BottomNav, type TabKey } from '../../src/organisms/BottomNav';
import { CopilotBar } from '../../src/organisms/CopilotBar';
import { useCopilotContext } from '../../src/hooks/useCopilotContext';
import { useProfile, useUI } from '../../src/store';
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

function getCopilotPrefillByTab(tab: TabKey): string {
  const map: Record<TabKey, string> = {
    dashboard: 'Me dê uma visão geral do meu dia com prioridades práticas.',
    habitos: 'Analise meus hábitos e me diga o próximo hábito crítico agora.',
    metas: 'Qual meta devo priorizar hoje e qual próximo passo concreto?',
    tarefas: 'Organize minhas tarefas em ordem de execução para hoje.',
    insights: 'Resuma os principais insights e converta em plano de ação.',
    financeiro: 'Faça uma leitura financeira rápida e sugira 3 ações práticas.',
    calendario: 'Otimize minha agenda de hoje para foco profundo.',
    fitness: 'Com base na energia e treino, qual é a melhor estratégia de hoje?',
    simular: 'Simule os próximos 30 dias e a melhor decisão agora.',
    perfil: 'Analise meu perfil e sugira melhorias de rotina e consistência.',
    focus: 'Entre em modo foco: qual a única tarefa mais importante agora?',
    mais: 'Mostre opções e atalhos úteis para eu avançar agora.',
    copilot: 'Qual deve ser meu foco agora?',
  };
  return map[tab] ?? map.dashboard;
}

export default function TabsLayout() {
  const [copilotOpenLocal, setCopilotOpenLocal] = useState(false);
  const [copilotPrefill, setCopilotPrefill] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);
  const { profile } = useProfile();
  const { ui, openCopilot, closeCopilot } = useUI();
  const userContext = useCopilotContext();
  const copilotOpen = copilotOpenLocal || ui.copilotOpen;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>

      <View style={styles.navWrap}>
        <BottomNav
          active={activeTab}
          onPress={(tab) => {
            if (tab === 'copilot') {
              setCopilotPrefill(getCopilotPrefillByTab(activeTab));
              setCopilotOpenLocal(true);
              openCopilot();
              return;
            }
            const href = tabToHref[tab];
            if (href) router.replace(href as any);
          }}
        />
      </View>

      {copilotOpen && (
        <Modal
          visible={copilotOpen}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setCopilotOpenLocal(false);
            closeCopilot();
          }}
          onDismiss={() => setCopilotPrefill('')}
        >
          <Pressable
            style={styles.overlay}
            onPress={() => {
              setCopilotOpenLocal(false);
              closeCopilot();
            }}
          >
            <Pressable style={styles.copilotSheet} onPress={() => {}}>
              <CopilotBar
                currentSection={activeTab}
                onClose={() => {
                  setCopilotOpenLocal(false);
                  closeCopilot();
                }}
                orchestratorName={profile.orchestratorName}
                userContext={userContext}
                prefillMessage={copilotPrefill}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 },
  overlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.52)', justifyContent: 'flex-end' },
  copilotSheet: {
    height: '84%',
    minHeight: 560,
    width: '100%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
});
