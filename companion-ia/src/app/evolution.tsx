import { useEffect, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Polyline, Defs, LinearGradient, Stop, Circle } from 'react-native-svg'
import { usePro } from '../lib/use-pro'
import { useTheme } from '../hooks/use-theme'
import { listConversations, getMoods } from '../lib/storage'
import { enableEvolutionReminder } from '../lib/notifications'
import { type as typo } from '../constants/type'
import { useRouter } from 'expo-router'

type Period = 'week' | 'month' | 'year'

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function getDaysBetween(startDate: Date, endDate: Date): Date[] {
  const days: Date[] = []
  const current = new Date(startDate)
  while (current <= endDate) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return days
}

function getPeriodDates(period: Period): { start: Date; end: Date; label: string } {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  let start = new Date(end)

  switch (period) {
    case 'week':
      start.setDate(end.getDate() - 6)
      return { start, end, label: 'Cette semaine' }
    case 'month':
      start.setDate(end.getDate() - 29)
      return { start, end, label: 'Ce mois' }
    case 'year':
      start.setFullYear(end.getFullYear() - 1)
      return { start, end, label: 'Cette année' }
  }
}

type EvolutionPoint = {
  date: string
  score: number
  displayDate: string
}

async function computeEvolution(period: Period): Promise<EvolutionPoint[]> {
  const { start, end } = getPeriodDates(period)
  const days = getDaysBetween(start, end)
  const convos = await listConversations()
  const moods = await getMoods()

  // Map: jour → nombre de conversations + mood value
  const dayData = new Map<
    string,
    { convos: number; moodValue: number | null }
  >()

  for (const day of days) {
    const key = dayKey(day.getTime())
    dayData.set(key, { convos: 0, moodValue: null })
  }

  for (const convo of convos) {
    const key = dayKey(convo.updatedAt)
    if (dayData.has(key)) {
      const data = dayData.get(key)!
      data.convos += 1
    }
  }

  for (const mood of moods) {
    if (dayData.has(mood.date)) {
      const data = dayData.get(mood.date)!
      data.moodValue = mood.value
    }
  }

  // Compute score : conversations (30 pts chacune) + mood (20 pts), capped 100
  const points: EvolutionPoint[] = []
  let smoothedScore = 50 // valeur de départ neutre

  for (const day of days) {
    const key = dayKey(day.getTime())
    const data = dayData.get(key)!
    let rawScore = data.convos * 30 + (data.moodValue ? data.moodValue * 20 : 0)
    rawScore = Math.min(rawScore, 100)

    // Lissage sur 3 jours : moyenne mobile
    smoothedScore = smoothedScore * 0.7 + rawScore * 0.3

    const displayDate =
      period === 'year'
        ? day.toLocaleDateString('fr-FR', { month: 'short' })
        : day.toLocaleDateString('fr-FR', { day: 'numeric' })

    points.push({
      date: key,
      score: Math.round(smoothedScore),
      displayDate,
    })
  }

  return points
}

type ChartData = {
  points: EvolutionPoint[]
  minScore: number
  maxScore: number
}

function computeChartData(points: EvolutionPoint[]): ChartData {
  const scores = points.map((p) => p.score)
  const minScore = Math.min(...scores, 0)
  const maxScore = Math.max(...scores, 100)
  return { points, minScore, maxScore }
}

