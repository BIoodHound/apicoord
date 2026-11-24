import { useEffect, useState } from 'react'
import { ping } from './ipc/health'

export function App() {
  const [status, setStatus] = useState<string>('…')
  useEffect(() => {
    ping().then(setStatus).catch(e => setStatus('error: ' + e))
  }, [])
  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
      <h1>Hello</h1>
      <p>Tauri IPC roundtrip: <strong>{status}</strong></p>
    </main>
  )
}
