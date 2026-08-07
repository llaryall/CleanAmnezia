'use client'

interface ScanResult {
  ip: string
  port: number
  latency: number
  colo: string
  status: 'healthy' | 'slow' | 'dead'
}

interface Props {
  results: ScanResult[]
  selectedIP: string | null
  onSelectIP: (ip: string) => void
  scanning: boolean
}

export default function ResultsTable({ results, selectedIP, onSelectIP, scanning }: Props) {
  if (results.length === 0 && !scanning) {
    return <div className="text-center py-8 text-gray-500 text-sm">Click &quot;Scan Clean IPs&quot; to find endpoints</div>
  }
  if (results.length === 0 && scanning) {
    return <div className="text-center py-8 text-gray-500 text-sm scanning">Scanning Cloudflare IPs...</div>
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
            <span className={`w-2 h-2 rounded-full ${r.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-sm font-mono">{r.ip}:{r.port}</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className={r.latency < 200 ? 'text-green-400' : r.latency < 500 ? 'text-yellow-400' : 'text-orange-400'}>
              {r.latency}ms
            </span>
            {r.colo && <span className="text-gray-600">{r.colo}</span>}
            <span className={r.status === 'healthy' ? 'text-green-400' : 'text-yellow-400'}>
              {r.status === 'healthy' ? 'Fast' : 'Slow'}
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
