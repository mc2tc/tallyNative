import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
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

type LeadDetailRouteProp = RouteProp<TransactionsStackParamList, 'LeadDetail'>

export default function LeadDetailScreen() {
  const navigation = useNavigation<NavigationProp<TransactionsStackParamList>>()
  const route = useRoute<LeadDetailRouteProp>()
  const { lead } = route.params

  const getStageLabel = (stage: SalesLead['stage']): string => {
    switch (stage) {
      case 'lead':
        return 'Lead'
      case 'conversation':
        return 'In Conversation'
      case 'proposal':
        return 'Proposal / Quote Sent'
      case 'won':
        return 'Closed WON'
      case 'lost':
        return 'Closed LOST'
      default:
        return stage
    }
  }

  const handleCreateInvoice = () => {
    navigation.navigate('CreateInvoice', {
      customerName: lead.title,
      projectTitle: lead.projectTitle || '',
    })
  }

  return (
    <AppBarLayout title={lead.title} onBackPress={() => navigation.goBack()}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Stage Badge */}
        <View style={styles.section}>
          <Text style={styles.label}>Stage</Text>
          <View style={styles.stageBadge}>
            <Text style={styles.stageText}>{getStageLabel(lead.stage)}</Text>
          </View>
        </View>

        {/* Company Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Company Name:</Text>
            <Text style={styles.infoValue}>{lead.title}</Text>
          </View>
          {lead.projectTitle && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Project:</Text>
              <Text style={styles.infoValue}>{lead.projectTitle}</Text>
            </View>
          )}
          {lead.subtitle && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Notes:</Text>
              <Text style={styles.infoValue}>{lead.subtitle}</Text>
            </View>
          )}
          {lead.amount && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estimated Value:</Text>
              <Text style={styles.infoValue}>{lead.amount}</Text>
            </View>
          )}
        </View>

        {/* Additional Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Lead ID:</Text>
            <Text style={styles.infoValue}>{lead.id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.infoValue}>{getStageLabel(lead.stage)}</Text>
          </View>
        </View>

        {/* Create Invoice Button - Only show for Closed WON */}
        {lead.stage === 'won' && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.createInvoiceButton}
              onPress={handleCreateInvoice}
              activeOpacity={0.7}
            >
              <MaterialIcons name="receipt" size={20} color="#ffffff" />
              <Text style={styles.createInvoiceButtonText}>Create Invoice</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE_BACKGROUND,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#efefef',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  stageBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: SURFACE_BACKGROUND,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  stageText: {
    fontSize: 13,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    flex: 2,
    textAlign: 'right',
  },
  createInvoiceButton: {
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createInvoiceButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})

