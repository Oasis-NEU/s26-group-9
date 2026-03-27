import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import './index.css'
import App from './App.jsx'

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
      <App />
    </ThemeProvider>
  </StrictMode>,
)
