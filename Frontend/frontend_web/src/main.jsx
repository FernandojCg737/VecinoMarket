import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { CatalogoProvider } from './context/CatalogoContext.jsx'
import { LocationProvider } from './context/LocationContext.jsx'
import { NotificacionesProvider } from './context/NotificacionesContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificacionesProvider>
            <CartProvider>
              <CatalogoProvider>
                <LocationProvider>
                  <App />
                </LocationProvider>
              </CatalogoProvider>
            </CartProvider>
          </NotificacionesProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