function EvolutionChart({
  data,
  color,
  height = 220,
}: {
  data: ChartData
  color: string
  height?: number
}) {
  const width = 320
  const padding = 30
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const range = Math.max(data.maxScore - data.minScore, 20)
  const polylinePoints = data.points
    .map((p, i) => {
      const x = (i / (data.points.length - 1)) * chartWidth + padding
      const y =
        height - padding - ((p.score - data.minScore) / range) * chartHeight
      return `${x},${y}`
    })
    .join(' ')

  const labelPoints = data.points
    .map((p, i) => {
      const skip = Math.max(1, Math.floor(data.points.length / 6))
      return i % skip === 0 ? p : null
    })
    .filter(Boolean) as EvolutionPoint[]

  return (
    <View style={styles.chartContainer}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="gradFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Axes grille */}
        {[0, 25, 50, 75, 100].map((val) => {
          const y =
            height - padding - ((val - data.minScore) / range) * chartHeight
          return (
            <View key={`grid-${val}`} style={{ position: 'absolute' }}>
              <Text
                style={[
                  styles.axisLabel,
                  { position: 'absolute', left: 5, top: y - 8 },
                ]}>
                {val}%
              </Text>
            </View>
          )
        })}

        {/* Courbe de remplissage */}
        <Polyline
          points={polylinePoints}
          fill="url(#gradFill)"
          stroke="none"
          strokeWidth="0"
        />

        {/* Ligne de la courbe */}
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points de data */}
        {data.points.map((p, i) => {
          const x = (i / (data.points.length - 1)) * chartWidth + padding
          const y =
            height - padding - ((p.score - data.minScore) / range) * chartHeight
          return (
            <Circle
              key={`point-${i}`}
              cx={x}
              cy={y}
              r="3"
              fill={color}
              opacity="0.6"
            />
          )
        })}
      </Svg>

      {/* Labels X */}
      <View style={[styles.labelsXContainer, { width }]}>
        {labelPoints.map((p, i) => (
          <Text
            key={`label-${i}`}
            style={[
              styles.axisLabelX,
              { marginLeft: (chartWidth / (labelPoints.length - 1)) * i - 15 },
            ]}>
            {p.displayDate}
          </Text>
        ))}
      </View>
    </View>
  )
}

export default function EvolutionScreen() {
  const colors = useTheme()
  const { pro } = usePro()
  const router = useRouter()

  const [period, setPeriod] = useState<Period>('week')
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodLabel, setPeriodLabel] = useState('')

  useEffect(() => {
    if (pro) {
      enableEvolutionReminder().catch(() => {})
    }
  }, [pro])

  useEffect(() => {
    setLoading(true)
    computeEvolution(period).then((points) => {
      const data = computeChartData(points)
      setChartData(data)
      const { label } = getPeriodDates(period)
      setPeriodLabel(label)
      setLoading(false)
    })
  }, [period])

  if (!pro) {
    return (
      <SafeAreaView
        style={[styles.root, { backgroundColor: colors.bg }]}
        edges={['bottom']}>
        <View
          style={[
            styles.gateContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Text
            style={[
              typo.title as object,
              { color: colors.text, marginBottom: 16 },
            ]}>
            Réservé aux abonnés
          </Text>
          <Text
            style={[
              typo.label as object,
              { color: colors.textMuted, marginBottom: 24, lineHeight: 20 },
            ]}>
            Suis ta progression psychologique avec des graphiques détaillés et
            des insights sur ton évolution.
          </Text>
          <Pressable
            onPress={() => router.push('/paywall' as never)}
            style={({ pressed }) => [
              styles.gateCta,
              { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
            ]}>
            <Text
              style={[
                typo.button as object,
                { color: colors.accentTx },
              ]}>
              Débloquer
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[typo.subtitle as object, { color: colors.text }]}>
            {periodLabel}
          </Text>
          <Text
            style={[
              typo.caption as object,
              { color: colors.textMuted, marginTop: 4 },
            ]}>
            Évolution en % approximatif
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : chartData ? (
          <EvolutionChart data={chartData} color={colors.accent} />
        ) : null}

        {/* Period selector */}
        <View style={styles.periodSelector}>
          {(['week', 'month', 'year'] as const).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={({ pressed }) => [
                styles.periodPill,
                period === p
                  ? [
                      { backgroundColor: colors.accent },
                      styles.periodPillActive,
                    ]
                  : [{ backgroundColor: colors.surface, borderColor: colors.border }],
                pressed && { opacity: 0.8 },
              ]}>
              <Text
                style={[
                  typo.button as object,
                  {
                    color:
                      period === p ? colors.accentTx : colors.text,
                    fontSize: 13,
                  },
                ]}>
                {p === 'week'
                  ? '1S'
                  : p === 'month'
                    ? '1M'
                    : '1A'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Text
            style={[
              typo.caption as object,
              { color: colors.textMuted, lineHeight: 18 },
            ]}>
            Le score mesure tes conversations et ton humeur du jour, lissé sur
            une moyenne mobile. Plus élevé = meilleure progression.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  chartContainer: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingBottom: 20,
  },
  labelsXContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    marginTop: -8,
  },
  axisLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    opacity: 0.5,
  },
  axisLabelX: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    opacity: 0.5,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  periodPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  periodPillActive: {
    borderWidth: 0,
  },
  infoBox: {
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gateContainer: {
    margin: 20,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    marginTop: 40,
  },
  gateCta: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
