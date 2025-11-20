import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { AppBarLayout } from '../components/AppBarLayout'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type PipelineColumn = {
  title: string
  actions: string[]
}

type TransactionStub = {
  id: string
  title: string
  amount: string
  subtitle?: string
}

const defaultTransactions: TransactionStub[] = [
  { id: '1', title: 'Pret A Manger', amount: '£12.40', subtitle: 'Receipt • Needs verification' },
  { id: '2', title: 'Uber BV', amount: '£24.10', subtitle: 'Receipt • Awaiting match' },
  { id: '3', title: 'Apple.com/bill', amount: '£8.99', subtitle: 'Receipt • Missing account' },
]

const receiptColumns: PipelineColumn[] = [
  {
    title: 'Needs Verification',
    actions: ['View all'],
  },
  {
    title: 'Verified, Needs Match',
    actions: ['View all'],
  },
  {
    title: 'Receipt Exceptions',
    actions: ['View all'],
  },
]

const bankColumns: PipelineColumn[] = [
  {
    title: 'Unmatched Bank Records',
    actions: ['View all'],
  },
  {
    title: 'Bank Suggestions',
    actions: ['View all'],
  },
  {
    title: 'Bank Exceptions',
    actions: ['View all'],
  },
]

const cardsColumns: PipelineColumn[] = [
  {
    title: 'Corporate Cards',
    actions: ['View all'],
  },
  {
    title: 'Cards Awaiting Receipts',
    actions: ['View all'],
  },
  {
    title: 'Card Exceptions',
    actions: ['View all'],
  },
]

type SectionKey = 'receipts' | 'bank' | 'cards' | 'reporting'

const sectionNav: Array<{ key: SectionKey; label: string }> = [
  { key: 'receipts', label: 'Receipts Pipeline' },
  { key: 'bank', label: 'Bank Pipeline' },
  { key: 'cards', label: 'Cards Pipeline' },
  { key: 'reporting', label: 'Reporting Ready' },
]

export default function TransactionsScaffoldScreen() {
  const [activeSection, setActiveSection] = useState<SectionKey>('receipts')
  const [navAtEnd, setNavAtEnd] = useState(false)

  return (
    <AppBarLayout>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.heroTitle}>Transactions</Text>
        <View style={styles.heroActionsRow}>
          <TouchableOpacity activeOpacity={0.8} style={[styles.ctaButton, styles.primaryCta]}>
            <View style={styles.ctaContent}>
              <MaterialIcons name="autorenew" size={18} color={GRAYSCALE_PRIMARY} />
              <Text style={styles.ctaText}>Sync</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} style={[styles.ctaButton, styles.secondaryCta]}>
            <View style={styles.ctaContent}>
              <MaterialIcons name="add" size={18} color={GRAYSCALE_PRIMARY} />
              <Text style={styles.ctaText}>Add</Text>
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

        {renderSection(activeSection)}
      </ScrollView>
    </AppBarLayout>
  )
}

function renderSection(section: SectionKey) {
  switch (section) {
    case 'receipts':
      return <PipelineRow columns={receiptColumns} />
    case 'bank':
      return <PipelineRow columns={bankColumns} />
    case 'cards':
      return (
        <>
          <PipelineRow columns={cardsColumns} />
          <View style={styles.integrationCard}>
            <Text style={styles.sectionHeader}>Connected Apps / Integrations</Text>
            <Text style={styles.bodyText}>
              capture.mechanism = integration • source = system_generated
            </Text>
            <Text style={styles.bodyText}>
              Show newest items and their verification / reconciliation state.
            </Text>
            <TouchableOpacity activeOpacity={0.8} style={styles.primaryCta}>
              <Text style={styles.ctaText}>Review feed</Text>
            </TouchableOpacity>
          </View>
        </>
      )
    case 'reporting':
      return (
        <View style={styles.reportingCard}>
          <Text style={styles.sectionHeader}>Reporting Ready (all sources)</Text>
          <Text style={styles.bodyText}>
            Criteria: verification ∈ {'{verified, exception}'} AND reconciliation ∈ {'{matched, exception}'}
          </Text>
          <Text style={styles.metric}>Total amount ready: £XX,XXX</Text>
          <CardList
            items={[
              { id: 'rr1', title: 'Deliveroo', amount: '£58.20', subtitle: 'Receipt • Matched' },
              { id: 'rr2', title: 'HSBC Feed', amount: '£1,120.00', subtitle: 'Bank record • Posted' },
              { id: 'rr3', title: 'Stripe Payout', amount: '£820.45', subtitle: 'Integration • Locked' },
            ]}
          />
          <View style={styles.dualActions}>
            <TouchableOpacity activeOpacity={0.8} style={styles.outlineButton}>
              <Text style={styles.outlineButtonText}>View transactions</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={styles.outlineButton}>
              <Text style={styles.outlineButtonText}>Go to reports</Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    default:
      return null
  }
}

function PipelineRow({ columns }: { columns: PipelineColumn[] }) {
  return (
    <View style={styles.pipelineColumnStack}>
      {columns.map((column) => (
        <View key={column.title} style={styles.pipelineCard}>
          <Text style={styles.pipelineTitle}>{column.title}</Text>
          <CardList items={defaultTransactions} />
          {column.actions.length > 0 ? (
            <View style={styles.pipelineActions}>
              {column.actions.map((action) => (
                <TouchableOpacity key={action} activeOpacity={0.7} style={styles.linkButton}>
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

function CardList({ items }: { items: TransactionStub[] }) {
  return (
    <View style={styles.cardList}>
      {items.map((item) => (
        <View key={item.id} style={styles.cardListItem}>
          <View style={styles.cardTextGroup}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.subtitle ? <Text style={styles.cardSubtitle}>{item.subtitle}</Text> : null}
          </View>
          <Text style={styles.cardAmount}>{item.amount}</Text>
        </View>
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
  pipelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 12,
  },
  pipelineActions: {
    marginTop: 12,
    gap: 8,
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

