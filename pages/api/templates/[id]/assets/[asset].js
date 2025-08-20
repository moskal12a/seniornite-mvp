import fs from 'fs'
import path from 'path'
const DATA_DIR = path.join(process.cwd(), 'data', 'templates')
export default async function handler(req, res){
  const { id, asset } = req.query
  const dir = path.join(DATA_DIR, id)
  const candidates = [ path.join(dir, asset), path.join(dir, 'assets', asset) ]
  const p = candidates.find(p=> fs.existsSync(p))
  if (!p) return res.status(404).send('Not found')
  const buf = await fs.promises.readFile(p)
  const ext = path.extname(p).toLowerCase()
  const type = ext === '.png' ? 'image/png' : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : 'application/octet-stream'
  res.setHeader('Content-Type', type); res.setHeader('Cache-Control','no-store'); return res.status(200).send(buf)
}
