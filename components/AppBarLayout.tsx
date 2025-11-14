// Layout component that provides AppBar for authenticated screens

import React from 'react'
import { SafeAreaView, View, StyleSheet, TouchableOpacity } from 'react-native'
import { useNavigation, DrawerActions } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { MaterialIcons } from '@expo/vector-icons'

interface AppBarLayoutProps {
  children: React.ReactNode
  title?: string
  debugBorders?: boolean
}

export function AppBarLayout({ children, title, debugBorders = false }: AppBarLayoutProps) {
  const navigation = useNavigation<NavigationProp<any>>()
  const borderColor = debugBorders ? '#ff0000' : 'transparent'

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.appbar, { borderColor }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.circleButton, { borderColor }]}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <MaterialIcons name="add-circle" size={36} color="#333333" />
        </TouchableOpacity>
        <View style={[styles.titlePlaceholder, { borderColor }]} />
      </View>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fafafa',
    paddingTop: 40,
  },
  appbar: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    marginHorizontal: 8,
    marginTop: 8,
    borderRadius: 12,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titlePlaceholder: {
    flex: 1,
    marginLeft: 12,
    height: 24,
    borderWidth: 1,
    borderRadius: 12,
  },
  content: {
    flex: 1,
  },
})

