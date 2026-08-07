'use client'

import { useState, useCallback } from 'react'
import Header from '../components/Header'
import ScanButton from '../components/ScanButton'
import ResultsTable from '../components/ResultsTable'
import ConfigGenerator from '../components/ConfigGenerator'
import Toast from '../components/Toast'

interface ScanResult {
  ip: string
  port: number
  latency: number
  colo: string
  status: 'healthy' | 'slow' | 'dead'
}

export default function Home() {
  const [results, setResults] = useState<ScanResult[]>([])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState({ tested: 0, foundClean: 0 })
  const [testingIPs, setTestingIPs] = useState<string[]>([])
  const [selectedIP, setSelectedIP] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleScan = useCallback(async () => {
    if (scanning) return
    setScanning(true)
    setResults([])
    setProgress({ tested: 0, foundClean: 0 })
    setTestingIPs([])
    showToast('Scanning for clean Cloudflare endpoints...', 'info')

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetClean: 20, concurrency: 15 }),
      })
      if (!res.ok || !res.body) throw new Error('Scan request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let eventType = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) { eventType = ''; continue }
          if (line.startsWith('event: ')) { eventType = line.slice(7).trim(); continue }
          if (!line.startsWith('data: ')) continue

          const data = JSON.parse(line.slice(6))

          if (eventType === 'progress') {
            setProgress({ tested: data.tested, foundClean: data.foundClean })
            setTestingIPs(prev => [data.result.ip, ...prev.filter(ip => ip !== data.result.ip)].slice(0, 5))
            if (data.result.status !== 'dead') {
              setResults(prev => {
                if (prev.some(r => r.ip === data.result.ip && r.port === data.result.port)) return prev
                return [...prev, data.result]
              })
            }
          } else if (eventType === 'done') {
            setResults(data.results)
            setProgress({ tested: data.total, foundClean: data.healthy + data.slow })
            setTestingIPs([])
            showToast(`Found ${data.healthy + data.slow} clean endpoints`, 'success')
          } else if (eventType === 'error') {
            showToast(data.error, 'error')
          }
        }
      }
    } catch {
      showToast('Scan failed. Please try again.', 'error')
      setTestingIPs([])
    } finally {
      setScanning(false)
    }
  }, [scanning, showToast])

  return (
    <div className="relative z-10 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Header />
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card card-cyan p-6 relative">
            <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-cyan-500/40 rounded-tl-xl" />
            <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-cyan-500/40 rounded-br-xl" />
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Cloudflare IP Scanner</h2>
            <ScanButton scanning={scanning} progress={progress} testingIPs={testingIPs} onClick={handleScan} />
            <ResultsTable results={results} selectedIP={selectedIP} onSelectIP={setSelectedIP} scanning={scanning} />
          </div>
          <div className="card card-purple p-6 relative">
            <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-purple-500/40 rounded-tl-xl" />
            <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-purple-500/40 rounded-br-xl" />
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">AmneziaWG Config Generator</h2>
            <ConfigGenerator selectedIP={selectedIP} onSelectIP={setSelectedIP} showToast={showToast} />
          </div>
        </div>
        <footer className="mt-8 text-center text-xs text-gray-500">
          <p>CleanAmnezia &mdash; Cloudflare IP Scanner + AmneziaWG Config Generator</p>
        </footer>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
