import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'

export function MotivationalCard() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) {
    return null
  }

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Ready to improve your business health score?</Text>
          <Text style={styles.body}>
            Focus on improving your cash flow and maintaining strong revenue growth to boost your overall health score.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={() => setDismissed(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.dismissIcon}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f6f6f6',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a4a4a',
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    color: '#6d6d6d',
    lineHeight: 18,
  },
  dismissButton: {
    marginLeft: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
    paddingTop: 0,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dismissIcon: {
    fontSize: 22,
    color: '#6d6d6d',
    fontWeight: '300',
    lineHeight: 20,
  },
})

