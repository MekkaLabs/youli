# Mobile UI Standards — Youli

## Atomic Design Structure
```
src/
  atoms/       → smallest: Button, Text, Badge, Icon, Skeleton
  molecules/   → compositions: TaskCard, HabitCard, GoalProgress
  organisms/   → sections: BottomNav, CopilotBar, DashboardHero
  templates/   → layouts: FullScrollLayout, TabLayout
```

## Design Tokens — ALWAYS import from `../../src/theme/tokens`
```ts
import { colors, spacing, radii, fontSize, fontWeight, shadows } from '../../src/theme/tokens';
// or
import { tokens } from '../../src/theme/tokens';
```

### Key color aliases
- Background: `colors.background` (#030712 dark)
- Surface/Card: `colors.surface` (#111827)
- Primary: `colors.primary` (#0d3b2e)
- Text: `colors.text` / `colors.textMuted`
- Success/Warning/Danger: `colors.success` / `colors.warning` / `colors.danger`

## Component Rules
- All components: TypeScript + React Native StyleSheet
- No inline styles — always use StyleSheet.create()
- Safe area: wrap screens with `useSafeAreaInsets()` from `react-native-safe-area-context`
- Animations: `react-native-reanimated` (Animated + useSharedValue/useAnimatedStyle)
- Icons: `@expo/vector-icons` (Ionicons, MaterialIcons)

## Navigation
- expo-router 6, file-based routing in `app/(tabs)/`
- Navigate: `router.push('/(tabs)/dashboard')` — never use `navigation.navigate()`
- Active tab: inferred via `usePathname()` in `_layout.tsx`
- Tabs registered in `app/(tabs)/_layout.tsx`: dashboard, tarefas, habitos, metas, insights, perfil, financeiro, calendario, fitness, simular

## State Management
- Global store: Zustand via `src/store/index.ts` (`useProfile`, `useHabits`, `useTasks`, etc.)
- Local: useState / useReducer
- No Redux, no Context for global state (use Zustand)
