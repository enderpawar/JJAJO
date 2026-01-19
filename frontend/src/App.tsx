import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ApiKeyPage from './pages/ApiKeyPage'
import MainPage from './pages/MainPage'
import { useApiKeyStore } from './stores/apiKeyStore'

function App() {
  const { apiKey } = useApiKeyStore()

  return (
    <Router>
      <Routes>
        <Route path="/api-key" element={<ApiKeyPage />} />
        <Route 
          path="/" 
          element={
            apiKey ? <MainPage /> : <Navigate to="/api-key" replace />
          } 
        />
      </Routes>
    </Router>
  )
}

export default App
