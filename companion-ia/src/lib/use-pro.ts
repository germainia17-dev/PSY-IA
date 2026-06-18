// État Pro partagé entre les écrans (chat + paramètres). Source unique : la
// table profiles via isPro(). Se rafraîchit à chaque focus de l'écran (donc au
// retour de Stripe). onUnlock se déclenche UNIQUEMENT sur une vraie bascule
// gratuit→Pro pendant la session (le moment du paiement) — pas au démarrage
// quand on découvre un Pro déjà actif (sinon confettis à chaque ouverture).
import { useCallback, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { isPro } from './api'

export function usePro(onUnlock?: () => void) {
  const [pro, setPro] = useState(false)
  const initialized = useRef(false) // a-t-on déjà lu le plan au moins une fois ?
  const wasPro = useRef(false)
  const cb = useRef(onUnlock)
  cb.current = onUnlock

  const refresh = useCallback(async () => {
    const p = await isPro()
    setPro(p)
    // Bascule = on était connu non-Pro, et on vient de le devenir, APRÈS la
    // première lecture. La toute première lecture ne fait qu'enregistrer l'état.
    if (initialized.current && p && !wasPro.current) {
      cb.current?.()
    }
    wasPro.current = p
    initialized.current = true
    return p
  }, [])

  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh]),
  )

  return { pro, refresh }
}
