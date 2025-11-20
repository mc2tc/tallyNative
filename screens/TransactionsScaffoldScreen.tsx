import React, { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { MaterialIcons } from '@expo/vector-icons'
import { AppBarLayout } from '../components/AppBarLayout'
import type { ScaffoldStackParamList } from '../navigation/ScaffoldNavigator'
import { useAuth } from '../lib/auth/AuthContext'
import { transactions2Api, type Transaction } from '../lib/api/transactions2'
import { formatAmount } from '../lib/utils/currency'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type PipelineColumn = {
  title: string
  actions: string[]
  transactions?: Array<TransactionStub & { originalTransaction?: Transaction }>
}

type TransactionStub = {
  id: string
  title: string
  amount: string
  subtitle?: string
  verificationItems?: Array<{ label: string; confirmed?: boolean }>
}

// Helper function to parse transaction into TransactionStub
function parseTransaction(tx: Transaction): TransactionStub | null {
  const metadata = tx.metadata as {
    capture?: { source?: string; mechanism?: string }
    verification?: { status?: string }
  }
  const capture = metadata.capture
  const verification = metadata.verification
  const accounting = tx.accounting as
    | {
        paymentBreakdown?: Array<{ userConfirmed?: boolean }>
      }
    | undefined
  const details = tx.details as
    | {
        itemList?: Array<{ debitAccountConfirmed?: boolean }>
      }
    | undefined

  // Check if this is a receipt (purchase_invoice_ocr or similar)
  const isReceipt =
    capture?.source === 'purchase_invoice_ocr' ||
    capture?.mechanism === 'ocr' ||
    capture?.source?.includes('purchase')

  if (!isReceipt) {
    return null
  }

  const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)

  // Check verification status
  const isUnverified = verification?.status === 'unverified'

  if (isUnverified) {
    // Return simple transaction card - verification details will be shown on click
    return {
      id: tx.id,
      title: tx.summary.thirdPartyName,
      amount,
    }
  }

  // For verified transactions, return without verification items
  return {
    id: tx.id,
    title: tx.summary.thirdPartyName,
    amount,
  }
}


const unmatchedBankRecordsTransactions: TransactionStub[] = [
  { id: 'ubr1', title: 'HSBC Direct Debit', amount: '£120.00' },
  { id: 'ubr2', title: 'Barclays Transfer', amount: '£450.50' },
  { id: 'ubr3', title: 'NatWest Payment', amount: '£89.99' },
]

const bankColumns: PipelineColumn[] = [
  {
    title: 'Unmatched Bank Records',
    actions: ['View all'],
    transactions: unmatchedBankRecordsTransactions,
  },
  {
    title: 'Bank Exceptions',
    actions: ['View all', '+ Add rules'],
  },
]

const unmatchedCardRecordsTransactions: TransactionStub[] = [
  { id: 'ucr1', title: 'Amex Corporate Card', amount: '£89.50' },
  { id: 'ucr2', title: 'Visa Business Card', amount: '£234.00' },
  { id: 'ucr3', title: 'Mastercard Company', amount: '£156.75' },
]

const cardsColumns: PipelineColumn[] = [
  {
    title: 'Unmatched Card Records',
    actions: ['View all'],
    transactions: unmatchedCardRecordsTransactions,
  },
  {
    title: 'Card Exceptions',
    actions: ['View all', '+ Add rules'],
  },
]

type SectionKey = 'receipts' | 'bank' | 'cards' | 'reporting'

const sectionNav: Array<{ key: SectionKey; label: string }> = [
  { key: 'receipts', label: 'Receipts Pipeline' },
  { key: 'bank', label: 'Bank Pipeline' },
  { key: 'cards', label: 'Cards Pipeline' },
  { key: 'reporting', label: 'Reporting Ready' },
]

const bankAccounts = [
  { id: 'acc1', lastFour: '1234' },
  { id: 'acc2', lastFour: '5678' },
]

const cards = [
  { id: 'card1', lastFour: '9012' },
  { id: 'card2', lastFour: '3456' },
]

