export const config = { api: { bodyParser: false } }
export default async function handler(req, res){
  try{
    if (req.method !== 'POST'){ res.setHeader('Allow',['POST']); return res.status(405).json({error:'Method Not Allowed'}) }
    const chunks = []; for await (const c of req) chunks.push(c); const buffer = Buffer.concat(chunks)
    const apiKey = process.env.REMOVE_BG_API_KEY
    if (!apiKey) return res.status(500).json({ error:'Missing REMOVE_BG_API_KEY' })
    const r = await fetch('https://api.remove.bg/v1.0/removebg', { method:'POST', headers:{ 'X-Api-Key': apiKey }, body: buffer })
    if (!r.ok){ const t = await r.text(); return res.status(r.status).send(t) }
    const ab = await r.arrayBuffer()
    res.setHeader('Content-Type','image/png'); res.setHeader('Cache-Control','no-store')
    return res.status(200).send(Buffer.from(ab))
  }catch(e){ return res.status(500).json({ error: e?.message || 'Server error' }) }
}
