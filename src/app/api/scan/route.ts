import { NextRequest } from 'next/server'
import { scanIPs } from '../../../lib/scanner'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await req.json().catch(() => ({}))
        const targetClean = Math.min(body.targetClean || 20, 50)
        const concurrency = Math.min(body.concurrency || 15, 20)

        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        }

        send('start', { targetClean, concurrency })

        let lastTested = 0
        const results = await scanIPs(targetClean, concurrency, (result, tested, foundClean) => {
          lastTested = tested
          send('progress', { result, tested, foundClean })
        })

        send('done', {
          healthy: results.filter(r => r.status === 'healthy').length,
          slow: results.filter(r => r.status === 'slow').length,
          total: lastTested,
          results,
        })

        controller.close()
      } catch {
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Scan failed' })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}
