import * as net from 'net'
import * as dgram from 'dgram'
import { fetchCloudflareRanges, generateRandomIPs } from './cloudflare-ranges'

export interface ScanResult {
  ip: string
  port: number
  latency: number
  colo: string
  status: 'healthy' | 'slow' | 'dead'
}

// Known WARP / WireGuard-compatible ports.
// 2408 is the main Cloudflare WARP WireGuard port.
// 500 / 4500 are often usable in restrictive networks.
const WARP_WG_PORTS = [2408, 500, 4500]

function probeUDP(ip: string, port: number, timeout: number): Promise<number> {
  return new Promise(resolve => {
    const start = Date.now()
    const socket = dgram.createSocket('udp4')

    let finished = false

    const done = (ms: number) => {
      if (finished) return
      finished = true
      socket.close()
      resolve(ms)
    }

    socket.on('error', () => done(0))

    // Small WireGuard-like initiation payload.
    const payload = Buffer.from([
      0x01, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
    ])

    socket.send(payload, port, ip, err => {
      if (err) {
        done(0)
        return
      }

      // UDP has no connect state.
      // If socket stays alive without ICMP rejection,
      // we treat it as potentially usable.
      setTimeout(() => done(Date.now() - start), 300)
    })

    setTimeout(() => done(0), timeout)
  })
}

export async function scanIPs(
  targetClean: number,
  concurrency: number,
  onProgress: (result: ScanResult, tested: number, foundClean: number) => void,
): Promise<ScanResult[]> {
  const ranges = await fetchCloudflareRanges()
  const results: ScanResult[] = []
  const allTested = new Set<string>()
  let tested = 0
  const timeout = 3000
  const maxRounds = 30

  for (let round = 0; round < maxRounds && results.length < targetClean; round++) {
    const batchSize = Math.min(concurrency * 4, 256)
    const ips = generateRandomIPs(ranges, batchSize).filter(ip => !allTested.has(ip))
    if (ips.length === 0) continue

    for (const ip of ips) {
      if (results.length >= targetClean) break
      allTested.add(ip)

      // UDP WireGuard/WARP probe
      const udpResults = await Promise.all(
        WARP_WG_PORTS.map(port => probeUDP(ip, port, timeout).then(latency => ({ port, latency }))),
      )
      const openPorts = udpResults.filter(r => r.latency > 0).sort((a, b) => a.latency - b.latency).slice(0, 3)

      // Only expose endpoints that look usable for WG/WARP transport.
      for (const { port, latency } of openPorts) {
        if (results.length >= targetClean) break
        tested++

        const r: ScanResult = {
          ip,
          port,
          latency,
          colo: 'WARP',
          status: latency < 200 ? 'healthy' : 'slow',
        }

        results.push(r)
        onProgress(r, tested, results.length)
      }
    }
  }

  return results.sort((a, b) => a.latency - b.latency)
}
