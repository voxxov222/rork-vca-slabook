import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { makeStyles, useTheme } from '@/src/theme';
import { api } from '@/src/lib/api';
import { money } from '@/src/lib/format';
import { useAuth } from '@/src/context/AuthContext';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Avatar, Surface, Button, GradeBadge, EmptyState } from '@/src/components/ui';
import { Icon } from '@/src/components/Icon';
import { useToast } from '@/src/components/Toast';

export default function Profile() {
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const { user, logout, setUser } = useAuth();

  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');

  const statsQ = useQuery({ queryKey: ['stats'], queryFn: () => api.get<any>('/dashboard/stats') });
  const subsQ = useQuery({ queryKey: ['submissions'], queryFn: () => api.get<any[]>('/submissions') });
  const certsQ = useQuery({ queryKey: ['certs'], queryFn: () => api.get<any[]>('/certifications') });

  const saveBio = useMutation({
    mutationFn: () => api.put<any>('/auth/profile', { bio }),
    onSuccess: (u) => {
      setUser(u);
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['feed'] });
      toast.show('Profile updated', 'success');
    },
  });

  return (
    <View style={s.root}>
      <LinearGradient colors={[colors.heroStart, colors.heroEnd]} style={s.cover} />
      <ScreenHeader transparent right={<Pressable onPress={logout} testID="logout-btn"><Icon name="logout" size={22} color="#fff" /></Pressable>} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <View style={s.head}>
          <View style={s.avatarRing}>
            <Avatar uri={user?.picture} name={user?.name} size={88} />
          </View>
          <Text style={s.name}>{user?.name}</Text>
          <View style={s.badgeRow}>
            <View style={s.typeBadge}>
              <Icon name="account-star" size={13} color={colors.primary} />
              <Text style={s.typeBadgeText}>{user?.profile_type || 'Collector'}</Text>
            </View>
            {user?.role === 'admin' && (
              <View style={[s.typeBadge, { backgroundColor: colors.accentSoft }]}>
                <Icon name="shield-crown" size={13} color={colors.accent} />
                <Text style={[s.typeBadgeText, { color: colors.accent }]}>Admin</Text>
              </View>
            )}
          </View>
          <Text style={s.email}>{user?.email}</Text>

          {editing ? (
            <View style={{ width: '100%', marginTop: 12 }}>
              <TextInput
                style={s.bioInput}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell the community about your collection…"
                placeholderTextColor={colors.textMuted}
                multiline
                testID="bio-input"
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button label="Cancel" variant="outline" onPress={() => setEditing(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="Save" variant="primary" loading={saveBio.isPending} onPress={() => saveBio.mutate()} testID="bio-save" />
                </View>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => { setBio(user?.bio || ''); setEditing(true); }} style={s.bioPress} testID="edit-bio">
              <Text style={s.bioText}>{user?.bio || 'Add a bio'}</Text>
              <Icon name="pencil" size={14} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <View style={s.statsRow}>
          <Stat label="Cards" value={String(statsQ.data?.total_cards ?? 0)} />
          <Stat label="Certified" value={String(statsQ.data?.certified_count ?? 0)} />
          <Stat label="Value" value={money(statsQ.data?.total_value)} />
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text style={s.sectionTitle}>My Submissions</Text>
          {subsQ.data && subsQ.data.length ? (
            <View style={{ gap: 10 }}>
              {subsQ.data.map((sub) => (
                <Surface key={sub.id} style={s.subRow}>
                  <View style={s.subIcon}>
                    <Icon name="package-variant-closed" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.subId}>{sub.id}</Text>
                    <Text style={s.subMeta}>{sub.tier} · {sub.cards.length} cards · {money(sub.total)}</Text>
                  </View>
                  <View style={s.statusChip}>
                    <Text style={s.statusText}>{sub.status}</Text>
                  </View>
                </Surface>
              ))}
            </View>
          ) : (
            <Surface style={{ paddingVertical: 4 }}>
              <EmptyState icon="package-variant" title="No submissions yet" subtitle="Submit cards for grading from the Home tab." />
            </Surface>
          )}
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text style={s.sectionTitle}>My Certified Slabs</Text>
          {certsQ.data && certsQ.data.length ? (
            <View style={{ gap: 10 }}>
              {certsQ.data.map((c) => (
                <Pressable key={c.cert_number} onPress={() => router.push(`/slab/${c.cert_number}`)}>
                  <Surface style={s.subRow}>
                    <GradeBadge grade={c.grade} size="sm" />
                    <View style={{ flex: 1 }}>
                      <Text style={s.subId}>{c.card?.name}</Text>
                      <Text style={s.subMeta}>{c.cert_number}</Text>
                    </View>
                    <Icon name="chevron-right" size={20} color={colors.textMuted} />
                  </Surface>
                </Pressable>
              ))}
            </View>
          ) : (
            <Surface style={{ paddingVertical: 4 }}>
              <EmptyState icon="star-four-points-outline" title="No certified slabs" subtitle="Certify a card in your vault." />
            </Surface>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const s = useStyles();
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  cover: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  head: { alignItems: 'center', paddingHorizontal: 16, marginTop: 4 },
  avatarRing: { padding: 4, borderRadius: 52, backgroundColor: t.colors.background, borderWidth: 3, borderColor: t.colors.accent },
  name: { color: t.colors.text, fontSize: 24, fontWeight: '900', marginTop: 12 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  typeBadgeText: { color: t.colors.primary, fontSize: 12, fontWeight: '800' },
  email: { color: t.colors.textMuted, fontSize: 13, marginTop: 8 },
  bioPress: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  bioText: { color: t.colors.textSecondary, fontSize: 14, textAlign: 'center' },
  bioInput: { backgroundColor: t.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: t.colors.border, padding: 12, color: t.colors.text, minHeight: 70, textAlignVertical: 'top' },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 20, backgroundColor: t.colors.card, borderRadius: 16, borderWidth: 1, borderColor: t.colors.cardBorder, paddingVertical: 16 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: t.colors.text, fontSize: 20, fontWeight: '900' },
  statLabel: { color: t.colors.textMuted, fontSize: 12, marginTop: 2 },
  sectionTitle: { color: t.colors.text, fontSize: 17, fontWeight: '900', marginBottom: 12 },
  subRow: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  subIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  subId: { color: t.colors.text, fontSize: 15, fontWeight: '800' },
  subMeta: { color: t.colors.textMuted, fontSize: 12, marginTop: 2 },
  statusChip: { backgroundColor: t.colors.warningSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { color: t.colors.warning, fontSize: 10, fontWeight: '800' },
}));
