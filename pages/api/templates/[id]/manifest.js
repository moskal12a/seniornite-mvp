import fs from 'fs'
import path from 'path'
const DATA_DIR = path.join(process.cwd(), 'data', 'templates')
export default async function handler(req, res){
  const { id } = req.query
  const p = path.join(DATA_DIR, id, 'manifest.json')
  if (!fs.existsSync(p)) return res.status(404).json({ error:'Not found' })
  const j = JSON.parse(await fs.promises.readFile(p,'utf8'))
  return res.status(200).json(j)
}
