import './App.css'
import './rebuild.css'

import { AuthProvider } from './context/AuthContext'
import { ProgressProvider } from './context/ProgressContext'
import AppRouter from './pages/AppRouter'


function App() {
  return (
    <AuthProvider>
      <ProgressProvider>
        <AppRouter />
      </ProgressProvider>
    </AuthProvider>
  )
}


export default App
