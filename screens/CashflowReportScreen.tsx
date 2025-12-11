import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { AppBarLayout } from '../components/AppBarLayout'
import {
  chartAccountsApi,
  type CashflowStatementResponse,
} from '../lib/api/chartAccounts'
import { useAuth } from '../lib/auth/AuthContext'
import { formatAmount } from '../lib/utils/currency'

export default function CashflowReportScreen() {
  const navigation = useNavigation()
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId
  const [data, setData] = useState<CashflowStatementResponse | null>(null)
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

    const fetchCashflowStatement = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await chartAccountsApi.getCashflowStatement(businessId)
        if (!isActive) return
        setData(response)
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

    void fetchCashflowStatement()

    return () => {
      isActive = false
    }
  }, [businessId])

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

        {businessId && !loading && !error && data && (
          <View style={styles.statementCard}>
            <Text style={styles.cardTitle}>Cash Flow Statement - All Time</Text>

            {/* Column Headers */}
            <View style={styles.columnHeaders}>
              <Text style={styles.columnHeader}>Activity</Text>
              <Text style={styles.columnHeader}>Amount</Text>
            </View>

            {/* Operating Activities */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Operating Activities</Text>
              
              {data.operating.inflows > 0 && (
                <View style={styles.indentedRow}>
                  <Text style={styles.activityText}>Cash Inflows</Text>
                  <Text style={styles.amountText}>
                    £{formatAmount(data.operating.inflows, 'GBP', true)}
                  </Text>
                </View>
              )}
              
              {data.operating.outflows > 0 && (
                <View style={styles.indentedRow}>
                  <Text style={styles.activityText}>Cash Outflows</Text>
                  <Text style={styles.amountTextNegative}>
                    (£{formatAmount(data.operating.outflows, 'GBP', true)})
                  </Text>
                </View>
              )}
              
              <View style={styles.netRow}>
                <Text style={styles.netLabel}>Net Operating Cash Flow</Text>
                <Text
                  style={[
                    styles.netAmount,
                    data.operating.net < 0 && styles.netAmountNegative,
                  ]}
                >
                  {data.operating.net < 0 ? '-' : ''}
                  £{formatAmount(Math.abs(data.operating.net), 'GBP', true)}
                </Text>
              </View>
            </View>

            <View style={styles.sectionDivider} />

            {/* Investing Activities */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Investing Activities</Text>
              
              <View style={styles.netRow}>
                <Text style={styles.netLabel}>Net Investing Cash Flow</Text>
                <Text
                  style={[
                    styles.netAmount,
                    data.investing.net < 0 && styles.netAmountNegative,
                  ]}
                >
                  {data.investing.net < 0 ? '-' : ''}
                  £{formatAmount(Math.abs(data.investing.net), 'GBP', true)}
                </Text>
              </View>
            </View>

            <View style={styles.sectionDivider} />

            {/* Financing Activities */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Financing Activities</Text>
              
              {data.financing.inflows > 0 && (
                <View style={styles.indentedRow}>
                  <Text style={styles.activityText}>Cash Inflows</Text>
                  <Text style={styles.amountText}>
                    £{formatAmount(data.financing.inflows, 'GBP', true)}
                  </Text>
                </View>
              )}
              
              <View style={styles.netRow}>
                <Text style={styles.netLabel}>Net Financing Cash Flow</Text>
                <Text
                  style={[
                    styles.netAmount,
                    data.financing.net < 0 && styles.netAmountNegative,
                  ]}
                >
                  {data.financing.net < 0 ? '-' : ''}
                  £{formatAmount(Math.abs(data.financing.net), 'GBP', true)}
                </Text>
              </View>
            </View>

            <View style={styles.sectionDivider} />

            {/* Net Cash Flow */}
            <View style={styles.netCashFlowRow}>
              <Text style={styles.netCashFlowLabel}>Net Cash Flow</Text>
              <Text
                style={[
                  styles.netCashFlowValue,
                  data.netCashFlow < 0 && styles.netCashFlowValueNegative,
                ]}
              >
                {data.netCashFlow < 0 ? '-' : ''}
                £{formatAmount(Math.abs(data.netCashFlow), 'GBP', true)}
              </Text>
            </View>

            <View style={styles.sectionDivider} />

            {/* Cash Flow Ratio and Revenue */}
            <View style={styles.ratioSection}>
              <View style={styles.ratioRow}>
                <Text style={styles.ratioLabel}>Cash Flow Ratio</Text>
                <Text style={styles.ratioValue}>
                  {data.cashFlowRatio !== undefined
                    ? `${data.cashFlowRatio >= 0 ? '' : '-'}${Math.abs(data.cashFlowRatio).toFixed(1)}%`
                    : '—'}
                </Text>
              </View>
              <View style={styles.revenueRow}>
                <Text style={styles.revenueLabel}>(Operating Cash Flow / Revenue)</Text>
                <Text style={styles.revenueValue}>
                  Revenue: £{formatAmount(data.revenue, 'GBP', true)}
                </Text>
              </View>
            </View>
          </View>
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
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 24,
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
    marginBottom: 12,
  },
  columnHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 12,
  },
  columnHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  section: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  indentedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 16,
    paddingVertical: 4,
  },
  activityText: {
    fontSize: 14,
    color: '#1f1f1f',
  },
  amountText: {
    fontSize: 14,
    color: '#1f1f1f',
    fontWeight: '500',
  },
  amountTextNegative: {
    fontSize: 14,
    color: '#1f1f1f',
    fontWeight: '500',
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 4,
  },
  netLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  netAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f1f1f',
  },
  netAmountNegative: {
    color: '#1f1f1f',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#efefef',
    marginVertical: 8,
  },
  netCashFlowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  netCashFlowLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },
  netCashFlowValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },
  netCashFlowValueNegative: {
    color: '#1f1f1f',
  },
  ratioSection: {
    marginTop: 4,
  },
  ratioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  ratioLabel: {
    fontSize: 14,
    color: '#666666',
  },
  ratioValue: {
    fontSize: 14,
    color: '#666666',
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  revenueLabel: {
    fontSize: 12,
    color: '#888888',
    fontStyle: 'italic',
  },
  revenueValue: {
    fontSize: 12,
    color: '#888888',
  },
})


