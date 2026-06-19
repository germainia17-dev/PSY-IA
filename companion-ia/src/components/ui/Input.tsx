import React, { useState, useRef, forwardRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  type TextInputProps,
} from 'react-native';
import { palettes } from '../../constants/design';
import { type } from '../../constants/type';

const p = palettes.light;

export type InputProps = Omit<TextInputProps, 'style'> & {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  maxLength?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { value, onChangeText, placeholder, onSubmit, maxLength, autoFocus, disabled, style, inputStyle, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const animateFocus = (to: number) => {
    Animated.timing(focusAnim, {
      toValue: to,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [p.border, p.accent],
  });

  return (
    <Animated.View
      style={[
        styles.wrap,
        { borderColor, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={p.textFaint}
        maxLength={maxLength}
        autoFocus={autoFocus}
        editable={!disabled}
        onFocus={(e) => {
          setFocused(true);
          animateFocus(1);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          animateFocus(0);
          rest.onBlur?.(e);
        }}
        onSubmitEditing={onSubmit}
        returnKeyType={onSubmit ? 'send' : rest.returnKeyType}
        blurOnSubmit={false}
        multiline
        textAlignVertical="top"
        style={[styles.input, type.message, inputStyle]}
        {...rest}
      />
    </Animated.View>
  );
});

const MIN_H = 44;
const MAX_H = 140;

const styles = StyleSheet.create({
  wrap: {
    minHeight: MIN_H,
    maxHeight: MAX_H,
    backgroundColor: p.surface,
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: Platform.select({ ios: 12, android: 10, default: 10 }),
    justifyContent: 'center',
  },
  input: {
    color: p.text,
    fontSize: 16,
    minHeight: MIN_H - 24,
  },
});

export default Input;
