import React, { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { palettes } from '../../constants/design';
import { type } from '../../constants/type';
import { motion } from '../../constants/motion';

const p = palettes.light;

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Sheet({ visible, onClose, title, children, style }: SheetProps) {
  const translateY = useRef(new Animated.Value(600)).current;
  const scrim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: motion.durations.base,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scrim, {
          toValue: 1,
          duration: motion.durations.base,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 600,
          duration: motion.durations.base,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scrim, {
          toValue: 0,
          duration: motion.durations.base,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, scrim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.scrim, { opacity: scrim }]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }, style]}
        >
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {title ? (
            <Text style={[styles.title, type.subtitle, { color: p.text }]}>{title}</Text>
          ) : null}

          <View style={styles.body}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: p.scrim,
  },
  sheet: {
    backgroundColor: p.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: Platform.select({ ios: 34, android: 24, default: 24 }),
    maxHeight: '90%',
    minHeight: 120,
    shadowColor: p.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: p.border,
  },
  title: {
    marginTop: 4,
    marginBottom: 12,
  },
  body: {},
});

export default Sheet;
