import React from 'react';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';

type Props = {
  name: string;
  size?: number;
  color?: string;
  style?: any;
};

export function Icon({ name, size = 22, color = '#fff', style }: Props) {
  // Cast name — MDI ships strict glyph typings; we pass validated names.
  const IconAny = MaterialDesignIcons as any;
  return <IconAny name={name} size={size} color={color} style={style} />;
}

export default Icon;
