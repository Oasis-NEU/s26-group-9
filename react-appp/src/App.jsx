import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css'
import Launch from './pages/launch.jsx';
import Login from './pages/log-in.jsx';
import Signup from './pages/signup.jsx';
import Dashboard from './pages/dashboard.jsx';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<Launch />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;