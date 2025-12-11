// View all screen for scaffold pipeline sections
import React, { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { api } from '../lib/api/client'
import { useAuth } from '../lib/auth/AuthContext'
import type { Transaction } from '../lib/api/transactions2'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'
import type { ScaffoldStackParamList } from '../navigation/ScaffoldNavigator'
import DragDropReconciliationScreen from './DragDropReconciliationScreen'
import { AppBarLayout } from '../components/AppBarLayout'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f0f0f0'

type TransactionStub = {
  id: string
  title: string
  amount: string
  subtitle?: string
  verificationItems?: Array<{ label: string; confirmed?: boolean }>
  originalTransaction?: Transaction
  isCredit?: boolean // True if this is a credit to the account (money coming in)
}

type ScaffoldViewAllRouteParams = {
  section: string
  title: string
  items: TransactionStub[]
  showReconcileButton?: boolean
  pipelineSection?: string // Parent section: 'bank', 'cards', etc.
}

type ScaffoldViewAllRouteProp = RouteProp<
  { ScaffoldViewAll: ScaffoldViewAllRouteParams } | { [key: string]: any },
  'ScaffoldViewAll'
>

// Helper function to check if transaction is audit ready
// Audit ready = reconciliation.status is 'matched', 'reconciled', 'exception', or 'not_required'
function isAuditReady(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    reconciliation?: { status?: string }
  } | undefined
  
  const reconciliationStatus = metadata?.reconciliation?.status
  
  // Audit ready if reconciliation status indicates completion
  return (
    reconciliationStatus === 'matched' ||
    reconciliationStatus === 'reconciled' ||
    reconciliationStatus === 'exception' ||
    reconciliationStatus === 'not_required'
  )
}

// Helper function to check if transaction is unreconciled
function isUnreconciled(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    reconciliation?: { status?: string }
  } | undefined
  
  return metadata?.reconciliation?.status === 'unreconciled'
}

export default function ScaffoldViewAllScreen() {
  const navigation = useNavigation<StackNavigationProp<TransactionsStackParamList>>()
  const route = useRoute<ScaffoldViewAllRouteProp>()
  const { businessUser, memberships } = useAuth()
  const { title, items, showReconcileButton, section, pipelineSection } = route.params || { 
    title: 'View All', 
    items: [], 
    showReconcileButton: false,
    section: '',
    pipelineSection: ''
  }
  
  // Determine if this is bank or cards section based on pipelineSection (more reliable than title)
  const isBankSection = pipelineSection === 'bank' || title.toLowerCase().includes('bank')
  const isCardsSection = pipelineSection === 'cards' || title.toLowerCase().includes('card') || title.toLowerCase().includes('credit')
  const isReportingSection = section === 'reporting' || title.toLowerCase().includes('reporting ready')
  const [showDragDrop, setShowDragDrop] = useState(false)

  // Choose businessId (same logic as TransactionsScaffoldScreen)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  const handleGoBack = () => {
    navigation.goBack()
  }

  const handleReconcileClick = useCallback(async () => {
    try {
      const context = {
        pipelineSection: 'bank',
      }
      
      // Send signal to backend
      await api.post('/authenticated/transactions2/api/actions/reconcile-clicked', {
        businessId,
        context,
        timestamp: Date.now(),
      })
      
      // TODO: Navigate to reconcile screen or trigger reconcile action
    } catch (error) {
      console.error('Failed to send reconcile click signal:', error)
    }
  }, [businessId])

  // Handler for clicking on a transaction item
  const handleItemPress = useCallback((item: TransactionStub) => {
    if (item.originalTransaction) {
      navigation.navigate('TransactionDetail', { transaction: item.originalTransaction })
    }
  }, [navigation])

  return (
    <AppBarLayout title={title} onBackPress={handleGoBack}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items to display</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {items.map((item: TransactionStub) => (
              <TouchableOpacity
                key={item.id}
                style={styles.listItem}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.7}
                disabled={!item.originalTransaction}
              >
                <View style={styles.itemTextGroup}>
                  <View style={styles.itemTitleRow}>
                    <View style={styles.auditIconContainer}>
                      {item.originalTransaction && isAuditReady(item.originalTransaction) && (
                        <Ionicons name="shield" size={16} color={GRAYSCALE_SECONDARY} />
                      )}
                      {item.originalTransaction && isUnreconciled(item.originalTransaction) && (
                        <MaterialCommunityIcons name="shield-off" size={16} color={GRAYSCALE_SECONDARY} />
                      )}
                    </View>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                  </View>
                  {item.verificationItems ? (
                    <View style={styles.verificationItems}>
                      {item.verificationItems.map((verification: { label: string; confirmed?: boolean }, idx: number) => (
                        <View key={idx} style={styles.verificationItem}>
                          <Text style={styles.verificationBullet}>•</Text>
                          <Text style={styles.verificationLabel}>{verification.label}</Text>
                          <MaterialIcons
                            name="check"
                            size={14}
                            color={verification.confirmed ? GRAYSCALE_PRIMARY : '#d0d0d0'}
                            style={styles.verificationCheck}
                          />
                        </View>
                      ))}
                    </View>
                  ) : item.subtitle ? (
                    <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                  ) : null}
                </View>
                <View style={styles.itemAmountContainer}>
                  {isReportingSection && (
                    <Text style={[
                      styles.inputOutputIndicator,
                      item.isCredit ? styles.inputIndicator : styles.outputIndicator
                    ]}>
                      {item.isCredit ? '+' : '-'}
                    </Text>
                  )}
                  <Text style={styles.itemAmount}>{item.amount}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
      {showReconcileButton && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.reconcileButton}
            onPress={() => setShowDragDrop(true)}
          >
            <View style={styles.reconcileButtonContent}>
              <MaterialIcons name="swap-horiz" size={18} color={GRAYSCALE_PRIMARY} />
              <Text style={styles.reconcileButtonText}>Drag to Match</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.reconcileButton}
            onPress={handleReconcileClick}
          >
            <View style={styles.reconcileButtonContent}>
              <MaterialIcons name="autorenew" size={18} color={GRAYSCALE_PRIMARY} />
              <Text style={styles.reconcileButtonText}>Auto Reconcile</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
      <DragDropReconciliationScreen
        visible={showDragDrop}
        onClose={() => setShowDragDrop(false)}
        section={
          pipelineSection === 'bank' ? 'bank' 
          : pipelineSection === 'cards' ? 'cards'
          : isBankSection ? 'bank'
          : isCardsSection ? 'cards'
          : 'bank'
        }
        businessId={businessId}
      />
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: SURFACE_BACKGROUND,
  },
  contentContainer: {
    padding: 20,
  },
  listContainer: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  auditIconContainer: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    flex: 1,
  },
  itemSubtitle: {
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
    marginTop: 2,
  },
  itemAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  inputOutputIndicator: {
    fontSize: 16,
    fontWeight: '700',
    width: 16,
    textAlign: 'center',
  },
  inputIndicator: {
    color: GRAYSCALE_PRIMARY, // Grayscale for inputs/income
  },
  outputIndicator: {
    color: GRAYSCALE_PRIMARY, // Grayscale for outputs/expenses
  },
  verificationItems: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verificationBullet: {
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
  },
  verificationLabel: {
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
  },
  verificationCheck: {
    marginLeft: 2,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 40,
    backgroundColor: SURFACE_BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  reconcileButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    backgroundColor: CARD_BACKGROUND,
  },
  reconcileButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reconcileButtonText: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
  },
})

