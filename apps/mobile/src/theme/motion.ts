import { Easing, FadeInDown, FadeInRight, FadeInUp, SlideInDown, withSpring } from 'react-native-reanimated';

export const iosSpring = {
  gentle: { damping: 22, stiffness: 210, mass: 0.9 },
  pressIn: { damping: 24, stiffness: 260, mass: 0.7 },
  pressOut: { damping: 28, stiffness: 280, mass: 0.7 },
};

export const iosTiming = {
  fast: 180,
  normal: 240,
  slow: 320,
  easeOut: Easing.out(Easing.cubic),
};

export const motionEnter = {
  cardDown: (delay = 0) => FadeInDown.delay(delay).duration(iosTiming.normal).easing(iosTiming.easeOut),
  cardRight: (delay = 0) => FadeInRight.delay(delay).duration(iosTiming.normal).easing(iosTiming.easeOut),
  headerUp: (delay = 0) => FadeInUp.delay(delay).duration(iosTiming.normal).easing(iosTiming.easeOut),
  sheetUp: () => SlideInDown.duration(iosTiming.slow).easing(iosTiming.easeOut),
};

export const pressScaleIn = (to = 0.96) => withSpring(to, iosSpring.pressIn);
export const pressScaleOut = (to = 1) => withSpring(to, iosSpring.pressOut);
