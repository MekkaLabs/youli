'use strict';
// Mock AsyncStorage para web usando localStorage
const store = {};
const AsyncStorage = {
  getItem:    async (k) => { try { return localStorage.getItem(k); } catch { return store[k] ?? null; } },
  setItem:    async (k, v) => { try { localStorage.setItem(k, v); } catch { store[k] = v; } },
  removeItem: async (k) => { try { localStorage.removeItem(k); } catch { delete store[k]; } },
  multiGet:   async (keys) => keys.map(k => { try { return [k, localStorage.getItem(k)]; } catch { return [k, store[k] ?? null]; } }),
  multiSet:   async (pairs) => pairs.forEach(([k, v]) => { try { localStorage.setItem(k, v); } catch { store[k] = v; } }),
  multiRemove:async (keys) => keys.forEach(k => { try { localStorage.removeItem(k); } catch { delete store[k]; } }),
  clear:      async () => { try { localStorage.clear(); } catch { Object.keys(store).forEach(k => delete store[k]); } },
  getAllKeys:  async () => { try { return Object.keys(localStorage); } catch { return Object.keys(store); } },
  mergeItem:  async (k, v) => { const cur = await AsyncStorage.getItem(k); await AsyncStorage.setItem(k, JSON.stringify({...JSON.parse(cur||'{}'),...JSON.parse(v)})); },
};
module.exports = AsyncStorage;
module.exports.default = AsyncStorage;
