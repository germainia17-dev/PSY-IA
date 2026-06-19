// Tokens de motion — DA signature du 12 juin 2026.
// Chaque spring a une intention : ne pas réutiliser au hasard.

export const SPRING = {
  // bulle assistant — arrivée douce, organique
  soft: { damping: 18, stiffness: 140, mass: 1 },
  // bulle user — plus snappy, intentionnel (l'user a agi)
  snappy: { damping: 20, stiffness: 260, mass: 0.9 },
  // press feedback — réactif, sans rebond
  press: { damping: 26, stiffness: 420, mass: 0.8 },
  // modale / settings — autorité, léger overshoot
  modal: { damping: 22, stiffness: 200, mass: 1.1 },
  // orbe / noyau bumps
  bounce: { damping: 8, stiffness: 180, mass: 1 },
} as const

// Tokens de motion "warm v2" — durées, courbes et spring pour la lib UI.
// Le mouvement reste discret, comme une respiration.
export const motion = {
  durations: {
    fast: 120, // feedback immédiat (tap, toggle)
    base: 220, // transition d'écran, fade
    slow: 360, // entrée d'écran, apparition de carte
  },
  easings: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  },
  spring: {
    damping: 20,
    stiffness: 200,
    mass: 0.8,
  },
} as const
