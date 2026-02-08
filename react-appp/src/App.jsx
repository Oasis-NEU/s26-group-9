import { useState } from 'react'
import reactLogo from './assets/react.svg'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css'
import Launch from './components/launch.jsx';

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <BrowserRouter>
        <nav>
          <Link to="/">Launch</Link> |{' '}
        </nav>

        <Routes>
          {/* Define the routes and which element (component) to render */}
          <Route path="/" element={<Launch />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App
