'use client'

import { useState } from 'react'

const WORKER_ENDPOINTS = [
  'https://warp.configwireguard.workers.dev/',
  'https://warp.configwireguard2.workers.dev/',
  'https://warp.configwireguard3.workers.dev/',
  'https://warp.configwireguard4.workers.dev/',
]

interface Props {
  selectedIP: string | null
  onSelectIP: (ip: string) => void
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
}

interface WARPConfig {
  privateKey: string
  address: string
  dns: string
  mtu: number
  publicKey: string
  allowedIPs: string
}

async function fetchFromWorkers(): Promise<string> {
  const shuffled = [...WORKER_ENDPOINTS].sort(() => Math.random() - 0.5)

  for (const url of shuffled) {
    try {
      let response: Response
      try {
        response = await fetch(url)
      } catch {
        response = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url))
      }
      if (!response.ok) continue

      const rawText = await response.text()
      try {
        const parsed = JSON.parse(rawText)
        return parsed.config || rawText
      } catch {
        return rawText
      }
    } catch {
      continue
    }
  }
  throw new Error('All WARP config endpoints failed')
}

function parseWGConfig(text: string): WARPConfig {
  const config: WARPConfig = {
    privateKey: '',
    address: '',
    dns: '',
    mtu: 1280,
    publicKey: '',
    allowedIPs: '0.0.0.0/0, ::/0',
  }

  let section = ''

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    if (line.startsWith('[') && line.endsWith(']')) {
      section = line.slice(1, -1).toLowerCase()
      continue
    }

    const eq = line.indexOf('=')
    if (eq === -1) continue

    const key = line.slice(0, eq).trim().toLowerCase()
    const value = line.slice(eq + 1).trim()

    if (section === 'interface') {
      if (key === 'privatekey') config.privateKey = value
      else if (key === 'address') config.address = value
      else if (key === 'dns') config.dns = value
      else if (key === 'mtu') config.mtu = parseInt(value) || 1280
    } else if (section === 'peer') {
      if (key === 'publickey') config.publicKey = value
      else if (key === 'allowedips') config.allowedIPs = value
    }
  }

  return config
}

function generateAmneziaWGConfig(
  warpConfig: WARPConfig,
  endpoint: string
): string {
  return [
    '# Generated AmneziaWG Config',
    '[Interface]',
    `PrivateKey = ${warpConfig.privateKey}`,
    `Address = ${warpConfig.address}`,
    `DNS = ${warpConfig.dns}`,
    `MTU = ${warpConfig.mtu}`,
    '',
    'Jc = 3',
    'Jmin = 1',
    'Jmax = 3',
    'S1 = 0',
    'S2 = 0',
    'H1 = 1',
    'H2 = 2',
    'H3 = 3',
    'H4 = 4',
    '',
    '[Peer]',
    `PublicKey = ${warpConfig.publicKey}`,
    `AllowedIPs = ${warpConfig.allowedIPs}`,
    `Endpoint = ${endpoint}`,
  ].join('\n')
}

export default function ConfigGenerator({ selectedIP, onSelectIP, showToast }: Props) {
  const [customIP, setCustomIP] = useState('')
  const [config, setConfig] = useState('')
  const [generating, setGenerating] = useState(false)

  const activeEndpoint = selectedIP || customIP || null

  const handleGenerate = async () => {
    if (!activeEndpoint) return

    setGenerating(true)
    setConfig('')
    showToast('Generating config...', 'info')

    try {
      const rawConfig = await fetchFromWorkers()
      const wgConfig = parseWGConfig(rawConfig)

      if (!wgConfig.privateKey) {
        throw new Error('Invalid config from server: no PrivateKey found')
      }

      const awgConfig = generateAmneziaWGConfig(wgConfig, activeEndpoint)
      setConfig(awgConfig)
      showToast('Config generated successfully!', 'success')
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Generation failed'
      showToast(msg, 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!config) return
    const now = new Date()
    const fileName = `CleanAmnezia_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}.conf`
    const blob = new Blob([config], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('Config downloaded!', 'success')
  }

  const handleCopy = async () => {
    if (!config) return
    try {
      await navigator.clipboard.writeText(config)
      showToast('Config copied to clipboard!', 'success')
    } catch {
      showToast('Failed to copy', 'error')
    }
  }

  return (
    <div className="space-y-4">
      {/* IP Input */}
      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
          Clean IP Endpoint
        </label>
        <input
          type="text"
          value={selectedIP || customIP}
          onChange={(e) => {
            setCustomIP(e.target.value)
            onSelectIP('')
          }}
          placeholder="Select from scan results or enter manually"
          className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-gray-200 font-mono focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20"
        />
        {!activeEndpoint && (
          <p className="mt-1 text-xs text-yellow-500/70">
            Select a clean IP from scan results or enter one manually
          </p>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={generating || !activeEndpoint}
        className="w-full py-3 px-4 rounded-lg font-semibold text-sm uppercase tracking-wider transition-all duration-250 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {generating ? (
          <>
            <span className="spinner" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Generate AmneziaWG Config</span>
          </>
        )}
      </button>

      {/* Config Output */}
      {config && (
        <div className="fade-in">
          <textarea
            readOnly
            value={config}
            className="config-output"
            rows={14}
          />

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDownload}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-all flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download .conf
            </button>
            <button
              onClick={handleCopy}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-all flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy Config
            </button>
          </div>
        </div>
      )}
    </div>
  )
}