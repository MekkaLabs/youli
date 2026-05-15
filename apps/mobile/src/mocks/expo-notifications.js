'use strict';
// Mock expo-notifications para web
const noop = async () => {};
const sub = { remove: () => {} };
const Notifications = {
  requestPermissionsAsync: async () => ({ status: 'denied', granted: false }),
  getPermissionsAsync:     async () => ({ status: 'denied', granted: false }),
  scheduleNotificationAsync: async () => 'mock-id',
  cancelScheduledNotificationAsync: noop,
  cancelAllScheduledNotificationsAsync: noop,
  getAllScheduledNotificationsAsync: async () => [],
  setNotificationHandler: () => {},
  addNotificationReceivedListener: () => sub,
  addNotificationResponseReceivedListener: () => sub,
  removeNotificationSubscription: () => {},
  getExpoPushTokenAsync: async () => ({ data: '' }),
  setNotificationChannelAsync: noop,
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
};
module.exports = Notifications;
module.exports.default = Notifications;
