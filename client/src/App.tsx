import { Routes, Route } from 'react-router-dom'

// TODO: import pages
// TODO: wrap with AuthProvider

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<h1>Home</h1>} />
      <Route path="/login" element={<h1>Login</h1>} />
      <Route path="/register" element={<h1>Register</h1>} />
    </Routes>
  )
}
