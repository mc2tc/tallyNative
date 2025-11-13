// Layout component that provides AppBar for authenticated screens

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useNavigation, DrawerActions } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { Appbar } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'

interface AppBarLayoutProps {
  children: React.ReactNode
  title?: string
}

export function AppBarLayout({ children, title = 'Tally Native' }: AppBarLayoutProps) {
  const navigation = useNavigation<NavigationProp<any>>()

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.Action
          icon={() => <MaterialIcons name="more-vert" size={24} color="#333" />}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        />
        <Appbar.Content title={title} titleStyle={styles.title} />
      </Appbar.Header>
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  appbar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 0,
    zIndex: 1000,
  },
  title: {
    color: '#333333',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
})

