import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css'
import Launch from './pages/launch.jsx';
import Login from './pages/log-in.jsx';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<Launch />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;