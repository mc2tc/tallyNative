// Drag-and-drop reconciliation screen
// Allows users to manually match bank/CC transactions with purchase receipts
import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import { useAuth } from '../lib/auth/AuthContext'
import { transactions2Api, reconciliationApi, type Transaction } from '../lib/api/transactions2'
import { formatAmount } from '../lib/utils/currency'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'
const MATCH_COLOR = '#4a9eff'
const DROP_ZONE_COLOR = '#e8f4fd'

type TransactionCard = {
  id: string
  title: string
  amount: string
  amountValue: number
  currency: string
  date?: number
  description?: string
  originalTransaction: Transaction
  type: 'bank' | 'card' | 'receipt'
}

// Helper to check if transaction is a bank transaction
function isBankTransaction(tx: Transaction): boolean {
  const metadata = tx.metadata as { capture?: { source?: string } }
  return metadata.capture?.source === 'bank_statement_ocr'
}

// Helper to check if transaction is a credit card transaction
function isCreditCardTransaction(tx: Transaction): boolean {
  const metadata = tx.metadata as { capture?: { source?: string } }
  return metadata.capture?.source === 'credit_card_statement_ocr'
}

// Helper to check if transaction is a purchase receipt
function isPurchaseReceipt(tx: Transaction): boolean {
  const metadata = tx.metadata as { capture?: { source?: string; mechanism?: string } }
  const capture = metadata.capture
  return (
    capture?.source === 'purchase_invoice_ocr' ||
    capture?.mechanism === 'ocr' ||
    capture?.source?.includes('purchase') ||
    false
  )
}

// Helper to check if transaction has accounting entries
function hasAccountingEntries(tx: Transaction): boolean {
  const accounting = tx.accounting as {
    debits?: unknown[]
    credits?: unknown[]
  } | undefined
  return (
    (accounting?.debits?.length ?? 0) > 0 ||
    (accounting?.credits?.length ?? 0) > 0
  )
}

// Helper to check if transaction needs reconciliation
// Matches the exact logic from TransactionsScaffoldScreen
function needsReconciliation(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    reconciliation?: { status?: string }
  }
  const reconciliationStatus = metadata.reconciliation?.status
  
  // Check if it has accounting entries
  const hasEntries = hasAccountingEntries(tx)
  
  // Check if reconciled
  const isReconciled =
    reconciliationStatus === 'matched' ||
    reconciliationStatus === 'reconciled' ||
    reconciliationStatus === 'exception'

  // Needs reconciliation if:
  // - No accounting entries (no rule matched) - skip verification, go straight to reconciliation
  // - AND not yet reconciled
  // IMPORTANT: Do NOT include verified transactions with accounting entries here
  return !hasEntries && !isReconciled
}

// Helper to check if purchase receipt needs matching
// Only show receipts with reconciliation.status === 'unreconciled'
function receiptNeedsMatching(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    reconciliation?: { status?: string }
  }
  const reconciliationStatus = metadata.reconciliation?.status
  // Only show receipts that are explicitly 'unreconciled'
  return reconciliationStatus === 'unreconciled'
}

// Draggable card component
function DraggableCard({
  card,
  onDragEnd,
  isDragging,
  onDragStart,
}: {
  card: TransactionCard
  onDragEnd: (card: TransactionCard, x: number, y: number) => void
  isDragging: boolean
  onDragStart?: (card: TransactionCard) => void
}) {
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const scale = useSharedValue(1)

  // Simple Pan gesture that activates on vertical movement (won't conflict with horizontal ScrollView)
  const panGesture = Gesture.Pan()
    .activeOffsetY([-8, 8]) // Activate when moving vertically (distinguishes from horizontal scroll)
    .minDistance(5)
    .onStart(() => {
      scale.value = withSpring(1.15)
      if (onDragStart) {
        runOnJS(onDragStart)(card)
      }
    })
    .onUpdate((e) => {
      translateX.value = e.translationX
      translateY.value = e.translationY
    })
    .onEnd((e) => {
      scale.value = withSpring(1)
      runOnJS(onDragEnd)(card, e.absoluteX, e.absoluteY)
      translateX.value = withSpring(0)
      translateY.value = withSpring(0)
    })
    .onFinalize(() => {
      scale.value = withSpring(1)
      translateX.value = withSpring(0)
      translateY.value = withSpring(0)
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: isDragging ? 1000 : 1,
  }))

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.draggableCard, animatedStyle]}>
        <View style={styles.cardHeader}>
          <MaterialIcons
            name={card.type === 'receipt' ? 'receipt' : card.type === 'bank' ? 'account-balance' : 'credit-card'}
            size={16}
            color={GRAYSCALE_PRIMARY}
          />
          <Text style={styles.cardType}>
            {card.type === 'receipt' ? 'Receipt' : card.type === 'bank' ? 'Bank' : 'Card'}
          </Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {card.title || 'No title'}
        </Text>
        <Text style={styles.cardAmount}>{card.amount || '$0.00'}</Text>
      </Animated.View>
    </GestureDetector>
  )
}

