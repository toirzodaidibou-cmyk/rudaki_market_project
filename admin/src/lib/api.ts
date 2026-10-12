// Пайвастшавӣ ба backend. Логин тавассути cookie-и HttpOnly (credentials: "include").

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:5080'

export type LocalizedNames = { tg: string; ru: string; en: string; uz: string }

export type Category = {
  id: number
  slug: string
  name: LocalizedNames
  icon: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SaveCategoryRequest = {
  slug: string
  name: LocalizedNames
  sortOrder: number
  isActive: boolean
}

export type ProductImage = { id: number; url: string; thumb: string }

export type Product = {
  id: number
  categoryId: number
  name: LocalizedNames
  description: LocalizedNames
  price: number
  oldPrice: number | null
  sizeLabel: string | null
  isNew: boolean
  isActive: boolean
  images: ProductImage[]
  createdAt: string
  updatedAt: string
}

export type ProductListItem = {
  id: number
  categoryId: number
  name: LocalizedNames
  price: number
  oldPrice: number | null
  sizeLabel: string | null
  isNew: boolean
  isActive: boolean
  thumb: string | null
  imageCount: number
}

export type SaveProductRequest = {
  categoryId: number
  name: LocalizedNames
  description: LocalizedNames
  price: number
  oldPrice: number | null
  sizeLabel: string | null
  isNew: boolean
  isActive: boolean
}

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number }

export type BundleItem = {
  productId: number
  name: LocalizedNames
  sizeLabel: string | null
  price: number
  isActive: boolean
  thumb: string | null
  quantity: number
}

export type Bundle = {
  id: number
  name: LocalizedNames
  description: LocalizedNames
  emoji: string
  sortOrder: number
  isActive: boolean
  total: number
  items: BundleItem[]
}

export type SaveBundleRequest = {
  name: LocalizedNames
  description: LocalizedNames
  emoji: string
  sortOrder: number
  isActive: boolean
  items: { productId: number; quantity: number }[]
}

export type PriceChange = { id: number; price: number; oldPrice: number | null; isActive: boolean }

export type PricePreview = {
  rows: number
  changes: {
    id: number
    name: string
    price: number
    newPrice: number
    oldPrice: number | null
    newOldPrice: number | null
    isActive: boolean
    newIsActive: boolean
  }[]
  errors: { line: number; message: string }[]
}

export type SalesSummary = { revenue: number; orders: number; averageOrder: number }

export type SalesReport = {
  today: SalesSummary
  week: SalesSummary
  month: SalesSummary
  daily: { date: string; revenue: number; orders: number }[]
  topProducts: { productId: number | null; name: string; quantity: number; revenue: number; image: string | null }[]
  payments: { method: string; orders: number; revenue: number }[]
  customers: { buyers: number; newBuyers: number; repeatBuyers: number }
  cancelledInMonth: number
}

export type Banner = {
  id: number
  badge: LocalizedNames
  title: LocalizedNames
  text: LocalizedNames
  cta: LocalizedNames
  href: string
  theme: string
  image: string | null
  sortOrder: number
  isActive: boolean
}

export type SaveBannerRequest = Omit<Banner, "id" | "image">

