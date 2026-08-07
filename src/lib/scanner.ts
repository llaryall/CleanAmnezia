import * as net from 'net'
import * as tls from 'tls'
import { fetchCloudflareRanges, generateRandomIPs } from './cloudflare-ranges'

export interface ScanResult {
  ip: string
  port: number
  latency: number
  colo: string
  status: 'healthy' | 'slow' | 'dead'
}

const ALL_PORTS = [443, 8443, ...[854, 859, 878, 880, 891, 903, 908, 928, 939, 942, 945, 946, 968, 1010, 1014, 1070, 1180, 1387, 1843, 2506, 3138, 3581, 3854, 4177, 4198, 4233, 7103, 7152, 7156, 7281, 7559, 8319, 8854, 8886]]

const SNI_HOSTNAMES = ['speed.cloudflare.com', 'www.cloudflare.com', 'cloudflare.com']
function randomSNI(): string {
  return SNI_HOSTNAMES[Math.floor(Math.random() * SNI_HOSTNAMES.length)]
}

function probeTCP(ip: string, port: number, timeout: number): Promise<number> {
  return new Promise(resolve => {
    const start = Date.now()
    const socket = net.createConnection({ host: ip, port, timeout })
    const done = (ms: number) => { socket.destroy(); resolve(ms) }
    socket.on('connect', () => done(Date.now() - start))
    socket.on('error', () => done(0))
    socket.on('timeout', () => done(0))
    setTimeout(() => done(0), timeout)
  })
}

function probeTLS(ip: string, port: number, sni: string, timeout: number): Promise<boolean> {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: ip, port, timeout })
    const tlsSocket = tls.connect({ socket, servername: sni, minVersion: 'TLSv1.2', rejectUnauthorized: false, timeout })
    const done = (ok: boolean) => { tlsSocket.destroy(); socket.destroy(); resolve(ok) }
    tlsSocket.on('secureConnect', () => done(true))
    tlsSocket.on('error', () => done(false))
    tlsSocket.on('timeout', () => done(false))
    setTimeout(() => done(false), timeout)
  })
}

function probeHTTP(ip: string, port: number, sni: string, timeout: number): Promise<{ ok: boolean; colo: string }> {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: ip, port, timeout })
    const tlsSocket = tls.connect({ socket, servername: sni, minVersion: 'TLSv1.2', rejectUnauthorized: false, timeout })
    const done = (ok: boolean, colo: string) => { tlsSocket.destroy(); socket.destroy(); resolve({ ok, colo }) }
    tlsSocket.on('secureConnect', () => {
      tlsSocket.write(`GET /cdn-cgi/trace HTTP/1.1\r\nHost: ${sni}\r\nUser-Agent: CleanAmnezia/1.0\r\nConnection: close\r\n\r\n`)
      let data = ''
      tlsSocket.on('data', (chunk) => { data += chunk.toString() })
      tlsSocket.on('end', () => {
        const coloMatch = data.match(/colo=([A-Z]{3})/)
        done(data.includes('HTTP/') && coloMatch !== null, coloMatch?.[1] || '')
      })
      setTimeout(() => done(false, ''), timeout)
    })
    tlsSocket.on('error', () => done(false, ''))
    tlsSocket.on('timeout', () => done(false, ''))
    setTimeout(() => done(false, ''), timeout)
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

      // TCP all ports parallel
      const tcpResults = await Promise.all(
        ALL_PORTS.map(port => probeTCP(ip, port, timeout).then(latency => ({ port, latency }))),
      )
      const openPorts = tcpResults.filter(r => r.latency > 0).sort((a, b) => a.latency - b.latency).slice(0, 5)

      // TLS + HTTP on open ports
      for (const { port, latency } of openPorts) {
        if (results.length >= targetClean) break
        const sni = randomSNI()
        const tlsOk = await probeTLS(ip, port, sni, timeout)
        tested++
        if (!tlsOk) { onProgress({ ip, port, latency: 0, colo: '', status: 'dead' }, tested, results.length); continue }

        const http = await probeHTTP(ip, port, sni, timeout)
        if (http.ok) {
          const r: ScanResult = { ip, port, latency, colo: http.colo, status: latency < 300 ? 'healthy' : 'slow' }
          results.push(r)
          onProgress(r, tested, results.length)
        } else {
          onProgress({ ip, port, latency: 0, colo: '', status: 'dead' }, tested, results.length)
        }
      }
    }
  }

  return results.sort((a, b) => a.latency - b.latency)
}
