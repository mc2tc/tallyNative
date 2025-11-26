// TODO: Cashflow statement needs additional work - will revisit
// Current implementation shows basic cashflow categories with values
// Additional work needed on categorization and cashflow-specific logic

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { AppBarLayout } from '../components/AppBarLayout'
import {
  chartAccountsApi,
  type ChartAccount,
  type ChartAccountsResponse,
} from '../lib/api/chartAccounts'
import { useAuth } from '../lib/auth/AuthContext'
import { formatAmount } from '../lib/utils/currency'

export default function CashflowReportScreen() {
  const navigation = useNavigation()
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId
  const [data, setData] = useState<ChartAccountsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  useEffect(() => {
    let isActive = true

    if (!businessId) {
      setData(null)
      setError('Select a business to view cashflow data.')
      return
    }

    const fetchAccounts = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await chartAccountsApi.getRawAccounts(businessId, {
          withValues: true,
        })
        const normalized =
          (response.accounts ?? [])
            .map((account) => {
              if (!account) return null
              if (typeof account === 'string') {
                return { name: account }
              }
              if (typeof account === 'object' && typeof account.name === 'string') {
                return account as ChartAccount
              }
              return null
            })
            .filter((account): account is ChartAccount => account !== null) ?? []

        if (!isActive) return
        setData({
          ...response,
          accounts: normalized,
        })
      } catch (err) {
        if (!isActive) return
        const message = err instanceof Error ? err.message : 'Failed to load cashflow data.'
        setError(message)
        setData(null)
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    void fetchAccounts()

    return () => {
      isActive = false
    }
  }, [businessId])

  const {
    operatingAccounts,
    investingAccounts,
    financingAccounts,
    otherAccounts,
    totalOperating,
    totalInvesting,
    totalFinancing,
    totalOther,
    netCashFlow,
  } = useMemo(() => {
    const groups = {
      operatingAccounts: [] as ChartAccount[],
      investingAccounts: [] as ChartAccount[],
      financingAccounts: [] as ChartAccount[],
      otherAccounts: [] as ChartAccount[],
    }

    const classify = (account: ChartAccount) => {
      const candidateRaw =
        (typeof account.cashflowCategory === 'string' && account.cashflowCategory) ||
        (typeof account.activity === 'string' && account.activity) ||
        (typeof account.category === 'string' && account.category) ||
        account.type ||
        ''
      const candidate = candidateRaw.toLowerCase()
      if (candidate.includes('operat')) return 'operatingAccounts'
      if (candidate.includes('invest')) return 'investingAccounts'
      if (candidate.includes('financ')) return 'financingAccounts'
      return 'otherAccounts'
    }

    const accounts = data?.accounts ?? []
    for (const account of accounts) {
      if (!account || typeof account !== 'object') continue
      groups[classify(account)].push(account)
    }

    const totalOperating = groups.operatingAccounts.reduce(
      (sum, acc) => sum + (acc.value ?? 0),
      0,
    )
    const totalInvesting = groups.investingAccounts.reduce(
      (sum, acc) => sum + (acc.value ?? 0),
      0,
    )
    const totalFinancing = groups.financingAccounts.reduce(
      (sum, acc) => sum + (acc.value ?? 0),
      0,
    )
    const totalOther = groups.otherAccounts.reduce((sum, acc) => sum + (acc.value ?? 0), 0)
    const netCashFlow = totalOperating + totalInvesting + totalFinancing + totalOther

    return {
      operatingAccounts: groups.operatingAccounts,
      investingAccounts: groups.investingAccounts,
      financingAccounts: groups.financingAccounts,
      otherAccounts: groups.otherAccounts,
      totalOperating,
      totalInvesting,
      totalFinancing,
      totalOther,
      netCashFlow,
    }
  }, [data])

  const hasAccounts =
    operatingAccounts.length > 0 ||
    investingAccounts.length > 0 ||
    financingAccounts.length > 0 ||
    otherAccounts.length > 0
  const hasValues = data?.period !== undefined

  return (
    <AppBarLayout title="Reports" onBackPress={handleGoBack}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!businessId && (
          <Text style={styles.statusText}>No business context found for this account.</Text>
        )}
        {businessId && loading && (
          <View style={styles.loader}>
            <ActivityIndicator color="#444" />
            <Text style={styles.statusText}>Loading cashflow categories…</Text>
          </View>
        )}
        {businessId && !loading && error && <Text style={styles.errorText}>{error}</Text>}

        {businessId && !loading && !error && (
          <>
            {!hasAccounts && (
              <Text style={styles.statusText}>No cashflow-related accounts available yet.</Text>
            )}

            {hasAccounts && (
              <View style={styles.statementCard}>
                <Text style={styles.cardTitle}>Cashflow Statement</Text>
                {hasValues && data.period && (
                  <Text style={styles.periodText}>
                    {new Date(data.period.startDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    -{' '}
                    {new Date(data.period.endDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                )}

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Operating Activities</Text>
                  {operatingAccounts.map((account) => (
                    <View key={`${account.id ?? account.name}-operating`} style={styles.accountRow}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountValue}>
                        {hasValues && account.value !== undefined
                          ? formatAmount(account.value, 'GBP', true)
                          : '—'}
                      </Text>
                    </View>
                  ))}
                  {operatingAccounts.length === 0 && (
                    <Text style={styles.emptyHint}>No operating activity accounts yet</Text>
                  )}
                  {hasValues && operatingAccounts.length > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Net Operating Cash Flow</Text>
                      <Text style={styles.totalValue}>
                        £{formatAmount(totalOperating, 'GBP', true)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.sectionDivider} />

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Investing Activities</Text>
                  {investingAccounts.map((account) => (
                    <View key={`${account.id ?? account.name}-investing`} style={styles.accountRow}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountValue}>
                        {hasValues && account.value !== undefined
                          ? formatAmount(account.value, 'GBP', true)
                          : '—'}
                      </Text>
                    </View>
                  ))}
                  {investingAccounts.length === 0 && (
                    <Text style={styles.emptyHint}>No investing activity accounts yet</Text>
                  )}
                  {hasValues && investingAccounts.length > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Net Investing Cash Flow</Text>
                      <Text style={styles.totalValue}>
                        £{formatAmount(totalInvesting, 'GBP', true)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.sectionDivider} />

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Financing Activities</Text>
                  {financingAccounts.map((account) => (
                    <View key={`${account.id ?? account.name}-financing`} style={styles.accountRow}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountValue}>
                        {hasValues && account.value !== undefined
                          ? formatAmount(account.value, 'GBP', true)
                          : '—'}
                      </Text>
                    </View>
                  ))}
                  {financingAccounts.length === 0 && (
                    <Text style={styles.emptyHint}>No financing activity accounts yet</Text>
                  )}
                  {hasValues && financingAccounts.length > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Net Financing Cash Flow</Text>
                      <Text style={styles.totalValue}>
                        £{formatAmount(totalFinancing, 'GBP', true)}
                      </Text>
                    </View>
                  )}
                </View>

                {otherAccounts.length > 0 && (
                  <>
                    <View style={styles.sectionDivider} />
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>Other Movements</Text>
                      {otherAccounts.map((account) => (
                        <View key={`${account.id ?? account.name}-other`} style={styles.accountRow}>
                          <Text style={styles.accountName}>{account.name}</Text>
                          <Text style={styles.accountValue}>
                            {hasValues && account.value !== undefined
                              ? formatAmount(account.value, 'GBP', true)
                              : '—'}
                          </Text>
                        </View>
                      ))}
                      {hasValues && otherAccounts.length > 0 && (
                        <View style={styles.totalRow}>
                          <Text style={styles.totalLabel}>Net Other Cash Flow</Text>
                          <Text style={styles.totalValue}>
                            £{formatAmount(totalOther, 'GBP', true)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </>
                )}

                {hasValues && (
                  <>
                    <View style={styles.sectionDivider} />
                    <View style={styles.netCashFlowRow}>
                      <Text style={styles.netCashFlowLabel}>Net Cash Flow</Text>
                      <Text
                        style={[
                          styles.netCashFlowValue,
                          netCashFlow < 0 && styles.netCashFlowValueNegative,
                        ]}
                      >
                        £{formatAmount(Math.abs(netCashFlow), 'GBP', true)}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  statusText: {
    fontSize: 15,
    color: '#555555',
    marginTop: 12,
  },
  loader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  errorText: {
    color: '#b00020',
    fontSize: 14,
    marginTop: 12,
  },
  statementCard: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    padding: 20,
    gap: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 4,
  },
  periodText: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 12,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  accountName: {
    fontSize: 15,
    color: '#1f1f1f',
  },
  accountValue: {
    fontSize: 15,
    color: '#1f1f1f',
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: 14,
    color: '#888888',
    fontStyle: 'italic',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#efefef',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f1f1f',
  },
  netCashFlowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#333333',
  },
  netCashFlowLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },
  netCashFlowValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
  },
  netCashFlowValueNegative: {
    color: '#b00020',
  },
})


