import { Image, StyleSheet, View } from 'react-native'
import { useLogo } from '../lib/use-logo'

const DEFAULT_LOGO = require('../assets/companion-logo.png')

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

// L'orbe : la présence physique du compagnon.
// Affiche le logo personnalisé, ou le logo par défaut du companion.
export function Orb({ state: _state, size = 120 }: { state: OrbState; size?: number }) {
  const logo = useLogo()
  const displayLogo = logo || DEFAULT_LOGO

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={typeof displayLogo === 'string' ? { uri: displayLogo } : displayLogo}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
})
