// Transactions screen - upload receipt and process OCR
import React, { useCallback } from 'react'
import { StyleSheet, Text, View, Button } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { AppBarLayout } from '../components/AppBarLayout'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'

type TransactionsScreenNavigation = StackNavigationProp<
  TransactionsStackParamList,
  'TransactionsHome'
>

export default function TransactionsScreen() {
  const navigation = useNavigation<TransactionsScreenNavigation>()

  const goToAddTransaction = useCallback(() => {
    navigation.navigate('AddTransaction')
  }, [navigation])

  return (
    <AppBarLayout>
      <View style={styles.container}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>
          Track recent activity and add new transactions when needed.
        </Text>
        <Button title="Add transaction" onPress={goToAddTransaction} />
      </View>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
  },
})

