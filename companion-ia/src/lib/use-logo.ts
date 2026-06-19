// Logo personnalisé du compagnon, partagé par tous les écrans qui affichent
// l'Orb. Se recharge à chaque focus d'écran (donc au retour de l'écran de
// personnalisation), pour refléter immédiatement un upload ou une suppression.
import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { getPersonalization } from './storage'

export function useLogo(): string | null {
  const [logo, setLogo] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      getPersonalization()
        .then((p) => setLogo(p.logo))
        .catch(() => {})
    }, []),
  )

  return logo
}
