import { createRoot } from 'react-dom/client'
import { MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import App from './App.tsx'
import { Web3Provider } from './contexts/Web3Context.tsx'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './index.css'

const theme = createTheme({
  /** Put your mantine theme override here */
})

const root = createRoot(document.getElementById('root')!)

root.render(
  <MantineProvider theme={theme}>
    <Notifications position="top-right" />
    <Web3Provider>
      <App />
    </Web3Provider>
  </MantineProvider>,
)
