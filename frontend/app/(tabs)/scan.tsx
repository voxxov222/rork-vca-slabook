import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { makeStyles, useTheme, VCA_RED } from '@/src/theme';
import { usesNativeTabs } from '@/src/navigation';
import { api } from '@/src/lib/api';
import { money } from '@/src/lib/format';
import { Icon } from '@/src/components/Icon';
import { Button, Surface, StatusPill, Skeleton } from '@/src/components/ui';
import { useToast } from '@/src/components/Toast';

type ScanResult = {
  identification: { name: string; set: string; number: string; category: string; rarity: string; language: string };
  confidence: number;
  authenticity_status: string;
  condition: string;
  notes: string;
  matched: boolean;
  image: string | null;
  raw_value: number;
  grade_values: Record<string, number>;
  market: { low: number; mid: number; high: number; sources: string[] };
};

export default function Scan() {
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOn, setCameraOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  async function toBase64(uri: string): Promise<string> {
    const out = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 900 } }], {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    return out.base64 as string;
  }

  async function runScan(base64: string, uri: string) {
    setPreview(uri);
    setCameraOn(false);
    setScanning(true);
    setResult(null);
    try {
      const res = await api.post<ScanResult>('/scan', { image_base64: base64 });
      setResult(res);
    } catch (e: any) {
      toast.show(e?.message || 'Scan failed. Try a clearer photo.', 'error');
    } finally {
      setScanning(false);
    }
  }

  async function openCamera() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        if (!res.canAskAgain) {
          toast.show('Enable camera access in Settings to scan.', 'error');
          Linking.openSettings();
        }
        return;
      }
    }
    setResult(null);
    setPreview(null);
    setCameraOn(true);
  }

  async function capture() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    if (photo?.uri) {
      const b64 = await toBase64(photo.uri);
      await runScan(b64, photo.uri);
    }
  }

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      const b64 = await toBase64(res.assets[0].uri);
      await runScan(b64, res.assets[0].uri);
    }
  }

  function addToVault() {
    if (!result) return;
    router.push({
      pathname: '/add-card',
      params: {
        name: result.identification.name,
        set: result.identification.set,
        number: result.identification.number,
        category: result.identification.category,
        rarity: result.identification.rarity,
        image: result.image || preview || '',
        current_value: String(result.raw_value),
      },
    });
  }

  // Camera live view
  if (cameraOn) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
          <View style={[s.camOverlay, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
            <Pressable style={s.camClose} onPress={() => setCameraOn(false)} testID="camera-close">
              <Icon name="close" size={26} color="#fff" />
            </Pressable>
            <View style={s.reticle} />
            <Text style={s.camHint}>Align the card inside the frame</Text>
            <Pressable style={s.shutter} onPress={capture} testID="camera-shutter">
              <View style={s.shutterInner} />
            </Pressable>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Text style={s.headerTitle}>Card Scanner</Text>
        <Text style={s.headerSub}>AI identification · authenticity · value</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: bottomChrome + 28 }}>
        {!result && !scanning && (
          <Animated.View entering={FadeIn}>
            <LinearGradient colors={[colors.heroStart, colors.heroEnd]} style={s.scanHero}>
              <View style={s.scanIconRing}>
                <Icon name="line-scan" size={40} color="#fff" />
              </View>
              <Text style={s.scanHeroTitle}>Scan any trading card</Text>
              <Text style={s.scanHeroSub}>
                Pokémon · Sports · Magic · Yu-Gi-Oh · One Piece. Get instant identification, an authenticity review and grade value estimates.
              </Text>
            </LinearGradient>

            <View style={{ gap: 12, marginTop: 18 }}>
              <Button label="Take Photo" icon="camera" variant="accent" onPress={openCamera} testID="scan-camera-btn" />
              <Button label="Upload from Library" icon="image-multiple" variant="outline" onPress={pickImage} testID="scan-upload-btn" />
            </View>

            <Surface style={s.disclaimer}>
              <Icon name="information-outline" size={18} color={colors.info} />
              <Text style={s.disclaimerText}>
                Automated analysis is a review aid, not a guaranteed authenticity or sale-price determination. Suspicious cards are flagged for manual review.
              </Text>
            </Surface>
          </Animated.View>
        )}

        {scanning && (
          <Animated.View entering={FadeIn} style={{ alignItems: 'center' }}>
            {preview && (
              <View style={s.previewWrap}>
                <Image source={{ uri: preview }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
                <View style={s.scanLine} />
              </View>
            )}
            <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 24 }} />
            <Text style={s.scanningText}>Analyzing card…</Text>
            <Skeleton height={16} width={220} style={{ marginTop: 16 }} />
            <Skeleton height={16} width={160} style={{ marginTop: 8 }} />
          </Animated.View>
        )}

        {result && !scanning && (
          <Animated.View entering={FadeInDown} style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <View style={s.resultImage}>
                {(result.image || preview) ? (
                  <Image source={{ uri: (result.image || preview) as string }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
                ) : (
                  <Icon name="cards" size={40} color={colors.textMuted} />
                )}
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={s.resultName}>{result.identification.name}</Text>
                <Text style={s.resultMeta}>
                  {result.identification.set || result.identification.category}
                  {result.identification.number ? ` · ${result.identification.number}` : ''}
                </Text>
                <StatusPill status={result.authenticity_status} />
                <View style={s.confidenceRow}>
                  <View style={s.confBar}>
                    <View style={[s.confFill, { width: `${result.confidence}%` }]} />
                  </View>
                  <Text style={s.confText}>{result.confidence}%</Text>
                </View>
                <Text style={s.resultMeta}>Condition: {result.condition}</Text>
              </View>
            </View>

            {result.notes ? (
              <Surface style={{ padding: 12, flexDirection: 'row', gap: 8 }}>
                <Icon name="text-search" size={18} color={colors.textSecondary} />
                <Text style={[s.resultMeta, { flex: 1 }]}>{result.notes}</Text>
              </Surface>
            ) : null}

            <Surface style={{ padding: 16 }}>
              <Text style={s.valueTitle}>Estimated Value</Text>
              <View style={s.valueGrid}>
                <ValueCell label="Raw" value={result.grade_values.raw} />
                <ValueCell label="VCA 10" value={result.grade_values.vca10} highlight />
                <ValueCell label="VCA 9" value={result.grade_values.vca9} />
                <ValueCell label="VCA 8" value={result.grade_values.vca8} />
                <ValueCell label="PSA 10" value={result.grade_values.psa10} />
                <ValueCell label="PSA 9" value={result.grade_values.psa9} />
              </View>
              <View style={s.marketRow}>
                <Text style={s.marketText}>Market {money(result.market.low)} – {money(result.market.high)}</Text>
                <Text style={s.marketSrc}>{result.market.sources.join(' · ')}</Text>
              </View>
            </Surface>

            <View style={{ gap: 12 }}>
              <Button label="Add to Vault" icon="plus-circle" variant="primary" onPress={addToVault} testID="scan-add-vault" />
              <Button label="Scan Another" icon="refresh" variant="ghost" onPress={() => { setResult(null); setPreview(null); }} testID="scan-again" />
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function ValueCell({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const s = useStyles();
  return (
    <View style={[s.valueCell, highlight && s.valueCellHi]}>
      <Text style={[s.valueCellLabel, highlight && { color: '#fff' }]}>{label}</Text>
      <Text style={[s.valueCellValue, highlight && { color: '#fff' }]}>{money(value)}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 12, backgroundColor: t.colors.background, borderBottomWidth: 1, borderBottomColor: t.colors.divider },
  headerTitle: { color: t.colors.text, fontSize: 24, fontWeight: '900' },
  headerSub: { color: t.colors.textMuted, fontSize: 13, marginTop: 2 },
  scanHero: { borderRadius: 20, padding: 24, alignItems: 'center' },
  scanIconRing: {
    width: 84, height: 84, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  scanHeroTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  scanHeroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  disclaimer: { marginTop: 18, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  disclaimerText: { color: t.colors.textSecondary, fontSize: 12, lineHeight: 18, flex: 1 },
  camOverlay: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  camClose: { alignSelf: 'flex-start', marginLeft: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  reticle: { width: '72%', aspectRatio: 0.72, borderRadius: 16, borderWidth: 3, borderColor: VCA_RED },
  camHint: { color: '#fff', fontSize: 14, fontWeight: '600' },
  shutter: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  previewWrap: { width: 200, height: 280, borderRadius: 16, overflow: 'hidden', backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border },
  scanLine: { position: 'absolute', left: 0, right: 0, top: '48%', height: 2, backgroundColor: VCA_RED },
  scanningText: { color: t.colors.text, fontSize: 16, fontWeight: '800', marginTop: 12 },
  resultImage: { width: 110, height: 150, borderRadius: 12, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  resultName: { color: t.colors.text, fontSize: 20, fontWeight: '900' },
  resultMeta: { color: t.colors.textSecondary, fontSize: 13 },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  confBar: { flex: 1, height: 7, borderRadius: 4, backgroundColor: t.colors.skeleton, overflow: 'hidden' },
  confFill: { height: '100%', backgroundColor: t.colors.success, borderRadius: 4 },
  confText: { color: t.colors.text, fontSize: 12, fontWeight: '800' },
  valueTitle: { color: t.colors.text, fontSize: 16, fontWeight: '900', marginBottom: 12 },
  valueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  valueCell: { width: '31%', flexGrow: 1, backgroundColor: t.colors.background, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: t.colors.border },
  valueCellHi: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  valueCellLabel: { color: t.colors.textMuted, fontSize: 11, fontWeight: '700' },
  valueCellValue: { color: t.colors.text, fontSize: 15, fontWeight: '900', marginTop: 2 },
  marketRow: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.colors.divider },
  marketText: { color: t.colors.text, fontSize: 14, fontWeight: '800' },
  marketSrc: { color: t.colors.textMuted, fontSize: 11, marginTop: 3 },
}));
