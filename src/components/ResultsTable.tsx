'use client'

interface ScanResult {
  ip: string
  port: number
  latency: number
  packetLoss: number
  status: 'candidate' | 'unreachable'
}

interface Props {
  results: ScanResult[]
  selectedIP: string | null
  onSelectIP: (ip: string) => void
  scanning: boolean
}

export default function ResultsTable({ results, selectedIP, onSelectIP, scanning }: Props) {
  if (results.length === 0 && !scanning) {
    return <div className="text-center py-8 text-gray-500 text-sm">Click &quot;Scan&quot; to find WARP-compatible endpoints</div>
  }
  if (results.length === 0 && scanning) {
    return <div className="text-center py-8 text-gray-500 text-sm scanning">Scanning WARP ports...</div>
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
      {results.map((r) => (
        <div
          key={`${r.ip}:${r.port}`}
          onClick={() => onSelectIP(`${r.ip}:${r.port}`)}
          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-150 ${
            selectedIP === `${r.ip}:${r.port}`
              ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold'
              : 'bg-gray-800/30 border border-gray-700/50 text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-mono">{r.ip}:{r.port}</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className={r.latency < 200 ? 'text-green-400' : r.latency < 500 ? 'text-yellow-400' : 'text-orange-400'}>
              {r.latency}ms
            </span>
            <span className={r.packetLoss === 0 ? 'text-green-400' : 'text-red-400'}>
              {r.packetLoss}% loss
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
              CANDIDATE
            </span>
            {selectedIP === `${r.ip}:${r.port}` && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
