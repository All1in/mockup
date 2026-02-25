import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/Home';
import LoginPage from './pages/authPages/Login/Login';
import RegisterPage from './pages/authPages/Register/Register';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
