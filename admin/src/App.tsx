import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthContext'
import { ToastProvider } from './components/ui'
import { AdminLayout } from './layout/AdminLayout'
import { BannersPage } from './pages/banners/BannersPage'
import { BonusesPage } from './pages/bonuses/BonusesPage'
import { BundlesPage } from './pages/bundles/BundlesPage'
import { CategoriesPage } from './pages/categories/CategoriesPage'
import { LoginPage } from './pages/LoginPage'
import { OrdersPage } from './pages/orders/OrdersPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { ProductsPage } from './pages/products/ProductsPage'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="/orders" replace />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/bonuses" element={<BonusesPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/bundles" element={<BundlesPage />} />
              <Route path="/banners" element={<BannersPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