export const ORDER_STATUSES = ['new', 'confirmed', 'delivering', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export type OrderListItem = {
  number: number
  createdAt: string
  status: OrderStatus
  phone: string
  address: string
  total: number
  itemCount: number
  deliveryFrom: string | null
  deliveryTo: string | null
  paymentMethod: string
}

export type OrderItem = {
  productId: number | null
  name: string
  sizeLabel: string | null
  price: number
  quantity: number
  lineTotal: number
  image: string | null
}

export type Order = {
  number: number
  createdAt: string
  status: OrderStatus
  statusUpdatedAt: string | null
  phone: string
  address: string
  comment: string | null
  deliveryFrom: string | null
  deliveryTo: string | null
  paymentMethod: string
  subtotal: number
  deliveryFee: number
  total: number
  items: OrderItem[]
  nextStatuses: OrderStatus[]
}

export const toListItem = (p: Product): ProductListItem => ({
  id: p.id,
  categoryId: p.categoryId,
  name: p.name,
  price: p.price,
  oldPrice: p.oldPrice,
  sizeLabel: p.sizeLabel,
  isNew: p.isNew,
  isActive: p.isActive,
  thumb: p.images[0]?.thumb ?? null,
  imageCount: p.images.length,
})

/** 11.05 → "11,05 с." */
export const formatPrice = (value: number) =>
  `${value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} с.`

/** Хатои API: status ва хатоҳои майдонҳо (масалан { "name.tg": ["Ном ҳатмист."] }). */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string[]>

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

let onUnauthorized: (() => void) | null = null

/** AuthProvider инро муқаррар мекунад: агар сессия тамом шавад (401), корбар ба логин бармегардад. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, credentials: 'include' })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError(0, 'Сервер дастрас нест. Backend кор мекунад?')
  }

  if (res.ok) {
    return (res.status === 204 ? undefined : await res.json()) as T
  }

  const body = await res.json().catch(() => null)
  if (res.status === 401 && !path.startsWith('/api/admin/auth/login')) onUnauthorized?.()
  const message =
    res.status === 429
      ? 'Кӯшишҳо аз ҳад зиёд. Як дақиқа интизор шавед.'
      : (body?.title as string | undefined) ?? `Хато (${res.status})`
  throw new ApiError(res.status, message, body?.errors ?? {})
}

const json = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
})

export const api = {
  login: (username: string, password: string) =>
    request<{ username: string }>('/api/admin/auth/login', json('POST', { username, password })),
  logout: () => request<void>('/api/admin/auth/logout', { method: 'POST' }),
  me: () => request<{ username: string }>('/api/admin/auth/me'),

  categories: {
    list: () => request<Category[]>('/api/admin/categories'),
    create: (data: SaveCategoryRequest) => request<Category>('/api/admin/categories', json('POST', data)),
    update: (id: number, data: SaveCategoryRequest) =>
      request<Category>(`/api/admin/categories/${id}`, json('PUT', data)),
    uploadIcon: (id: number, file: File) => {
      const form = new FormData()
      form.append('icon', file)
      return request<Category>(`/api/admin/categories/${id}/icon`, { method: 'POST', body: form })
    },
  },

  bundles: {
    list: () => request<Bundle[]>("/api/admin/bundles"),
    create: (data: SaveBundleRequest) => request<Bundle>("/api/admin/bundles", json("POST", data)),
    update: (id: number, data: SaveBundleRequest) => request<Bundle>(`/api/admin/bundles/${id}`, json("PUT", data)),
  },

  prices: {
    /** Файли Excel (Blob). categoryId — танҳо як категория. */
    export: async (categoryId?: number | null) => {
      const q = categoryId ? `?categoryId=${categoryId}` : ""
      const res = await fetch(`${API_URL}/api/admin/prices/export${q}`, { credentials: "include" })
      if (!res.ok) throw new ApiError(res.status, `Хато (${res.status})`)
      return res.blob()
    },
    preview: (file: File) => {
      const form = new FormData()
      form.append("file", file)
      return request<PricePreview>("/api/admin/prices/preview", { method: "POST", body: form })
    },
    apply: (changes: PriceChange[]) => request<{ updated: number }>("/api/admin/prices/apply", json("POST", { changes })),
  },

  banners: {
    list: () => request<Banner[]>("/api/admin/banners"),
    create: (data: SaveBannerRequest) => request<Banner>("/api/admin/banners", json("POST", data)),
    update: (id: number, data: SaveBannerRequest) => request<Banner>(`/api/admin/banners/${id}`, json("PUT", data)),
    uploadImage: (id: number, file: File) => {
      const form = new FormData()
      form.append("image", file)
      return request<Banner>(`/api/admin/banners/${id}/image`, { method: "POST", body: form })
    },
  },

  reports: () => request<SalesReport>("/api/admin/reports"),

  orders: {
    list: (params: { status?: OrderStatus | null; q?: string; page?: number }, signal?: AbortSignal) => {
      const q = new URLSearchParams()
      if (params.status) q.set('status', params.status)
      if (params.q) q.set('q', params.q)
      q.set('page', String(params.page ?? 1))
      return request<Paged<OrderListItem>>(`/api/admin/orders?${q}`, { signal })
    },
    counts: () => request<Record<OrderStatus, number>>('/api/admin/orders/counts'),
    get: (number: number) => request<Order>(`/api/admin/orders/${number}`),
    setStatus: (number: number, status: OrderStatus) =>
      request<Order>(`/api/admin/orders/${number}/status`, json('PUT', { status })),
  },

  products: {
    list: (params: { search?: string; categoryId?: number | null; page?: number; pageSize?: number }, signal?: AbortSignal) => {
      const q = new URLSearchParams()
      if (params.search) q.set('search', params.search)
      if (params.categoryId) q.set('categoryId', String(params.categoryId))
      q.set('page', String(params.page ?? 1))
      q.set('pageSize', String(params.pageSize ?? 24))
      return request<Paged<ProductListItem>>(`/api/admin/products?${q}`, { signal })
    },
    get: (id: number) => request<Product>(`/api/admin/products/${id}`),
    create: (data: SaveProductRequest) => request<Product>('/api/admin/products', json('POST', data)),
    update: (id: number, data: SaveProductRequest) => request<Product>(`/api/admin/products/${id}`, json('PUT', data)),
    uploadImages: (id: number, files: File[]) => {
      const form = new FormData()
      for (const f of files) form.append('images', f)
      return request<Product>(`/api/admin/products/${id}/images`, { method: 'POST', body: form })
    },
    deleteImage: (id: number, imageId: number) =>
      request<Product>(`/api/admin/products/${id}/images/${imageId}`, { method: 'DELETE' }),
    reorderImages: (id: number, imageIds: number[]) =>
      request<Product>(`/api/admin/products/${id}/images/order`, json('PUT', { imageIds })),
  },
}

// Суратҳо: агар VITE_FILES_URL бошад (Supabase: ".../storage/v1/object/public/uploads") — мустақим аз он.
const FILES_URL: string | undefined = import.meta.env.VITE_FILES_URL?.replace(/\/+$/, '')

/** Роҳи нисбии файл ("/uploads/...") → URL-и пурра. */
export const fileUrl = (path: string | null) =>
  !path
    ? null
    : FILES_URL && path.startsWith('/uploads/')
      ? `${FILES_URL}${path.slice('/uploads'.length)}`
      : `${API_URL}${path}`
