// Settings Units screen - shows unit types information

import React, { useState, useCallback } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { AppBarLayout } from '../components/AppBarLayout'
import { useAuth } from '../lib/auth/AuthContext'
import { businessContextApi } from '../lib/api/businessContext'
import type { BusinessContextPayload } from '../lib/types/api'

const GRAYSCALE_PRIMARY = '#333333'

export default function SettingsUnitsScreen() {
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId

  // Unit types state
  const [unitTypes, setUnitTypes] = useState<{ volume: 'metric' | 'imperial'; weight: 'metric' | 'imperial' }>({
    volume: 'metric',
    weight: 'metric',
  })
  const [loadingUnitTypes, setLoadingUnitTypes] = useState(true)

  const saveUnitTypes = useCallback(async (unitTypesToSave: { volume: 'metric' | 'imperial'; weight: 'metric' | 'imperial' }) => {
    if (!businessId) return

    try {
      // Fetch existing context to preserve other fields
      const existingContext = await businessContextApi.getContext(businessId)
      const { businessId: contextBusinessId, createdAt, updatedAt, createdBy, ...contextFields } = existingContext.context

      // Create payload with existing context plus unit types
      const payload: BusinessContextPayload = {
        businessId,
        createdBy: createdBy || businessUser?.email || 'mobile-user',
        context: {
          ...contextFields,
          unitTypes: unitTypesToSave,
        },
      }

      await businessContextApi.upsert(payload)
    } catch (error) {
      console.error('Failed to save unit types:', error)
      throw error
    }
  }, [businessId, businessUser])

  const fetchUnitTypes = useCallback(async () => {
    if (!businessId) {
      setLoadingUnitTypes(false)
      return
    }
    try {
      setLoadingUnitTypes(true)
      const response = await businessContextApi.getContext(businessId)
      const existingUnitTypes = response.context.unitTypes
      
      // Default to metric if not set
      const defaultUnitTypes = {
        volume: 'metric' as const,
        weight: 'metric' as const,
      }
      
      const currentUnitTypes = {
        volume: existingUnitTypes?.volume || defaultUnitTypes.volume,
        weight: existingUnitTypes?.weight || defaultUnitTypes.weight,
      }
      
      setUnitTypes(currentUnitTypes)
      
      // If unit types don't exist in context, initialize them with defaults
      if (!existingUnitTypes || !existingUnitTypes.volume || !existingUnitTypes.weight) {
        // Save the defaults
        await saveUnitTypes(currentUnitTypes)
      }
    } catch (error) {
      console.error('Failed to fetch unit types:', error)
      // Keep defaults on error
    } finally {
      setLoadingUnitTypes(false)
    }
  }, [businessId, saveUnitTypes])

  useFocusEffect(
    useCallback(() => {
      fetchUnitTypes()
    }, [fetchUnitTypes]),
  )

  return (
    <AppBarLayout>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Unit Types</Text>
          </View>

          {loadingUnitTypes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#666666" />
            </View>
          ) : (
            <View style={styles.unitTypesContent}>
              <View style={styles.unitTypesRow}>
                <Text style={styles.unitTypesLabel}>Volume:</Text>
                <Text style={styles.unitTypesValue}>
                  {unitTypes.volume === 'metric' ? 'Metric (L, mL)' : 'Imperial (gal, fl oz)'}
                </Text>
              </View>
              <View style={styles.unitTypesRow}>
                <Text style={styles.unitTypesLabel}>Weight:</Text>
                <Text style={styles.unitTypesValue}>
                  {unitTypes.weight === 'metric' ? 'Metric (kg, g)' : 'Imperial (lb, oz)'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 36,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  unitTypesContent: {
    gap: 12,
  },
  unitTypesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unitTypesLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    flex: 1,
  },
  unitTypesValue: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
})
