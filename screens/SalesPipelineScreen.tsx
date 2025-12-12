import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { MaterialIcons } from '@expo/vector-icons'
import { AppBarLayout } from '../components/AppBarLayout'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'

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
  const navigation = useNavigation<StackNavigationProp<TransactionsStackParamList>>()
  const route = useRoute<SalesPipelineRouteProp>()

  // TODO: Fetch real sales leads data from API
  // Filter sales leads by stage
  const leadLeads: SalesLead[] = []
  const conversationLeads: SalesLead[] = []
  const proposalLeads: SalesLead[] = []
  const wonLeads: SalesLead[] = []
  const lostLeads: SalesLead[] = []

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
    if (column.salesLeads) {
      const items = column.salesLeads.map(lead => ({
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
        <View style={styles.pipelineColumnStack}>
          {salesColumnsWithData.map((column) => (
            <View key={column.title} style={styles.pipelineCard}>
              <View style={styles.pipelineTitleRow}>
                <Text style={styles.pipelineTitle}>{column.title}</Text>
              </View>
              {column.salesLeads && (
                <SalesCardList items={column.salesLeads} navigation={navigation} />
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
})

