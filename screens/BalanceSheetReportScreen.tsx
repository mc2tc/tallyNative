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
import type { NavigationProp } from '@react-navigation/native'
import {
  chartAccountsApi,
  type ChartAccount,
  type ChartAccountsResponse,
} from '../lib/api/chartAccounts'
import { useAuth } from '../lib/auth/AuthContext'
import { formatAmount } from '../lib/utils/currency'
import { AppBarLayout } from '../components/AppBarLayout'
import type { ReportsStackParamList } from '../navigation/ReportsNavigator'

const GRAYSCALE_PRIMARY = '#4a4a4a'

export default function BalanceSheetReportScreen() {
  const navigation = useNavigation<NavigationProp<ReportsStackParamList>>()
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId
  const [data, setData] = useState<ChartAccountsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  useEffect(() => {
    let isActive = true

    if (!businessId) {
      setData(null)
      setError('Select a business to view chart accounts.')
      setLoading(false)
      return
    }

    const fetchChartAccounts = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await chartAccountsApi.getRawAccounts(businessId, {
          withValues: true,
        })
        const normalizedAccounts =
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
        const filteredAccounts = normalizedAccounts.filter((account) =>
          ['asset', 'liability', 'equity'].includes(account.type ?? ''),
        )

        // Also keep income/expense accounts for net profit calculation
        const incomeExpenseAccounts = normalizedAccounts.filter(
          (account) => account.type === 'income' || account.type === 'expense',
        )

        if (!isActive) return

        setData({
          ...response,
          accounts: filteredAccounts,
          // Store income/expense accounts separately for net profit calculation
          incomeExpenseAccounts,
        } as ChartAccountsResponse & { incomeExpenseAccounts?: ChartAccount[] })
      } catch (err) {
        if (!isActive) return
        const message = err instanceof Error ? err.message : 'Failed to load chart accounts.'
        setError(message)
        setData(null)
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    void fetchChartAccounts()

    return () => {
      isActive = false
    }
  }, [businessId])

  const {
    assetAccounts,
    liabilityAccounts,
    equityAccounts,
    totalAssets,
    totalLiabilities,
    totalEquity,
    netProfit,
    balance,
  } = useMemo(() => {
    const assets: ChartAccount[] = []
    const liabilities: ChartAccount[] = []
    const equity: ChartAccount[] = []

    for (const account of data?.accounts ?? []) {
      if (!account || typeof account !== 'object') continue
      if (account.type === 'asset') {
        assets.push(account)
      } else if (account.type === 'liability') {
        liabilities.push(account)
      } else if (account.type === 'equity') {
        equity.push(account)
      }
    }

    // Calculate net profit from income/expense accounts
    const incomeExpenseAccounts =
      (data as ChartAccountsResponse & { incomeExpenseAccounts?: ChartAccount[] })
        ?.incomeExpenseAccounts ?? []
    const totalIncome = incomeExpenseAccounts
      .filter((acc) => acc.type === 'income')
      .reduce((sum, acc) => sum + (acc.value ?? 0), 0)
    const totalExpenses = incomeExpenseAccounts
      .filter((acc) => acc.type === 'expense')
      .reduce((sum, acc) => sum + (acc.value ?? 0), 0)
    const netProfit = totalIncome - totalExpenses

    const totalAssets = assets.reduce((sum, acc) => sum + (acc.value ?? 0), 0)
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + (acc.value ?? 0), 0)
    // Include net profit in total equity (as retained earnings)
    const totalEquity = equity.reduce((sum, acc) => sum + (acc.value ?? 0), 0) + netProfit
    const balance = totalAssets - (totalLiabilities + totalEquity)

    return {
      assetAccounts: assets,
      liabilityAccounts: liabilities,
      equityAccounts: equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      netProfit,
      balance,
    }
  }, [data])

  const hasAccounts =
    assetAccounts.length > 0 || liabilityAccounts.length > 0 || equityAccounts.length > 0
  const hasValues = data?.period !== undefined

  const handleAccountPress = useCallback(
    (account: ChartAccount, accountType: 'asset' | 'liability' | 'equity') => {
      navigation.navigate('AccountLedger', {
        accountName: account.name,
        accountType,
        accountValue: account.value,
        period: data?.period,
      })
    },
    [navigation, data?.period],
  )

  return (
    <AppBarLayout title="Reports" onBackPress={handleGoBack}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {!businessId && (
            <Text style={styles.statusText}>No business context found for this account.</Text>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}

          {!error && (
          <>
            {!hasAccounts && (
              <Text style={styles.statusText}>
                No asset, liability, or equity accounts available yet.
              </Text>
            )}

            {hasAccounts && (
              <View style={styles.statementCard}>
                <Text style={styles.cardTitle}>Balance Sheet</Text>
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
                  <Text style={styles.sectionLabel}>Assets</Text>
                  {assetAccounts.map((account) => (
                    <TouchableOpacity
                      key={`${account.id ?? account.name}-asset`}
                      style={styles.accountRow}
                      onPress={() => handleAccountPress(account, 'asset')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountValue}>
                        {hasValues && account.value !== undefined
                          ? formatAmount(account.value, 'GBP', true)
                          : '—'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {assetAccounts.length === 0 && (
                    <Text style={styles.emptyHint}>No asset accounts yet</Text>
                  )}
                  {hasValues && assetAccounts.length > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Total Assets</Text>
                      <Text style={styles.totalValue}>
                        £{formatAmount(totalAssets, 'GBP', true)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.sectionDivider} />

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Liabilities</Text>
                  {liabilityAccounts.map((account) => (
                    <TouchableOpacity
                      key={`${account.id ?? account.name}-liability`}
                      style={styles.accountRow}
                      onPress={() => handleAccountPress(account, 'liability')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountValue}>
                        {hasValues && account.value !== undefined
                          ? formatAmount(account.value, 'GBP', true)
                          : '—'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {liabilityAccounts.length === 0 && (
                    <Text style={styles.emptyHint}>No liability accounts yet</Text>
                  )}
                  {hasValues && liabilityAccounts.length > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Total Liabilities</Text>
                      <Text style={styles.totalValue}>
                        £{formatAmount(totalLiabilities, 'GBP', true)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.sectionDivider} />

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Equity</Text>
                  {equityAccounts.map((account) => (
                    <TouchableOpacity
                      key={`${account.id ?? account.name}-equity`}
                      style={styles.accountRow}
                      onPress={() => handleAccountPress(account, 'equity')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountValue}>
                        {hasValues && account.value !== undefined
                          ? formatAmount(account.value, 'GBP', true)
                          : '—'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {hasValues && netProfit !== undefined && (
                    <View style={styles.accountRow}>
                      <Text style={styles.accountName}>Retained Earnings</Text>
                      <Text style={styles.accountValue}>
                        {formatAmount(netProfit, 'GBP', true)}
                      </Text>
                    </View>
                  )}
                  {equityAccounts.length === 0 && !hasValues && (
                    <Text style={styles.emptyHint}>No equity accounts yet</Text>
                  )}
                  {hasValues && (equityAccounts.length > 0 || netProfit !== undefined) && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Total Equity</Text>
                      <Text style={styles.totalValue}>
                        £{formatAmount(totalEquity, 'GBP', true)}
                      </Text>
                    </View>
                  )}
                </View>

                {hasValues && (
                  <>
                    <View style={styles.sectionDivider} />
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceLabel}>
                        Total Liabilities + Equity
                      </Text>
                      <Text style={styles.balanceValue}>
                        £{formatAmount(totalLiabilities + totalEquity, 'GBP', true)}
                      </Text>
                    </View>
                    {Math.abs(balance) > 0.01 && (
                      <View style={styles.balanceCheckRow}>
                        <Text
                          style={[
                            styles.balanceCheckText,
                            balance !== 0 && styles.balanceCheckTextMismatch,
                          ]}
                        >
                          {balance === 0
                            ? 'Balance check: ✓'
                            : `Balance check: Assets ≠ Liabilities + Equity (diff: £${formatAmount(Math.abs(balance), 'GBP', true)})`}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}
          </>
          )}
        </ScrollView>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#333333',
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
  },
  balanceCheckRow: {
    paddingTop: 8,
  },
  balanceCheckText: {
    fontSize: 13,
    color: '#666666',
    fontStyle: 'italic',
  },
  balanceCheckTextMismatch: {
    color: '#b00020',
  },
})


