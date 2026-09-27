import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

type Props = {
  size?: number;
};

// assets/logo-mark.png is a cropped, square-padded version of the real
// logo (assets/logo.jpeg) — that source file bakes the "HarvestHub"
// wordmark into the same image as the H icon, which only works where the
// logo stands alone. Everywhere this component is actually used, it either
// sits right next to a separately-styled "HarvestHub" text (HeroShell,
// Login) or alone with no text at all (Signup, role-setup) — never wanting
// a second, baked-in wordmark competing with the app's own type. Rounded
// square, not a full circle: the H strokes run close enough to the edges
// that a circular mask would clip their corners.
export function Logo({ size = 56 }: Props) {
  return (
    <Image
      source={require('../assets/logo-mark.png')}
      style={[styles.image, { width: size, height: size, borderRadius: size * 0.22 }]}
      contentFit="cover"
    />
  );
}

const styles = StyleSheet.create({
  image: {},
});
