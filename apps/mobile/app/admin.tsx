/**
 * Admin Panel — Youli
 * Visível apenas para usuários com role=admin
 * Gerencia usuários, visualiza resumo de cada conta
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthContext } from '../src/hooks/useAuth';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3002';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string | null;
  createdAt: string;
}

function buildAuthHeader(token: string | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export default function AdminPanel() {
  const insets = useSafeAreaInsets();
  const { user, token, isAdmin, logout } = useAuthContext();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'user'>('user');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Redireciona se não for admin
  useEffect(() => {
    if (user && !isAdmin) {
      router.replace('/(tabs)/dashboard' as any);
    }
  }, [user, isAdmin]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: buildAuthHeader(token),
      });
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
    } catch {
      // silencioso
    } finally {
      setLoadingUsers(false);
    }
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = useCallback(() => {
    setFormName(''); setFormEmail(''); setFormPassword(''); setFormRole('user'); setFormError('');
    setEditingUser(null);
    setShowCreateModal(true);
  }, []);

  const openEdit = useCallback((u: AdminUser) => {
    setFormName(u.name); setFormEmail(u.email); setFormPassword(''); setFormRole(u.role); setFormError('');
    setEditingUser(u);
    setShowCreateModal(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formName.trim() || !formEmail.trim()) { setFormError('Nome e email são obrigatórios.'); return; }
    if (!editingUser && !formPassword.trim()) { setFormError('Senha é obrigatória para novo usuário.'); return; }
    if (formPassword.trim() && formPassword.trim().length < 6) {
      setFormError('Senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail.trim())) {
      setFormError('Email inválido.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      if (editingUser) {
        // PATCH
        const body: any = { name: formName.trim(), email: formEmail.trim(), role: formRole };
        if (formPassword.trim()) body.password = formPassword.trim();

        const res = await fetch(`${API_BASE}/api/admin/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: buildAuthHeader(token),
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { setFormError(data.error || 'Erro ao salvar.'); return; }
      } else {
        // POST
        const res = await fetch(`${API_BASE}/api/admin/users`, {
          method: 'POST',
          headers: buildAuthHeader(token),
          body: JSON.stringify({ name: formName.trim(), email: formEmail.trim(), password: formPassword.trim(), role: formRole }),
        });
        const data = await res.json();
        if (!res.ok) { setFormError(data.error || 'Erro ao criar usuário.'); return; }
      }

      setShowCreateModal(false);
      fetchUsers();
    } catch {
      setFormError('Erro de conexão.');
    } finally {
      setFormLoading(false);
    }
  }, [editingUser, formName, formEmail, formPassword, formRole, token, fetchUsers]);

  const handleDelete = useCallback((u: AdminUser) => {
    if (u.id === user?.id) { Alert.alert('Erro', 'Você não pode deletar seu próprio usuário.'); return; }
    Alert.alert(
      'Remover usuário',
      `Tem certeza que deseja remover "${u.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover', style: 'destructive',
          onPress: async () => {
            const res = await fetch(`${API_BASE}/api/admin/users/${u.id}`, {
              method: 'DELETE',
              headers: buildAuthHeader(token),
            });
            if (res.ok) fetchUsers();
          },
        },
      ]
    );
  }, [user, token, fetchUsers]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/login' as any);
  }, [logout]);

  const renderUser = useCallback(({ item }: { item: AdminUser }) => (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        <Text style={styles.userInitial}>{item.name[0]?.toUpperCase()}</Text>
      </View>
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.userName}>{item.name}</Text>
          <View style={[styles.roleBadge, item.role === 'admin' ? styles.roleBadgeAdmin : styles.roleBadgeUser]}>
            <Text style={styles.roleText}>{item.role === 'admin' ? '👑 Admin' : '👤 User'}</Text>
          </View>
        </View>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userDate}>Criado em {new Date(item.createdAt).toLocaleDateString('pt-BR')}</Text>
      </View>
      <View style={styles.userActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
          <Text style={styles.editBtnText}>✏️</Text>
        </TouchableOpacity>
        {item.id !== user?.id && (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Text style={styles.deleteBtnText}>🗑</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  ), [user, openEdit, handleDelete]);

  if (!isAdmin) return null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Painel Admin</Text>
          <Text style={styles.headerSub}>👑 {user?.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>USUÁRIOS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{users.filter(u => u.role === 'admin').length}</Text>
          <Text style={styles.statLabel}>ADMINS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{users.filter(u => u.role === 'user').length}</Text>
          <Text style={styles.statLabel}>USUÁRIOS</Text>
        </View>
      </View>

      {/* Lista */}
      {loadingUsers ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#7C3AED" size="large" />
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Nenhum usuário cadastrado.</Text>
            </View>
          }
        />
      )}

      {/* FAB — Adicionar usuário */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={openCreate}
        accessibilityLabel="Adicionar usuário"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Modal criar/editar */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingUser ? `Editar: ${editingUser.name}` : 'Novo Usuário'}
              </Text>

              <Text style={styles.fieldLabel}>NOME</Text>
              <TextInput
                style={styles.fieldInput}
                value={formName}
                onChangeText={setFormName}
                placeholder="Nome completo"
                placeholderTextColor="#4B5563"
                autoCapitalize="words"
              />

              <Text style={styles.fieldLabel}>EMAIL</Text>
              <TextInput
                style={styles.fieldInput}
                value={formEmail}
                onChangeText={setFormEmail}
                placeholder="email@exemplo.com"
                placeholderTextColor="#4B5563"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>
                SENHA {editingUser ? '(deixe em branco para manter)' : ''}
              </Text>
              <TextInput
                style={styles.fieldInput}
                value={formPassword}
                onChangeText={setFormPassword}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#4B5563"
                secureTextEntry
              />

              <Text style={styles.fieldLabel}>PERFIL</Text>
              <View style={styles.roleRow}>
                {(['user', 'admin'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleOption, formRole === r && styles.roleOptionSelected]}
                    onPress={() => setFormRole(r)}
                  >
                    <Text style={[styles.roleOptionText, formRole === r && styles.roleOptionTextSelected]}>
                      {r === 'admin' ? '👑 Admin' : '👤 Usuário'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {formError ? (
                <View style={styles.formError}>
                  <Text style={styles.formErrorText}>⚠️ {formError}</Text>
                </View>
              ) : null}

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, formLoading && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={formLoading}
                >
                  {formLoading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>{editingUser ? 'Salvar' : 'Criar'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080812' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1F2937',
  },
  backBtn: { padding: 8, marginRight: 4 },
  backIcon: { fontSize: 20, color: '#fff' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 11, color: '#7C3AED', fontWeight: '600', marginTop: 1 },
  logoutBtn: { padding: 8, backgroundColor: '#1A0D0D', borderRadius: 8, borderWidth: 1, borderColor: '#F87171' },
  logoutText: { color: '#F87171', fontSize: 12, fontWeight: '700' },

  statsBar: {
    flexDirection: 'row', backgroundColor: '#0D0D1A',
    marginHorizontal: 16, marginTop: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#1F2937', padding: 16,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: '900', color: '#7C3AED' },
  statLabel: { fontSize: 9, color: '#6B7280', fontWeight: '700', letterSpacing: 1 },
  statDivider: { width: 1, backgroundColor: '#1F2937', marginHorizontal: 8 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  emptyWrap: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#4B5563', fontSize: 14 },

  userCard: {
    backgroundColor: '#0D0D1A', borderRadius: 14,
    borderWidth: 1, borderColor: '#1F2937',
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
  },
  userInitial: { fontSize: 18, fontWeight: '800', color: '#fff' },
  userInfo: { flex: 1, gap: 2 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleBadgeAdmin: { backgroundColor: '#3B0764' },
  roleBadgeUser: { backgroundColor: '#1F2937' },
  roleText: { fontSize: 10, fontWeight: '700', color: '#C4B5FD' },
  userEmail: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  userDate: { fontSize: 10, color: '#374151' },
  userActions: { flexDirection: 'row', gap: 8 },
  editBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontSize: 16 },
  deleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1A0D0D', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 16 },

  fab: {
    position: 'absolute', right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 10,
  },
  fabIcon: { fontSize: 28, color: '#fff', fontWeight: '300', marginTop: -2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#0D0D1A', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: '#1F2937', padding: 24, maxHeight: '85%',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 20 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280', letterSpacing: 1.2, marginBottom: 6, marginTop: 12 },
  fieldInput: {
    backgroundColor: '#111827', borderRadius: 12,
    borderWidth: 1, borderColor: '#1F2937',
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: '#fff',
  },
  roleRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  roleOption: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937',
    alignItems: 'center',
  },
  roleOptionSelected: { backgroundColor: '#3B0764', borderColor: '#7C3AED' },
  roleOptionText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  roleOptionTextSelected: { color: '#C4B5FD' },
  formError: {
    backgroundColor: '#1A0D0D', borderRadius: 10,
    borderWidth: 1, borderColor: '#F87171',
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 12,
  },
  formErrorText: { color: '#FCA5A5', fontSize: 13, fontWeight: '600' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20, paddingBottom: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#1F2937', alignItems: 'center',
  },
  cancelBtnText: { color: '#9CA3AF', fontSize: 15, fontWeight: '700' },
  saveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#7C3AED', alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
