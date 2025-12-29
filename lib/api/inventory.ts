import { api } from './client'

export type InventoryItem = {
  id: string
  name: string
  quantity?: number
  unit?: string
  unitCost?: number
  amount: number
  debitAccount: 'Raw Materials' | 'Finished Goods'
  transactionId: string
  businessId: string
  createdAt: number
  updatedAt: number
  status?: 'pending' | 'received'
  costPerPrimaryPackage?: number
  costPerPrimaryPackagingUnit?: number
  currency?: string
  thirdPartyName?: string
  transactionDate?: number
  reference?: string
  packaging?: {
    primaryPackaging?: {
      description: string
      quantity: number
      unit: string
      material?: string
    }
    secondaryPackaging?: {
      description: string
      quantity: number
      primaryPackagesPerSecondary: number
      material?: string
    }
    totalPrimaryPackages: number
    orderQuantity: number
    orderPackagingLevel: 'primary' | 'secondary'
    confidence?: number
    notes?: string
  }
  // Grouping fields
  groupedItemIds?: string[]              // Array of inventory item IDs that are grouped together (only on grouped items)
  isGrouped?: boolean                    // true if this is a grouped item, false if it's part of a group
  groupedItemId?: string                 // Reference to the grouped item ID (only on items that are part of a group)
  isGroupedItem?: boolean                // true for grouped items (aggregated), false for regular items (from backend)
  // Stock tracking fields
  currentStockOfPrimaryPackages?: number // Current stock count in primary packages
  currentStockInPrimaryUnits?: number    // Current stock count in primary packaging units
  // Re-order tracking
  reOrdered?: Array<{
    dateCreated: number
    status: 'pending' | 'ordered' | 'received' | 'cancelled'
  }>
  // POS product fields
  posProductName?: string                // Custom product name for POS display
  posProductPrice?: number               // Custom product price for POS display (per primary package)
  // ... all other fields
}

export type InventoryItemsResponse = {
  items: InventoryItem[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export type GetInventoryItemsOptions = {
  page?: number
  limit?: number
  debitAccount?: 'Raw Materials' | 'Finished Goods'
  transactionId?: string
  screen?: 'inventory' | 'viewAll'                    // Screen mode: 'inventory' shows only non-grouped items, 'viewAll' shows regular and grouped items
  includeGrouped?: boolean                            // Include items with isGrouped: true (for fetching contributing items in a group)
}

export type UpdateInventoryItemStatusResponse = {
  success: boolean
  itemId: string
  status: 'pending' | 'received'
  updatedAt: number
}

export type GroupInventoryItemsResponse = {
  success: boolean
  groupedItemId: string
  updatedItemIds: string[]
  message?: string
}

export type StockTakeRequest = {
  businessId: string
  inventoryItemId: string
  stockNumber: number
  isInPrimaryUnits?: boolean
}

export type StockTakeResponse = {
  success: boolean
  inventoryItemId: string
  updatedStock: {
    packages: number
    units: number
  }
  transactionId?: string | null
  message: string
}

export type AddReOrderResponse = {
  success: boolean
  inventoryItemId: string
  reOrder: {
    dateCreated: number
    status: 'pending'
  }
  message: string
}

export type UpdatePOSProductRequest = {
  businessId: string
  posProductName?: string | null
  posProductPrice?: number | null
}

export type UpdatePOSProductResponse = {
  success: boolean
  inventoryItemId: string
  updatedFields: {
    posProductName: string | null
    posProductPrice: number | null
  }
  message: string
}

export const inventoryApi = {
  getInventoryItems: async (
    businessId: string,
    options?: GetInventoryItemsOptions,
  ): Promise<InventoryItemsResponse> => {
    const params = new URLSearchParams({
      businessId,
      ...(options?.page && { page: options.page.toString() }),
      ...(options?.limit && { limit: options.limit.toString() }),
      ...(options?.debitAccount && { debitAccount: options.debitAccount }),
      ...(options?.transactionId && { transactionId: options.transactionId }),
      ...(options?.screen && { screen: options.screen }),
      ...(options?.includeGrouped !== undefined && { includeGrouped: options.includeGrouped.toString() }),
    })
    return api.get<InventoryItemsResponse>(
      `/authenticated/transactions3/api/inventory-items?${params.toString()}`,
    )
  },
  updateInventoryItemStatus: async (
    itemId: string,
    businessId: string,
    status: 'received',
  ): Promise<UpdateInventoryItemStatusResponse> => {
    const params = new URLSearchParams({
      businessId,
    })
    return api.patch<UpdateInventoryItemStatusResponse>(
      `/authenticated/transactions3/api/inventory-items/${itemId}?${params.toString()}`,
      { status },
    )
  },
  groupInventoryItems: async (
    businessId: string,
    inventoryItemIds: string[],
  ): Promise<GroupInventoryItemsResponse> => {
    return api.post<GroupInventoryItemsResponse>(
      '/authenticated/transactions3/api/inventory-items/group',
      {
        businessId,
        inventoryItemIds,
      },
    )
  },
  performStockTake: async (
    businessId: string,
    inventoryItemId: string,
    stockNumber: number,
    isInPrimaryUnits: boolean = false,
  ): Promise<StockTakeResponse> => {
    return api.post<StockTakeResponse>(
      '/authenticated/transactions3/api/inventory-items/stock-take',
      {
        businessId,
        inventoryItemId,
        stockNumber,
        isInPrimaryUnits,
      },
    )
  },
  addReOrder: async (
    businessId: string,
    inventoryItemId: string,
  ): Promise<AddReOrderResponse> => {
    return api.post<AddReOrderResponse>(
      '/authenticated/transactions3/api/inventory-items/re-order',
      {
        businessId,
        inventoryItemId,
      },
    )
  },
  updatePOSProduct: async (
    inventoryItemId: string,
    request: UpdatePOSProductRequest,
  ): Promise<UpdatePOSProductResponse> => {
    return api.patch<UpdatePOSProductResponse>(
      `/authenticated/transactions3/api/inventory-items/${inventoryItemId}/pos-product`,
      request,
    )
  },
}

