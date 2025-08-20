import formidable from 'formidable'
import AdmZip from 'adm-zip'
import fs from 'fs'
import path from 'path'
export const config = { api: { bodyParser: false } }
const DATA_DIR = path.join(process.cwd(), 'data', 'templates')
export default async function handler(req, res){
  if (req.method !== 'POST'){ res.setHeader('Allow',['POST']); return res.status(405).json({error:'Method Not Allowed'}) }
  await fs.promises.mkdir(DATA_DIR, { recursive: true })
  const form = formidable({ multiples:false })
  const { files } = await new Promise((resolve, reject)=>{ form.parse(req,(err,fields,files)=> err?reject(err):resolve({fields,files})) })
  const f = files.pack; if (!f) return res.status(400).json({ error:'Missing pack file' })
  const zip = new AdmZip(f.filepath || f._writeStream?.path || f.path)
  const id = String(Date.now())
  const outDir = path.join(DATA_DIR, id)
  await fs.promises.mkdir(outDir, { recursive: true })
  zip.extractAllTo(outDir, true)
  const manifestPath = path.join(outDir, 'manifest.json')
  if (!fs.existsSync(manifestPath)) return res.status(400).json({ error:'manifest.json not found' })
  const maybePreview = ['preview.png','assets/BACKGROUND.png'].find(p=> fs.existsSync(path.join(outDir, p)))
  if (maybePreview) await fs.promises.writeFile(path.join(outDir, '_preview.txt'), maybePreview)
  return res.status(200).json({ id, ok:true })
}