export default function TransactionsScaffoldScreen() {
  const navigation = useNavigation<StackNavigationProp<ScaffoldStackParamList>>()
  const { businessUser, memberships } = useAuth()
  const [activeSection, setActiveSection] = useState<SectionKey>('receipts')
  const [navAtEnd, setNavAtEnd] = useState(false)
  const [selectedBankAccount, setSelectedBankAccount] = useState<string | null>(bankAccounts[0]?.id || null)
  const [selectedCard, setSelectedCard] = useState<string | null>(cards[0]?.id || null)
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  // Choose businessId (same logic as TransactionsScreen)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  // Fetch transactions
  useFocusEffect(
    useCallback(() => {
      if (!businessId) {
        setLoading(false)
        return
      }

      const fetchTransactions = async () => {
        try {
          setLoading(true)
          const response = await transactions2Api.getTransactions(businessId, {
            page: 1,
            limit: 100, // Fetch more to categorize properly
            classificationKind: 'purchase',
          })
          setAllTransactions(response.transactions)
        } catch (error) {
          console.error('Failed to fetch transactions:', error)
          setAllTransactions([])
        } finally {
          setLoading(false)
        }
      }

      fetchTransactions()
    }, [businessId]),
  )

  // Parse and categorize transactions
  const parsedTransactions = allTransactions
    .map((tx) => ({ original: tx, parsed: parseTransaction(tx) }))
    .filter((item): item is { original: Transaction; parsed: TransactionStub } => item.parsed !== null)

  const needsVerificationTransactions = parsedTransactions
    .filter((item) => {
      const metadata = item.original.metadata as {
        verification?: { status?: string }
      }
      return metadata.verification?.status === 'unverified'
    })
    .map((item) => ({ ...item.parsed, originalTransaction: item.original }))

  const verifiedNeedsMatchTransactions = parsedTransactions
    .filter((item) => {
      const metadata = item.original.metadata as {
        verification?: { status?: string }
      }
      return metadata.verification?.status !== 'unverified'
    })
    .map((item) => ({ ...item.parsed, originalTransaction: item.original }))

  // Update receiptColumns with real data
  const receiptColumnsWithData: PipelineColumn[] = [
    {
      title: 'Needs Verification',
      actions: ['View all'],
      transactions: needsVerificationTransactions,
    },
    {
      title: 'Verified, Needs Match',
      actions: ['View all'],
      transactions: verifiedNeedsMatchTransactions,
    },
  ]

  return (
    <AppBarLayout>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.heroTitle}>Transactions</Text>
        <View style={styles.heroActionsRow}>
          <TouchableOpacity activeOpacity={0.8} style={[styles.ctaButton, styles.secondaryCta]}>
            <View style={styles.ctaContent}>
              <MaterialIcons name="add" size={18} color={GRAYSCALE_PRIMARY} />
              <Text style={styles.ctaText}>Add</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} style={[styles.ctaButton, styles.primaryCta]}>
            <View style={styles.ctaContent}>
              <MaterialIcons name="autorenew" size={18} color={GRAYSCALE_PRIMARY} />
              <Text style={styles.ctaText}>Reconcile</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionNavWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sectionNav}
            onScroll={(event) => {
              const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent
              const reachedEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 4
              setNavAtEnd(reachedEnd)
            }}
            scrollEventThrottle={16}
          >
            {sectionNav.map((section) => {
              const isActive = section.key === activeSection
              return (
                <TouchableOpacity
                  key={section.key}
                  style={[styles.navButton, isActive && styles.navButtonActive]}
                  activeOpacity={0.8}
                  onPress={() => setActiveSection(section.key)}
                >
                  <Text style={[styles.navButtonText, isActive && styles.navButtonTextActive]}>
                    {section.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
          {!navAtEnd && <View pointerEvents="none" style={styles.navFadeRight} />}
        </View>

        {activeSection === 'bank' && (
          <View style={styles.bankAccountNavWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bankAccountNav}
            >
              {bankAccounts.map((account) => {
                const isActive = selectedBankAccount === account.id
                return (
                  <TouchableOpacity
                    key={account.id}
                    style={[styles.bankAccountButton, isActive && styles.bankAccountButtonActive]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedBankAccount(account.id)}
                  >
                    <Text style={[styles.bankAccountText, isActive && styles.bankAccountTextActive]}>
                      •••• {account.lastFour}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {activeSection === 'cards' && (
          <View style={styles.bankAccountNavWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bankAccountNav}
            >
              {cards.map((card) => {
                const isActive = selectedCard === card.id
                return (
                  <TouchableOpacity
                    key={card.id}
                    style={[styles.bankAccountButton, isActive && styles.bankAccountButtonActive]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedCard(card.id)}
                  >
                    <Text style={[styles.bankAccountText, isActive && styles.bankAccountTextActive]}>
                      •••• {card.lastFour}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {renderSection(activeSection, navigation, receiptColumnsWithData)}
      </ScrollView>
    </AppBarLayout>
  )
}

function renderSection(
  section: SectionKey,
  navigation: StackNavigationProp<ScaffoldStackParamList>,
  receiptColumns: PipelineColumn[],
) {
  switch (section) {
    case 'receipts':
      return <PipelineRow columns={receiptColumns} navigation={navigation} />
    case 'bank':
      return <PipelineRow columns={bankColumns} navigation={navigation} />
    case 'cards':
      return <PipelineRow columns={cardsColumns} navigation={navigation} />
    case 'reporting':
      const reportingItems = [
        { id: 'rr1', title: 'Deliveroo', amount: '£58.20', subtitle: 'Receipt • Matched' },
        { id: 'rr2', title: 'HSBC Feed', amount: '£1,120.00', subtitle: 'Bank record • Posted' },
        { id: 'rr3', title: 'Stripe Payout', amount: '£820.45', subtitle: 'Integration • Locked' },
      ]
      return (
        <View style={styles.reportingCard}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.sectionHeader}>Reporting Ready (all sources)</Text>
            <TouchableOpacity activeOpacity={0.6} style={styles.infoButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="info-outline" size={16} color={GRAYSCALE_SECONDARY} />
            </TouchableOpacity>
          </View>
          <CardList items={reportingItems} />
          <View style={styles.pipelineActions}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.linkButton}
              onPress={() =>
                navigation.navigate('ScaffoldViewAll', {
                  section: 'reporting',
                  title: 'Reporting Ready (all sources)',
                  items: reportingItems,
                })
              }
            >
              <Text style={styles.linkButtonText}>View all</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.linkButton}>
              <Text style={styles.linkButtonText}>Go to reports</Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    default:
      return null
  }
}

function PipelineRow({
  columns,
  navigation,
}: {
  columns: PipelineColumn[]
  navigation: StackNavigationProp<ScaffoldStackParamList>
}) {
  const handleViewAll = (column: PipelineColumn) => {
    const items = column.transactions || []
    navigation.navigate('ScaffoldViewAll', {
      section: column.title,
      title: column.title,
      items,
    })
  }

  return (
    <View style={styles.pipelineColumnStack}>
      {columns.map((column) => (
        <View key={column.title} style={styles.pipelineCard}>
          <View style={styles.pipelineTitleRow}>
            <Text style={styles.pipelineTitle}>{column.title}</Text>
            <TouchableOpacity activeOpacity={0.6} style={styles.infoButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="info-outline" size={16} color={GRAYSCALE_SECONDARY} />
            </TouchableOpacity>
          </View>
          <CardList items={column.transactions || []} navigation={navigation} />
          {column.actions.length > 0 ? (
            <View style={styles.pipelineActions}>
              {column.actions.map((action) => (
                <TouchableOpacity
                  key={action}
                  activeOpacity={0.7}
                  style={styles.linkButton}
                  onPress={() => action === 'View all' && handleViewAll(column)}
                >
                  <Text style={styles.linkButtonText}>{action}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  )
}

function CardList({
  items,
  navigation,
}: {
  items: Array<TransactionStub & { originalTransaction?: Transaction }>
  navigation?: StackNavigationProp<ScaffoldStackParamList>
}) {
  const handleCardPress = (item: TransactionStub & { originalTransaction?: Transaction }) => {
    if (item.originalTransaction && navigation) {
      navigation.navigate('TransactionDetail', { transaction: item.originalTransaction })
    }
  }

  return (
    <View style={styles.cardList}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.cardListItem}
          onPress={() => handleCardPress(item)}
          activeOpacity={0.7}
          disabled={!item.originalTransaction || !navigation}
        >
          <View style={styles.cardTextGroup}>
            <Text style={styles.cardTitle}>{item.title}</Text>
          </View>
          <Text style={styles.cardAmount}>{item.amount}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  sectionNavWrapper: {
    position: 'relative',
  },
  sectionNav: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    paddingHorizontal: 2,
    marginTop: 12,
    marginBottom: 16,
  },
  navFadeRight: {
    position: 'absolute',
    top: 12,
    bottom: 16,
    right: 0,
    width: 32,
    backgroundColor: 'rgba(246, 246, 246, 0.9)',
  },
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    backgroundColor: '#ffffff',
  },
  navButtonActive: {
    borderColor: '#4a4a4a',
    backgroundColor: '#f0f0f0',
  },
  navButtonText: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '500',
  },
  navButtonTextActive: {
    color: GRAYSCALE_PRIMARY,
  },
  bankAccountNavWrapper: {
    marginTop: 8,
    marginBottom: 16,
  },
  bankAccountNav: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 2,
  },
  bankAccountButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    backgroundColor: '#ffffff',
  },
  bankAccountButtonActive: {
    borderColor: '#4a4a4a',
    backgroundColor: '#f0f0f0',
  },
  bankAccountText: {
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '500',
  },
  bankAccountTextActive: {
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 32,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 10,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  ctaButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryCta: {
    backgroundColor: '#ffffff',
    borderColor: '#dcdcdc',
  },
  ctaText: {
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
  },
  secondaryCta: {
    backgroundColor: SURFACE_BACKGROUND,
    borderColor: '#dcdcdc',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pipelineColumnStack: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 24,
  },
  pipelineCard: {
    flex: 1,
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
    padding: 16,
  },
  pipelineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pipelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    flex: 1,
  },
  infoButton: {
    padding: 4,
    marginLeft: 8,
  },
  pipelineActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkButtonText: {
    fontSize: 13,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
  },
  cardList: {
    gap: 8,
  },
  cardListItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    backgroundColor: '#fbfbfb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  cardSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
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
  cardAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  reportingCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 24,
  },
  bodyText: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    marginTop: 4,
  },
  metric: {
    fontSize: 18,
    fontWeight: '700',
    color: GRAYSCALE_PRIMARY,
    marginVertical: 16,
  },
  dualActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  outlineButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d3d3d3',
    alignItems: 'center',
  },
  outlineButtonText: {
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
  },
  integrationCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
})

