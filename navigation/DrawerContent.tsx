// Custom drawer content using React Native Paper

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Drawer } from 'react-native-paper'
import { DrawerContentScrollView } from '@react-navigation/drawer'
import type { DrawerContentComponentProps } from '@react-navigation/drawer'

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const activeRouteName = props.state.routeNames[props.state.index]

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Drawer.Section title="Premium Modules">
          <Drawer.Item
            label="Test Sum API"
            icon="calculator-variant"
            active={activeRouteName === 'Test'}
            onPress={() => props.navigation.navigate('Test')}
          />
          <Drawer.Item
            label="Test Firestore"
            icon="database"
            active={activeRouteName === 'FirestoreTest'}
            onPress={() => props.navigation.navigate('FirestoreTest')}
          />
        </Drawer.Section>
      </View>
    </DrawerContentScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 20,
  },
})

