import { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { getConversionStats, clearEvents } from '../lib/events'
import { type as typo, type Palette } from '../constants/type'
import { useTheme } from '../hooks/use-theme'

export default function AnalyticsScreen() {
  const colors = useTheme()
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getConversionStats>> | null>(null)

  useFocusEffect(
    useCallback(() => {
      getConversionStats().then(setStats)
    }, []),
  )

  async function handleClear() {
    await clearEvents()
    setStats(null)
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[typo.title as object, { color: colors.text, marginBottom: 16 }]}>
          Monetization Test Analytics
        </Text>

        {stats ? (
          <>
            <StatCard
              label="Total Events"
              value={stats.totalEvents}
              colors={colors}
            />
            <StatCard
              label="Limit Reached"
              value={stats.limitReached}
              colors={colors}
            />
            <StatCard
              label="View Evolution Clicked"
              value={stats.viewEvolutionClicked}
              colors={colors}
            />
            <StatCard
              label="Upgrade Clicked"
              value={stats.upgradeClicked}
              colors={colors}
            />
            <StatCard
              label="Pro Purchased"
              value={stats.proPurchased}
              colors={colors}
              highlight
            />

            <View style={[styles.metricsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.metricRow}>
                <Text style={[typo.label as object, { color: colors.text }]}>
                  Conversion Rate
                </Text>
                <Text style={[typo.label as object, { color: colors.accent }]}>
                  {stats.conversionRate}%
                </Text>
              </View>
              <Text style={[typo.caption as object, { color: colors.textMuted, marginTop: 4 }]}>
                % of limit_reached → pro_purchased
              </Text>

              <View style={[styles.metricRow, { marginTop: 12, paddingTop: 12, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[typo.label as object, { color: colors.text }]}>
                  Evolution vs Upgrade
                </Text>
                <Text style={[typo.label as object, { color: colors.accent }]}>
                  {stats.evolutionVsUpgradeRatio.toFixed(2)}:1
                </Text>
              </View>
              <Text style={[typo.caption as object, { color: colors.textMuted, marginTop: 4 }]}>
                view_evolution to upgrade_clicked ratio
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.accent }]}
              onPress={handleClear}>
              <Text style={[typo.button as object, { color: colors.accentTx }]}>
                Clear All Events
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={[typo.caption as object, { color: colors.textMuted }]}>
            No events recorded yet.
          </Text>
        )}

        <Text style={[typo.caption as object, { color: colors.textFaint, marginTop: 16 }]}>
          This screen is for testing only. All data is stored locally on your device.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function StatCard({
  label,
  value,
  colors,
  highlight = false,
}: {
  label: string
  value: number
  colors: Palette
  highlight?: boolean
}) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: highlight ? colors.accentSoft : colors.surface,
          borderColor: highlight ? colors.accent : colors.border,
        },
      ]}>
      <Text style={[typo.caption as object, { color: colors.textMuted }]}>{label}</Text>
      <Text
        style={[
          typo.title as object,
          { color: highlight ? colors.accent : colors.text, marginTop: 4 },
        ]}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, gap: 12, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  metricsCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  button: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
})
