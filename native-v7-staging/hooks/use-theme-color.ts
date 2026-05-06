export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: string
) {
  return props.light || '#2C2420';
}
