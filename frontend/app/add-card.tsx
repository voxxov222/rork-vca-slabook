import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { makeStyles, useTheme } from '@/src/theme';
import { api } from '@/src/lib/api';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { Button, Chip } from '@/src/components/ui';
import { Icon } from '@/src/components/Icon';
import { useToast } from '@/src/components/Toast';

const CATEGORIES = ['Pokemon', 'Yu-Gi-Oh', 'Sports', 'Magic', 'One Piece', 'Other'];

export default function AddCard() {
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const params = useLocalSearchParams<Record<string, string>>();

  const [name, setName] = useState(params.name || '');
  const [set, setSet] = useState(params.set || '');
  const [number, setNumber] = useState(params.number || '');
  const [category, setCategory] = useState(params.category || 'Pokemon');
  const [rarity, setRarity] = useState(params.rarity || '');
  const [image] = useState(params.image || '');
  const [purchase, setPurchase] = useState('');
  const [value, setValue] = useState(params.current_value || '');
  const [notes, setNotes] = useState('');

  const save = useMutation({
    mutationFn: () =>
      api.post('/collection', {
        name,
        set,
        number,
        category,
        rarity,
        image: image || null,
        purchase_price: parseFloat(purchase) || 0,
        current_value: parseFloat(value) || parseFloat(purchase) || 0,
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.show('Added to your vault', 'success');
      router.back();
    },
    onError: () => toast.show('Could not add card', 'error'),
  });

  return (
    <View style={s.root}>
      <ScreenHeader title="Add Card" />
      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        bottomOffset={20}
        showsVerticalScrollIndicator={false}
      >
        {image ? (
          <View style={s.imagePreview}>
            <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
          </View>
        ) : (
          <View style={s.imagePlaceholder}>
            <Icon name="image-plus" size={40} color={colors.textMuted} />
            <Text style={s.placeholderText}>Scan a card to auto-fill details</Text>
          </View>
        )}

        <Field label="Card Name" value={name} onChangeText={setName} placeholder="Charizard" testID="field-name" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="Set" value={set} onChangeText={setSet} placeholder="Base Set" testID="field-set" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Number" value={number} onChangeText={setNumber} placeholder="4/102" testID="field-number" />
          </View>
        </View>

        <Text style={s.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>

        <Field label="Rarity" value={rarity} onChangeText={setRarity} placeholder="Holo Rare" testID="field-rarity" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="Purchase Price" value={purchase} onChangeText={setPurchase} placeholder="0.00" keyboardType="decimal-pad" testID="field-purchase" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Current Value" value={value} onChangeText={setValue} placeholder="0.00" keyboardType="decimal-pad" testID="field-value" />
          </View>
        </View>
        <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Condition, story…" multiline testID="field-notes" />

        <View style={{ marginTop: 18 }}>
          <Button label="Add to Vault" icon="check" variant="accent" loading={save.isPending} disabled={!name.trim()} onPress={() => save.mutate()} testID="save-card" />
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

function Field({ label, testID, multiline, ...props }: any) {
  const { colors } = useTheme();
  const s = useStyles();
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { height: 88, textAlignVertical: 'top' }]}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        testID={testID}
        {...props}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  imagePreview: { height: 200, borderRadius: 16, overflow: 'hidden', backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border },
  imagePlaceholder: { height: 140, borderRadius: 16, backgroundColor: t.colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center', gap: 8 },
  placeholderText: { color: t.colors.textMuted, fontSize: 13 },
  label: { color: t.colors.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 6 },
  input: { backgroundColor: t.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: t.colors.border, paddingHorizontal: 14, paddingVertical: 12, color: t.colors.text, fontSize: 15 },
}));
