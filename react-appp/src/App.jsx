import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css'
import Launch from './pages/launch.jsx';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<Launch />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;