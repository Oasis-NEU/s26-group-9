import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import './index.css'
import App from './App.jsx'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App runtime error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'Afacad, sans-serif', color: '#5f4938' }}>
          <h2 style={{ marginTop: 0 }}>App failed to render</h2>
          <p style={{ marginBottom: 8 }}>Please copy this message and share it:</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f0ebe5', padding: 12, borderRadius: 8 }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      )
    }

    return this.props.children
  }
}

const theme = createTheme({
  typography: {
    fontFamily: "'Afacad', sans-serif",
    fontSize: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: "'Afacad', sans-serif",
          fontSize: '1rem',
        },
      },
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
)
