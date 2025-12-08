// Point of Sale screen

import React from 'react'
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppBarLayout } from '../components/AppBarLayout'
import { BottomNavBar } from '../components/BottomNavBar'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

type Props = NativeStackScreenProps<AppDrawerParamList, 'PointOfSale'>

interface Product {
  id: string
  name: string
  price: number
  packSize: string
}

const products: Product[] = [
  { id: '1', name: 'Traditional', price: 37.50, packSize: 'Pack of 10' },
  { id: '2', name: 'Cheese', price: 32.50, packSize: 'Pack of 10' },
  { id: '3', name: 'Vegetarian', price: 30.00, packSize: 'Pack of 10' },
]

interface CartItem {
  productId: string
  quantity: number
}

const cartItems: CartItem[] = [
  { productId: '1', quantity: 4 }, // Traditional
  { productId: '2', quantity: 2 }, // Cheese
  { productId: '3', quantity: 1 }, // Vegetarian
]

export default function PointOfSaleScreen({}: Props) {
  const handleProductPress = (product: Product) => {
    // Handle product selection
    console.log('Selected product:', product)
  }

  const handleCheckout = () => {
    // Handle checkout
    console.log('Checkout pressed')
  }

  const getCartTotal = () => {
    let subtotal = 0
    cartItems.forEach((item) => {
      const product = products.find((p) => p.id === item.productId)
      if (product) {
        subtotal += product.price * item.quantity
      }
    })
    const vat = subtotal * 0.2
    const total = subtotal + vat
    return { subtotal, vat, total }
  }

  const { subtotal, vat, total } = getCartTotal()

  return (
    <View style={styles.wrapper}>
      <AppBarLayout title="Point of Sale">
        <View style={styles.contentWrapper}>
          <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.productsGrid}>
              {products.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => handleProductPress(product)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPackSize}>{product.packSize}</Text>
                  <Text style={styles.productPrice}>£{product.price.toFixed(2)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={styles.checkoutCardContainer}>
            <View style={styles.checkoutCard}>
              <Text style={styles.checkoutTitle}>Purchase</Text>
              <View style={styles.cartItems}>
                {cartItems.map((item) => {
                  const product = products.find((p) => p.id === item.productId)
                  if (!product) return null
                  const itemTotal = product.price * item.quantity
                  return (
                    <View key={item.productId} style={styles.cartItemRow}>
                      <Text style={styles.cartItemText}>
                        {item.quantity} {product.name}
                      </Text>
                      <Text style={styles.cartItemPrice}>£{itemTotal.toFixed(2)}</Text>
                    </View>
                  )
                })}
              </View>
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>£{subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>VAT (20%)</Text>
                <Text style={styles.totalValue}>£{vat.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.finalTotalLabel}>Total</Text>
                <Text style={styles.finalTotalValue}>£{total.toFixed(2)}</Text>
              </View>
              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={handleCheckout}
                activeOpacity={0.7}
              >
                <Text style={styles.checkoutButtonText}>Checkout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </AppBarLayout>
      <BottomNavBar />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 200,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  productPackSize: {
    fontSize: 12,
    fontWeight: '400',
    color: '#999999',
    marginBottom: 8,
    textAlign: 'center',
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    textAlign: 'center',
  },
  checkoutCardContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 280,
  },
  checkoutCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  cartItems: {
    marginBottom: 12,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cartItemText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#333333',
    flex: 1,
  },
  cartItemPrice: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666666',
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333333',
  },
  finalTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  finalTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  checkoutButton: {
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
})

