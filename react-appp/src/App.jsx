import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import './App.css'
import Launch from './pages/launch.jsx';
import Login from './pages/log-in.jsx';
import Signup from './pages/signup.jsx';
import Dashboard from './pages/dashboard.jsx';

function ProtectedRoute({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const { data, error } = await supabase.auth.getUser();
      if (isMounted) {
        setIsAuthorized(!error && !!data?.user);
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isAuthorized === null) {
    return null;
  }

  return isAuthorized ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<Launch />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={(
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            )}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;