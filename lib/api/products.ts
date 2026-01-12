import { api } from './client'

export type ProductIngredient = {
  inventoryItemId: string
  quantity: number
  unit?: string
  skus?: {
    [skuId: string]: {
      name: string
      quantity: number
      unit: string
      ancillaryItems?: Array<{
        name: string
        quantity: number
        unit: string
        stock?: number
      }>
    }
  }
}

export type CreateProductRequest = {
  businessId: string
  name: string
  ingredients: ProductIngredient[]
  stock?: number
}

export type UpdateProductRequest = {
  businessId: string
  name?: string
  ingredients?: ProductIngredient[]
  stock?: number
}

export type CreateProductResponse = {
  success: boolean
  productId: string
  message?: string
  unitConversions?: UnitConversion[]
  note?: string
}

export type UnitConversion = {
  inventoryItemId: string
  originalQuantity: number
  originalUnit: string
  convertedQuantity: number
  convertedUnit: string
}

export type UpdateProductResponse = {
  success: boolean
  productId: string
  message?: string
  unitConversions?: UnitConversion[]
  note?: string
}

export type ManufactureProductRequest = {
  businessId: string
  quantity: number
  unit: string
  waste?: number
}

export type ManufactureProductResponse = {
  success: boolean
  transactionId: string
  totalCost: number
  ingredientRequirements?: Array<{
    inventoryItemId: string
    quantity: number
    unit: string
  }>
  message?: string
}

export type Product = {
  id: string
  name: string
  businessId: string
  ingredients: ProductIngredient[]
  stock?: number
  createdAt: number
  updatedAt: number
  currentStock?: number
  currentStockUnit?: string
  costPerUnit?: number
  costPerUnitUnit?: string
  skus?: SKU[]
}

export type ProductsListResponse = {
  products: Product[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export const productsApi = {
  createProduct: async (
    request: CreateProductRequest,
  ): Promise<CreateProductResponse> => {
    return api.post<CreateProductResponse>(
      '/authenticated/transactions3/api/products',
      request,
    )
  },

  getProducts: async (
    businessId: string,
    options?: { page?: number; limit?: number; name?: string },
  ): Promise<ProductsListResponse> => {
    const params = new URLSearchParams({
      businessId,
      ...(options?.page && { page: options.page.toString() }),
      ...(options?.limit && { limit: options.limit.toString() }),
      ...(options?.name && { name: options.name }),
    })
    return api.get<ProductsListResponse>(
      `/authenticated/transactions3/api/products?${params.toString()}`,
    )
  },

  updateProduct: async (
    productId: string,
    request: UpdateProductRequest,
  ): Promise<UpdateProductResponse> => {
    const params = new URLSearchParams({
      businessId: request.businessId,
    })
    return api.patch<UpdateProductResponse>(
      `/authenticated/transactions3/api/products/${productId}?${params.toString()}`,
      {
        ...(request.name && { name: request.name }),
        ...(request.ingredients && { ingredients: request.ingredients }),
        ...(request.stock !== undefined && { stock: request.stock }),
      },
    )
  },

  manufactureProduct: async (
    productId: string,
    request: ManufactureProductRequest,
  ): Promise<ManufactureProductResponse> => {
    return api.post<ManufactureProductResponse>(
      `/authenticated/transactions3/api/products/${productId}/manufacture`,
      request,
    )
  },

  saveProductSkus: async (
    productId: string,
    request: SaveProductSkusRequest,
  ): Promise<SaveProductSkusResponse> => {
    return api.post<SaveProductSkusResponse>(
      `/authenticated/transactions3/api/products/${productId}/skus`,
      request,
    )
  },

  getProductSkus: async (
    productId: string,
    businessId: string,
  ): Promise<GetProductSkusResponse> => {
    const params = new URLSearchParams({
      businessId,
    })
    return api.get<GetProductSkusResponse>(
      `/authenticated/transactions3/api/products/${productId}/skus?${params.toString()}`,
    )
  },

  addStockToSku: async (
    productId: string,
    skuId: string,
    request: AddStockToSkuRequest,
  ): Promise<AddStockToSkuResponse> => {
    return api.post<AddStockToSkuResponse>(
      `/authenticated/transactions3/api/products/${productId}/skus/${skuId}/add-stock`,
      request,
    )
  },
}

export type SKUAncillaryItem = {
  inventoryItemId: string
  quantity: number
}

export type SKUCost = {
  productCost: number
  ancillaryCost: number
  totalCost: number
}

export type SKU = {
  name: string
  size: number
  unit: string
  price: number
  /**
   * Optional VAT rate percentage for this SKU (e.g. 20 for 20%).
   * Kept optional for backward compatibility with existing SKUs.
   */
  vatRate?: number
  ancillaryItems?: SKUAncillaryItem[]
  tags?: string[]
  currentStock: number
  currentStockOfPrimaryPackages?: number
  currentStockInPrimaryUnits?: number
  cost: SKUCost
}

export type SaveProductSkusRequest = {
  businessId: string
  skus: SKU[]
}

export type AvailableInventoryItem = {
  id: string
  name: string
}

export type SaveProductSkusResponse = {
  success: true
  productId: string
  message: string
  skuCount: number
  availableInventoryItems: AvailableInventoryItem[]
}

export type GetProductSkusResponse = {
  success: true
  productId: string
  skus: SKU[]
  availableInventoryItems: AvailableInventoryItem[]
}

export type AddStockToSkuRequest = {
  businessId: string
  quantity: number
  unit: string
}

export type AddStockToSkuResponse = {
  success: true
  productId: string
  skuId: string
  packagesAdded: number
  quantityUsed: number
  newProductStock: number
  newSkuStock: {
    currentStockOfPrimaryPackages: number
    currentStockInPrimaryUnits: number
  }
  message: string
}