// Drop zone for receipt cards
function ReceiptDropZone({
  receipt,
  onDrop,
  isHighlighted,
}: {
  receipt: TransactionCard
  onDrop: (receipt: TransactionCard) => void
  isHighlighted: boolean
}) {
  // Format date if available
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <TouchableOpacity
      style={[
        styles.dropZone,
        isHighlighted && styles.dropZoneHighlighted,
      ]}
      onPress={() => onDrop(receipt)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <MaterialIcons name="receipt" size={16} color={GRAYSCALE_PRIMARY} />
        <Text style={styles.cardType}>Purchase Receipt</Text>
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {receipt.title || 'No title'}
      </Text>
      {receipt.description && (
        <Text style={styles.cardDescription} numberOfLines={1}>
          {receipt.description}
        </Text>
      )}
      {receipt.date && (
        <Text style={styles.cardDate}>{formatDate(receipt.date)}</Text>
      )}
      <Text style={styles.cardAmount}>{receipt.amount || '$0.00'}</Text>
      {isHighlighted && (
        <View style={styles.matchIndicator}>
          <MaterialIcons name="check-circle" size={20} color={MATCH_COLOR} />
          <Text style={styles.matchText}>Drop here to match</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

type DragDropReconciliationScreenProps = {
  visible: boolean
  onClose: () => void
  section: 'bank' | 'cards'
  businessId: string
}

export default function DragDropReconciliationScreen({
  visible,
  onClose,
  section,
  businessId,
}: DragDropReconciliationScreenProps) {
  const [bankOrCardTransactions, setBankOrCardTransactions] = useState<TransactionCard[]>([])
  const [receiptTransactions, setReceiptTransactions] = useState<TransactionCard[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedCard, setDraggedCard] = useState<TransactionCard | null>(null)
  const [highlightedReceipt, setHighlightedReceipt] = useState<string | null>(null)

  // Fetch transactions that need reconciliation
  useEffect(() => {
    if (!visible || !businessId) return

    const fetchTransactions = async () => {
      try {
        setLoading(true)
        const response = await transactions2Api.getTransactions(businessId, {
          page: 1,
          limit: 200,
        })

        console.log('DragDrop: Total transactions fetched:', response.transactions.length)
        console.log('DragDrop: Section:', section)
        console.log('DragDrop: Business ID:', businessId)

        // Debug: Log all transaction types
        const bankTxs = response.transactions.filter(isBankTransaction)
        const cardTxs = response.transactions.filter(isCreditCardTransaction)
        const receiptTxs = response.transactions.filter(isPurchaseReceipt)
        console.log('DragDrop: Bank transactions:', bankTxs.length)
        console.log('DragDrop: Card transactions:', cardTxs.length)
        console.log('DragDrop: Receipt transactions:', receiptTxs.length)

        // Filter bank/CC transactions that need reconciliation
        // Use exact same logic as TransactionsScaffoldScreen
        const bankOrCardTxs = response.transactions
          .filter((tx) => {
            // Must be correct transaction type based on section
            if (section === 'bank') {
              if (!isBankTransaction(tx)) {
                return false
              }
            } else if (section === 'cards') {
              if (!isCreditCardTransaction(tx)) {
                return false
              }
            } else {
              // Unknown section, filter out
              return false
            }

            const metadata = tx.metadata as {
              reconciliation?: { status?: string }
            }
            const reconciliationStatus = metadata.reconciliation?.status

            // Check if it has accounting entries
            const hasEntries = hasAccountingEntries(tx)
            
            // Check if reconciled
            const isReconciled =
              reconciliationStatus === 'matched' ||
              reconciliationStatus === 'reconciled' ||
              reconciliationStatus === 'exception'

            // Needs reconciliation if:
            // - No accounting entries (no rule matched) - skip verification, go straight to reconciliation
            // - AND not yet reconciled
            const needsRecon = !hasEntries && !isReconciled
            
            // Debug log
            console.log(`DragDrop: ${section} tx:`, tx.id, {
              txType: section === 'bank' ? 'bank' : 'card',
              reconciliationStatus: reconciliationStatus || 'undefined',
              hasAccountingEntries: hasEntries,
              isReconciled,
              needsReconciliation: needsRecon,
            })
            
            return needsRecon
          })
          .map((tx) => ({
            id: tx.id,
            title: tx.summary.thirdPartyName,
            amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
            amountValue: tx.summary.totalAmount,
            currency: tx.summary.currency,
            originalTransaction: tx,
            type: (section === 'bank' ? 'bank' : 'card') as 'bank' | 'card',
          }))

        // Filter purchase receipts that need matching
        const receiptTxsFiltered = response.transactions
          .filter((tx) => {
            const isReceipt = isPurchaseReceipt(tx)
            if (!isReceipt) return false
            
            const needsMatch = receiptNeedsMatching(tx)
            const metadata = tx.metadata as { reconciliation?: { status?: string } }
            console.log('DragDrop: Receipt:', tx.id, {
              reconciliationStatus: metadata.reconciliation?.status || 'undefined',
              needsMatching: needsMatch,
            })
            
            return needsMatch
          })
          .map((tx) => ({
            id: tx.id,
            title: tx.summary.thirdPartyName,
            amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
            amountValue: tx.summary.totalAmount,
            currency: tx.summary.currency,
            date: tx.summary.transactionDate,
            description: tx.summary.description,
            originalTransaction: tx,
            type: 'receipt' as const,
          }))

        console.log('DragDrop: Bank/Card transactions that need reconciliation:', bankOrCardTxs.length)
        console.log('DragDrop: Receipt transactions that need matching:', receiptTxsFiltered.length)

        setBankOrCardTransactions(bankOrCardTxs)
        setReceiptTransactions(receiptTxsFiltered)
      } catch (error) {
        console.error('Failed to fetch transactions:', error)
        Alert.alert('Error', 'Failed to load transactions')
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [visible, businessId, section])

  // Handle drag end - check if dropped on a matching receipt
  const handleDragEnd = useCallback(
    (card: TransactionCard, x: number, y: number) => {
      const wasDragging = draggedCard?.id === card.id
      setDraggedCard(null)
      setHighlightedReceipt(null)

      // Find receipt at drop position (simplified - in real implementation, use layout measurements)
      // For now, we'll use amount matching
      const matchingReceipt = receiptTransactions.find(
        (receipt) =>
          Math.abs(receipt.amountValue - card.amountValue) < 0.01 &&
          receipt.currency === card.currency
      )

      if (matchingReceipt) {
        handleMatch(card, matchingReceipt)
      }
    },
    [receiptTransactions]
  )

  // Handle manual match (when user taps on a receipt)
  const handleManualMatch = useCallback(
    (receipt: TransactionCard) => {
      if (!draggedCard) {
        // If no card is being dragged, show matching receipts
        const matchingCards = bankOrCardTransactions.filter(
          (card) =>
            Math.abs(card.amountValue - receipt.amountValue) < 0.01 &&
            card.currency === receipt.currency
        )

        if (matchingCards.length === 1) {
          handleMatch(matchingCards[0], receipt)
        } else if (matchingCards.length > 1) {
          Alert.alert(
            'Multiple Matches',
            `Found ${matchingCards.length} transactions with matching amount. Please drag one to match.`
          )
        } else {
          Alert.alert('No Match', 'No transactions found with matching amount.')
        }
        return
      }

      // Check if amounts match
      if (
        Math.abs(draggedCard.amountValue - receipt.amountValue) < 0.01 &&
        draggedCard.currency === receipt.currency
      ) {
        handleMatch(draggedCard, receipt)
      } else {
        Alert.alert('Amount Mismatch', 'Amounts do not match. Please match transactions with equal amounts.')
        setDraggedCard(null)
        setHighlightedReceipt(null)
      }
    },
    [draggedCard, bankOrCardTransactions]
  )

  // Handle the actual match/reconciliation
  const handleMatch = useCallback(
    async (bankOrCard: TransactionCard, receipt: TransactionCard) => {
      try {
        // Call reconciliation API to trigger automatic matching
        // The API will match transactions based on amount, date, and supplier name
        // Note: For now we trigger the full reconciliation - in the future we might have
        // a specific endpoint for manual matches
        if (section === 'bank') {
          await reconciliationApi.reconcileBank(businessId)
        } else {
          await reconciliationApi.reconcileCreditCard(businessId)
        }

        Alert.alert(
          'Matched!',
          `Successfully matched ${bankOrCard.title} with ${receipt.title}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh transactions
                const fetchTransactions = async () => {
                      const response = await transactions2Api.getTransactions(businessId, {
                        page: 1,
                        limit: 200,
                      })
                      const bankOrCardTxs = response.transactions
                        .filter((tx) => {
                          if (section === 'bank') {
                            return isBankTransaction(tx) && needsReconciliation(tx)
                          } else {
                            return isCreditCardTransaction(tx) && needsReconciliation(tx)
                          }
                        })
                        .map((tx) => ({
                          id: tx.id,
                          title: tx.summary.thirdPartyName,
                          amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
                          amountValue: tx.summary.totalAmount,
                          currency: tx.summary.currency,
                          originalTransaction: tx,
                          type: (section === 'bank' ? 'bank' : 'card') as 'bank' | 'card',
                        }))
                      const receiptTxs = response.transactions
                        .filter((tx) => isPurchaseReceipt(tx) && receiptNeedsMatching(tx))
                        .map((tx) => ({
                          id: tx.id,
                          title: tx.summary.thirdPartyName,
                          amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
                          amountValue: tx.summary.totalAmount,
                          currency: tx.summary.currency,
                          originalTransaction: tx,
                          type: 'receipt' as const,
                        }))
                      setBankOrCardTransactions(bankOrCardTxs)
                      setReceiptTransactions(receiptTxs)
                    }
                    fetchTransactions()
              },
            },
          ]
        )

        setDraggedCard(null)
        setHighlightedReceipt(null)
      } catch (error) {
        console.error('Failed to reconcile:', error)
        Alert.alert('Error', 'Failed to reconcile transactions')
      }
    },
    [businessId, section]
  )

  // Highlight matching receipts when dragging
  const handleDragStart = useCallback(
    (card: TransactionCard) => {
      setDraggedCard(card)
      // Highlight receipts with matching amounts
      const matchingReceipt = receiptTransactions.find(
        (receipt) =>
          Math.abs(receipt.amountValue - card.amountValue) < 0.01 &&
          receipt.currency === card.currency
      )
      if (matchingReceipt) {
        setHighlightedReceipt(matchingReceipt.id)
      }
    },
    [receiptTransactions]
  )

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Drag to Reconcile</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {section === 'bank' ? 'Bank Transactions' : 'Credit Card Transactions'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                Drag to match with receipts ({bankOrCardTransactions.length} {bankOrCardTransactions.length === 1 ? 'transaction' : 'transactions'})
              </Text>
              {bankOrCardTransactions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No transactions to reconcile</Text>
                </View>
              ) : (
                <ScrollView 
                  style={styles.cardsContainer} 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScrollContent}
                  scrollEnabled={!draggedCard}
                >
                  {bankOrCardTransactions.map((card) => (
                    <DraggableCard
                      key={card.id}
                      card={card}
                      onDragEnd={handleDragEnd}
                      onDragStart={handleDragStart}
                      isDragging={draggedCard?.id === card.id}
                    />
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Purchase Receipts</Text>
              <Text style={styles.sectionSubtitle}>
                Drop bank/card transactions here to match ({receiptTransactions.length} {receiptTransactions.length === 1 ? 'receipt' : 'receipts'})
              </Text>
              {receiptTransactions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No receipts available for matching</Text>
                </View>
              ) : (
                <ScrollView style={styles.cardsContainer}>
                  <View style={styles.receiptsGrid}>
                    {receiptTransactions.map((receipt) => (
                      <ReceiptDropZone
                        key={receipt.id}
                        receipt={receipt}
                        onDrop={handleManualMatch}
                        isHighlighted={highlightedReceipt === receipt.id}
                      />
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        )}
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE_BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    minHeight: 150,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
    marginBottom: 12,
  },
  cardsContainer: {
    minHeight: 150,
  },
  horizontalScrollContent: {
    paddingRight: 16,
  },
  receiptsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  draggableCard: {
    width: 140,
    height: 120,
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropZone: {
    width: '48%',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    borderStyle: 'dashed',
    minHeight: 140,
    justifyContent: 'flex-start',
  },
  dropZoneHighlighted: {
    borderColor: MATCH_COLOR,
    backgroundColor: DROP_ZONE_COLOR,
    borderStyle: 'solid',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardType: {
    fontSize: 11,
    fontWeight: '600',
    color: GRAYSCALE_SECONDARY,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 11,
    color: GRAYSCALE_SECONDARY,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 11,
    color: GRAYSCALE_SECONDARY,
    marginBottom: 8,
  },
  cardAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginTop: 'auto',
  },
  matchIndicator: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchText: {
    fontSize: 11,
    color: MATCH_COLOR,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginHorizontal: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
})

