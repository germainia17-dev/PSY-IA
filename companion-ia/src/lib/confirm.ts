import { Alert, Platform } from 'react-native'

// Confirmation cross-platform. react-native-web n'implémente pas Alert.alert
// avec boutons/callbacks : sur web on retombe sur window.confirm, sinon le
// onPress ne se déclenche jamais (l'action semble morte).
export function confirm({
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  destructive = false,
  onConfirm,
}: {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void | Promise<void>
}) {
  if (Platform.OS === 'web') {
    const ok = window.confirm(message ? `${title}\n\n${message}` : title)
    if (ok) void onConfirm()
    return
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: () => void onConfirm(),
    },
  ])
}

// Alerte simple cross-platform (un seul bouton OK).
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title)
    return
  }
  Alert.alert(title, message)
}
