import './App.css'
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Layout } from './pages/Layout';
import  AlertsPage from './pages/AlertsPage';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { RegisterForm } from './pages/RegisterForm';
import History from './pages/History';


function App() {
  return (
      <Router>
        <Routes>
          <Route path="/" element={<Login/>}/>
          <Route path="/register" element={<RegisterForm/>}/>
          
           <Route path='/' element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard/>}/>
            <Route path="/alertas" element={<AlertsPage/>}/>
            <Route path="/history" element={<History/>}/>
          </Route>
        </Routes>
      </Router>
      
  )
}

export default App
