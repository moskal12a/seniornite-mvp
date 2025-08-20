import fs from 'fs'
import path from 'path'
const DATA_DIR = path.join(process.cwd(), 'data', 'templates')
export default async function handler(req, res){
  try{
    await fs.promises.mkdir(DATA_DIR, { recursive: true })
    const ids = (await fs.promises.readdir(DATA_DIR)).filter(n=> fs.existsSync(path.join(DATA_DIR, n, 'manifest.json')))
    const templates = await Promise.all(ids.map(async id => {
      const mfPath = path.join(DATA_DIR,id,'manifest.json')
      const mf = JSON.parse(await fs.promises.readFile(mfPath,'utf8'))
      let previewUrl
      const hint = path.join(DATA_DIR,id,'_preview.txt')
      if (fs.existsSync(hint)){
        const p = (await fs.promises.readFile(hint,'utf8')).trim()
        previewUrl = `/api/templates/${id}/assets/${encodeURIComponent(p)}`
      }
      return { id, name: mf.name || `Template ${id}`, previewUrl }
    }))
    return res.status(200).json({ templates })
  } catch(e){ return res.status(200).json({ templates: [] }) }
}
