import AsyncStorage from '@react-native-async-storage/async-storage'

// Conversion events for monetization testing. Stored locally, privacy-first.
export type ConversionEvent = {
  id: string
  event: 'limit_reached' | 'view_evolution_clicked' | 'upgrade_clicked' | 'pro_purchased' | 'daily_return'
  timestamp: number
  metadata?: Record<string, any>
}

const EVENTS_KEY = '@companion_conversion_events'
const MAX_EVENTS = 500

export async function logEvent(
  event: ConversionEvent['event'],
  metadata?: Record<string, any>,
): Promise<void> {
  const now = Date.now()
  const id = now.toString(36) + Math.random().toString(36).slice(2, 6)

  const events = await getEvents()
  events.push({ id, event, timestamp: now, metadata })

  // Keep last 500 events (~3 months at ~5 events/day)
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-MAX_EVENTS)))
}

export async function getEvents(): Promise<ConversionEvent[]> {
  const raw = await AsyncStorage.getItem(EVENTS_KEY)
  return raw ? JSON.parse(raw) : []
}

export async function clearEvents(): Promise<void> {
  await AsyncStorage.removeItem(EVENTS_KEY)
}

// Summary stats for testing
export async function getConversionStats(): Promise<{
  totalEvents: number
  limitReached: number
  viewEvolutionClicked: number
  upgradeClicked: number
  proPurchased: number
  conversionRate: number // % of limit_reached → pro_purchased
  evolutionVsUpgradeRatio: number // ratio of view_evolution to upgrade clicks
}> {
  const events = await getEvents()

  const counts = {
    limit_reached: events.filter((e) => e.event === 'limit_reached').length,
    view_evolution_clicked: events.filter((e) => e.event === 'view_evolution_clicked').length,
    upgrade_clicked: events.filter((e) => e.event === 'upgrade_clicked').length,
    pro_purchased: events.filter((e) => e.event === 'pro_purchased').length,
  }

  const conversionRate =
    counts.limit_reached > 0
      ? Math.round((counts.pro_purchased / counts.limit_reached) * 100)
      : 0

  const evolutionVsUpgradeRatio =
    counts.upgrade_clicked > 0
      ? (counts.view_evolution_clicked / counts.upgrade_clicked).toFixed(2)
      : 0

  return {
    totalEvents: events.length,
    limitReached: counts.limit_reached,
    viewEvolutionClicked: counts.view_evolution_clicked,
    upgradeClicked: counts.upgrade_clicked,
    proPurchased: counts.pro_purchased,
    conversionRate,
    evolutionVsUpgradeRatio: Number(evolutionVsUpgradeRatio),
  }
}
