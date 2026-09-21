import { Platform } from 'react-native';

/**
 * Single source of truth for the tab-navigation strategy.
 * iOS 26+ uses expo-router NativeTabs (liquid glass); everything else falls
 * back to the classic JS <Tabs> bar.
 */
export const usesNativeTabs =
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;
