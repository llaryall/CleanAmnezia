# CleanAmnezia

Cloudflare IP scanner + AmneziaWG config generator for Iranian users.

## Features

- Scan Cloudflare IP ranges for clean (unfiltered) endpoints
- Test TCP, TLS, HTTP connectivity and stability
- Real-time scan progress with Server-Sent Events
- Generate AmneziaWG configs with WARP API
- Dark theme UI with responsive design
- Direct WARP API integration (no third-party workers)

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Node.js crypto for WireGuard key generation

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## How It Works

1. **Scan**: Generates random IPs from Cloudflare ranges and tests them
2. **Test**: TCP connect, TLS handshake, HTTP `/cdn-cgi/trace`, stability check
3. **Config**: Registers with WARP API, generates AmneziaWG config with clean IP endpoint

## Based On

- [SenPai Scanner](https://github.com/MatinSenPai/SenPaiScanner) (MIT) - Cloudflare IP scanning logic
- [Amnezia VPN Config](https://github.com/darknessshade/Amnezia-VPN-Config) (MIT) - AmneziaWG config generation

## License

MIT
