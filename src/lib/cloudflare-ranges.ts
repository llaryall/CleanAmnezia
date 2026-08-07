
const CF_RANGES_URL = 'https://www.cloudflare.com/ips-v4/'

// Default ranges as fallback
const DEFAULT_RANGES = [
'173.245.48.0/20',
'103.21.244.0/22',
'103.22.200.0/22',
'103.31.4.0/22',
'141.101.64.0/18',
'108.162.192.0/18',
'190.93.240.0/20',
'188.114.96.0/20',
'197.234.240.0/22',
'198.41.128.0/17',
'162.158.0.0/15',
'104.16.0.0/13',
'104.24.0.0/14',
'172.64.0.0/13',
'131.0.72.0/22',
]

// WARP-specific ranges (known working WARP server IPs)
const WARP_RANGES = [
'162.159.192.0/24',
'162.159.193.0/24',
'162.159.194.0/24',
'162.159.195.0/24',
'162.159.196.0/24',
'162.159.197.0/24',
'188.114.96.0/24',
'188.114.97.0/24',
'188.114.98.0/24',
'188.114.99.0/24',
'8.6.112.0/24',
]

interface Range {
start: number
end: number
}

function cidrToRange(cidr: string): Range | null {
const parts = cidr.trim().split('/')
if (parts.length !== 2) return null

const ipParts = parts[0].split('.').map(Number)
if (ipParts.length !== 4 || ipParts.some(p => isNaN(p) || p < 0 || p > 255)) return null

const mask = parseInt(parts[1])
if (isNaN(mask) || mask < 0 || mask > 32) return null

const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]
const hostBits = 32 - mask
const start = ipNum & (~((1 << hostBits) - 1))
const end = start | ((1 << hostBits) - 1)

return { start, end }
}

function intToIp(num: number): string {
return [
(num >>> 24) & 255,
(num >>> 16) & 255,
(num >>> 8) & 255,
num & 255,
].join('.')
}

export async function fetchCloudflareRanges(): Promise<string[]> {
return WARP_RANGES
}

export function getWarpRanges(): string[] {
return WARP_RANGES
}

export function generateRandomIPs(ranges: string[], count: number): string[] {
const parsed = ranges.map(cidrToRange).filter(Boolean) as Range[]
if (parsed.length === 0) return []

const ips: string[] = []
const seen = new Set()

let attempts = 0
while (ips.length < count && attempts < count * 10) {
attempts++
const range = parsed[Math.floor(Math.random() * parsed.length)]
const offset = Math.floor(Math.random() * (range.end - range.start - 1)) + 1
const ip = intToIp(range.start + offset)

if (!seen.has(ip)) {
  seen.add(ip)
  ips.push(ip)
}


}

return ips
}
