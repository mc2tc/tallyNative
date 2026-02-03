import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { CircularMetric } from './MetricsCard'

interface KPIDetailCardProps {
  title: string
  metricValue: string | number // The actual KPI metric value (formatted)
  score: number // The score for the circle progress
  label: string
  progress: number
  subtitle?: string
  iconName?: keyof typeof MaterialIcons.glyphMap
  onPress?: () => void
}

export function KPIDetailCard({ title, metricValue, score, label, progress, subtitle, iconName, onPress }: KPIDetailCardProps) {
  const content = (
    <>
      {iconName && (
        <View style={styles.iconContainer}>
          <MaterialIcons name={iconName} size={32} color="#666666" />
        </View>
      )}
      <View style={styles.leftContent}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.value}>
          {typeof metricValue === 'number' ? metricValue.toLocaleString() : metricValue}
        </Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.rightContent}>
        <CircularMetric
          value={Math.round(score)}
          label=""
          progress={progress}
          size="small"
        />
        {onPress ? (
          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={styles.viewDetailsButton}
          >
            <Text style={styles.viewDetailsText}>View details</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.labelText}>{label}</Text>
        )}
      </View>
    </>
  )

  return (
    <View style={styles.card}>
      {content}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    marginRight: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftContent: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#999999',
  },
  rightContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsButton: {
    marginTop: -16,
    paddingVertical: 0,
    paddingHorizontal: 8,
  },
  viewDetailsText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
  },
  labelText: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
})

