// Production Management screen - Work In Progress

import React, { useState, useCallback } from 'react'
import { View, StyleSheet, ScrollView, Text, ActivityIndicator, Alert, TouchableOpacity } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { MaterialIcons } from '@expo/vector-icons'
import { AppBarLayout } from '../components/AppBarLayout'
import { OperationsBottomNav } from '../components/OperationsBottomNav'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { useModuleGroupTracking } from '../lib/hooks/useModuleGroupTracking'
import { useAuth } from '../lib/auth/AuthContext'
import { productsApi, type Product } from '../lib/api/products'

type Props = NativeStackScreenProps<AppDrawerParamList, 'ProductionManagement'>

export default function ProductionManagementScreen({}: Props) {
  useModuleGroupTracking('operations')
  const navigation = useNavigation<DrawerNavigationProp<AppDrawerParamList>>()
  const { businessUser, memberships } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  // Choose businessId (same logic as other screens)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  const fetchProducts = useCallback(async () => {
    if (!businessId) {
      return
    }

    try {
      setLoading(true)
      const response = await productsApi.getProducts(businessId, {
        page: 1,
        limit: 100,
      })
      setProducts(response.products)
    } catch (error) {
      console.error('Failed to fetch products:', error)
      Alert.alert('Error', 'Failed to load products. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useFocusEffect(
    useCallback(() => {
      fetchProducts()
    }, [fetchProducts])
  )

  const handleAddClick = useCallback(() => {
    if (!businessId) {
      return
    }
    navigation.navigate('CreateProduct', { businessId })
  }, [businessId, navigation])

  return (
    <View style={styles.wrapper}>
      <AppBarLayout 
        title="Operations"
        rightIconName="add-circle-sharp"
        onRightIconPress={handleAddClick}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4a4a4a" />
            </View>
          ) : products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inventory-2" size={48} color="#cccccc" />
              <Text style={styles.emptyTitle}>No Products</Text>
              <Text style={styles.emptyText}>
                Get started by creating your first product design.
              </Text>
            </View>
          ) : (
            <View style={styles.productsContainer}>
              {products.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => navigation.navigate('ProductDetail', { product })}
                  activeOpacity={0.7}
                >
                  <View style={styles.productHeader}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <MaterialIcons name="chevron-right" size={24} color="#999999" />
                  </View>
                  <View style={styles.productDetails}>
                    <View style={styles.productDetailRow}>
                      <Text style={styles.productDetailLabel}>Stock:</Text>
                      <Text style={styles.productDetailValue}>
                        {product.currentStock !== undefined
                          ? `${product.currentStock.toFixed(2)} ${product.currentStockUnit || ''}`
                          : product.stock !== undefined
                          ? `${product.stock.toFixed(2)}`
                          : 'Not set'}
                      </Text>
                    </View>
                    <View style={styles.productDetailRow}>
                      <Text style={styles.productDetailLabel}>Cost/Unit:</Text>
                      <Text style={styles.productDetailValue}>
                        {product.costPerUnit !== undefined
                          ? `${product.costPerUnit.toFixed(2)}${product.costPerUnitUnit ? ` / ${product.costPerUnitUnit}` : ''}`
                          : 'Not set'}
                      </Text>
                    </View>
                    {product.skus && product.skus.length > 0 && (
                      <View style={styles.skusContainer}>
                        <Text style={styles.skusTitle}>SKUs:</Text>
                        {product.skus.map((sku, index) => (
                          <View key={index} style={styles.skuItem}>
                            <Text style={styles.skuText}>
                              {sku.name} - {sku.size} {sku.unit}
                            </Text>
                            {sku.currentStockOfPrimaryPackages !== undefined && (
                              <Text style={styles.skuStock}>
                                {sku.currentStockOfPrimaryPackages}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
        <OperationsBottomNav />
      </AppBarLayout>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80, // Extra padding for bottom nav
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  productsContainer: {
    gap: 12,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  productDetails: {
    marginTop: 8,
    gap: 6,
  },
  productDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productDetailLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  productDetailValue: {
    fontSize: 14,
    color: '#333333',
  },
  skusContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  skusTitle: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    marginBottom: 6,
  },
  skuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  skuText: {
    fontSize: 13,
    color: '#333333',
    paddingLeft: 8,
    flex: 1,
  },
  skuStock: {
    fontSize: 13,
    color: '#333333',
    textAlign: 'right',
  },
})

