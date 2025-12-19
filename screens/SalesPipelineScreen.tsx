import React, { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { MaterialIcons } from '@expo/vector-icons'
import { AppBarLayout } from '../components/AppBarLayout'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'
import { useModuleTracking } from '../lib/hooks/useModuleTracking'
import { useModuleGroupTracking } from '../lib/hooks/useModuleGroupTracking'
import { useAuth } from '../lib/auth/AuthContext'
import { customersApi, type Customer } from '../lib/api/customers'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type SalesLead = {
  id: string
  title: string // Company name
  projectTitle?: string // Project name/title
  subtitle?: string
  amount?: string
  stage: 'lead' | 'conversation' | 'proposal' | 'won' | 'lost'
}

type PipelineColumn = {
  title: string
  actions: string[]
  salesLeads?: SalesLead[]
}

type SalesPipelineRouteProp = RouteProp<TransactionsStackParamList, 'SalesPipeline'>

export default function SalesPipelineScreen() {
  useModuleTracking('customers')
  useModuleGroupTracking('sales_marketing')
  const navigation = useNavigation<StackNavigationProp<TransactionsStackParamList>>()
  const route = useRoute<SalesPipelineRouteProp>()
  const { businessUser, memberships } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  // Choose businessId (same logic as other screens)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId &&
      !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  // Fetch customers when screen comes into focus (refreshes when returning from AddCustomer)
  useFocusEffect(
    useCallback(() => {
      if (!businessId) {
        setCustomers([])
        setLoading(false)
        return
      }

      const fetchCustomers = async () => {
        try {
          setLoading(true)
          const response = await customersApi.getCustomers(businessId, {
            limit: 100, // Get up to 100 customers
          })
          setCustomers(response.customers || [])
        } catch (error) {
          console.error('Failed to fetch customers:', error)
          setCustomers([])
        } finally {
          setLoading(false)
        }
      }

      fetchCustomers()
    }, [businessId]),
  )

  // Map customers to sales leads and filter by stage
  const { leadLeads, conversationLeads, proposalLeads, wonLeads, lostLeads } = useMemo(() => {
    const leads: SalesLead[] = customers.map((customer) => ({
      id: customer.id,
      title: customer.name,
      stage: customer.stage,
    }))

    return {
      leadLeads: leads.filter((lead) => lead.stage === 'lead'),
      conversationLeads: leads.filter((lead) => lead.stage === 'conversation'),
      proposalLeads: leads.filter((lead) => lead.stage === 'proposal'),
      wonLeads: leads.filter((lead) => lead.stage === 'won'),
      lostLeads: leads.filter((lead) => lead.stage === 'lost'),
    }
  }, [customers])

  // Create 5-column pipeline data
  const salesColumnsWithData: PipelineColumn[] = [
    {
      title: 'Lead',
      actions: ['View all'],
      salesLeads: leadLeads.slice(0, 3),
    },
    {
      title: 'In Conversation',
      actions: ['View all'],
      salesLeads: conversationLeads.slice(0, 3),
    },
    {
      title: 'Proposal / Quote Sent',
      actions: ['View all'],
      salesLeads: proposalLeads.slice(0, 3),
    },
    {
      title: 'Closed WON',
      actions: ['View all'],
      salesLeads: wonLeads.slice(0, 3),
    },
    {
      title: 'Closed LOST',
      actions: ['View all'],
      salesLeads: lostLeads.slice(0, 3),
    },
  ]

  const handleViewAll = (column: PipelineColumn) => {
    // Get all leads for this stage (not just the first 3)
    let allLeadsForStage: SalesLead[] = []
    switch (column.title) {
      case 'Lead':
        allLeadsForStage = leadLeads
        break
      case 'In Conversation':
        allLeadsForStage = conversationLeads
        break
      case 'Proposal / Quote Sent':
        allLeadsForStage = proposalLeads
        break
      case 'Closed WON':
        allLeadsForStage = wonLeads
        break
      case 'Closed LOST':
        allLeadsForStage = lostLeads
        break
    }

    const items = allLeadsForStage.map(lead => ({
      id: lead.id,
      title: lead.title,
      amount: lead.amount || '',
      subtitle: lead.subtitle,
    }))
    navigation.navigate('ScaffoldViewAll', {
      section: column.title,
      title: column.title,
      items,
      showReconcileButton: false,
      pipelineSection: 'sales',
    })
  }

  const handleAddClick = () => {
    navigation.navigate('AddCustomer')
  }

  return (
    <AppBarLayout 
      title="Sales Pipeline" 
      onBackPress={() => navigation.goBack()}
      rightIconName="add-circle-sharp"
      onRightIconPress={handleAddClick}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
            <Text style={styles.loadingText}>Loading customers...</Text>
          </View>
        ) : (
          <View style={styles.pipelineColumnStack}>
            {salesColumnsWithData.map((column) => (
              <View key={column.title} style={styles.pipelineCard}>
                <View style={styles.pipelineTitleRow}>
                  <Text style={styles.pipelineTitle}>{column.title}</Text>
                </View>
                {column.salesLeads && column.salesLeads.length > 0 ? (
                  <SalesCardList items={column.salesLeads} navigation={navigation} />
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No leads in this stage</Text>
                  </View>
                )}
                {column.actions.length > 0 && (
                  <View style={styles.pipelineActions}>
                    {column.actions.map((action) => (
                      <TouchableOpacity
                        key={action}
                        activeOpacity={0.7}
                        style={styles.linkButton}
                        onPress={() => {
                          if (action === 'View all') {
                            handleViewAll(column)
                          }
                        }}
                      >
                        <Text style={styles.linkButtonText}>{action}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </AppBarLayout>
  )
}

function SalesCardList({
  items,
  navigation,
}: {
  items: SalesLead[]
  navigation?: StackNavigationProp<TransactionsStackParamList>
}) {
  const getStageColor = (stage: SalesLead['stage']): string => {
    switch (stage) {
      case 'lead':
        return '#8d8d8d' // Dark gray
      case 'conversation':
        return '#a0a0a0' // Medium gray
      case 'proposal':
        return '#b3b3b3' // Light gray
      case 'won':
        return '#6d6d6d' // Darker gray
      case 'lost':
        return '#c0c0c0' // Lightest gray
      default:
        return GRAYSCALE_SECONDARY
    }
  }

  const handleCardPress = (item: SalesLead) => {
    if (navigation) {
      navigation.navigate('LeadDetail', { lead: item })
    }
  }

  return (
    <View style={styles.cardList}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.cardListItem, { borderLeftWidth: 4, borderLeftColor: getStageColor(item.stage) }]}
          onPress={() => handleCardPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.cardTextGroup}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.projectTitle && (
              <Text style={styles.projectTitle} numberOfLines={1}>
                {item.projectTitle}
              </Text>
            )}
            {item.subtitle && (
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            )}
          </View>
          {item.amount && (
            <Text style={styles.cardAmount}>{item.amount}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 24,
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
    marginBottom: 12,
  },
  pipelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
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
  projectTitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    fontStyle: 'italic',
  },
})

