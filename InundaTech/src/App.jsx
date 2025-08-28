// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Layout } from './pages/Layout';
import  AlertsPage from './pages/AlertsPage';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
// import { AuthProvider } from './components/AuthContext';
// import ProtectedRoute from './components/ProtectedRoute';


function App() {
  return (
      <Router>
        <Routes>
          <Route path="/" element={<Login/>}/>
           <Route path='/' element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard/>}/>
            <Route path="/alertas" element={<AlertsPage/>}/>
          </Route>
        </Routes>
      </Router>
      
  )
}

export default App
