
'use client'

interface Props {
  scanning: boolean
  progress: { tested: number; foundClean: number }
  testingIPs: string[]
  onClick: () => void
}

export default function ScanButton({ scanning, progress, testingIPs, onClick }: Props) {
  return (
    <div className="mb-6">
      <button
        onClick={onClick}
        disabled={scanning}
        className="btn-generate w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm"
      >
        {scanning ? (
          <>
            <span className="spinner" />
            <span>Found {progress.foundClean} clean IPs ({progress.tested} tested)</span>
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Scan Clean IPs</span>
          </>
        )}
      </button>

      {scanning && (
        <div className="mt-3 space-y-3">
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((progress.foundClean / 20) * 100, 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <p className="text-xs text-gray-500 text-center">
              {progress.foundClean} clean IPs found
            </p>
            <div className="text-xs text-gray-300 bg-gray-900/80 rounded-lg p-2">
              <p className="font-semibold text-gray-200">Currently testing</p>
              {testingIPs.length > 0 ? (
                <ul className="mt-1 space-y-1">
                  {testingIPs.map(ip => (
                    <li key={ip} className="truncate">{ip}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">Waiting for results...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
