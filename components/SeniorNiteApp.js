
import React, { useCallback, useEffect, useRef, useState } from 'react'

export default function SeniorNiteApp(){
  const [file, setFile] = useState(null)
  const [originalUrl, setOriginalUrl] = useState(null)
  const [removedUrl, setRemovedUrl] = useState(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState(null)

  const [athleteName, setAthleteName] = useState('')
  const [jersey, setJersey] = useState('')
  const [school, setSchool] = useState('')
  const [year, setYear] = useState('')

  const [wmText, setWmText] = useState('SeniorNite.com • PROOF')
  const [wmOpacity, setWmOpacity] = useState(0.14)
  const [wmAngle, setWmAngle] = useState(-30)
  const [wmScale, setWmScale] = useState(1)
  const [accentColor, setAccentColor] = useState('#0ea5e9')
  const [showGrid, setShowGrid] = useState(true)

  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [manifest, setManifest] = useState(null)
  const [isUploadingTpl, setIsUploadingTpl] = useState(false)

  const canvasRef = useRef(null)

  const onDrop = useCallback((f)=>{
    setError(null); setRemovedUrl(null); setFile(f)
    setOriginalUrl(URL.createObjectURL(f))
  }, [])

  const handleFileInput = e => {
    if (e.target.files && e.target.files[0]) onDrop(e.target.files[0])
  }

  const removeBackground = async () => {
    if (!file) return
    setIsRemoving(true); setError(null); setRemovedUrl(null)
    try {
      const form = new FormData()
      form.append('image', file)
      const res = await fetch('/api/removebg', { method:'POST', body:form })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      setRemovedUrl(URL.createObjectURL(blob))
    } catch (e){
      setError(e?.message || 'Background removal failed.')
    } finally {
      setIsRemoving(false)
    }
  }

  const refreshTemplates = useCallback(async ()=>{
    const r = await fetch('/api/templates/list')
    if (r.ok){
      const j = await r.json()
      setTemplates(j.templates || [])
      if (!selectedTemplate && j.templates?.length) setSelectedTemplate(j.templates[0])
    }
  }, [selectedTemplate])

  useEffect(()=>{ refreshTemplates() }, [refreshTemplates])

  useEffect(()=>{
    (async ()=>{
      if (!selectedTemplate) return setManifest(null)
      const r = await fetch(`/api/templates/${selectedTemplate.id}/manifest`)
      if (r.ok) setManifest(await r.json())
    })()
  }, [selectedTemplate])

  const onUploadTemplatePack = async (e) => {
    const f = e.target.files?.[0]; if (!f) return
    setIsUploadingTpl(true)
    try {
      const form = new FormData()
      form.append('pack', f)
      const r = await fetch('/api/templates/upload', { method: 'POST', body: form })
      if (!r.ok) throw new Error(await r.text())
      await refreshTemplates()
    } catch (err){
      setError(err?.message || 'Template upload failed.')
    } finally {
      setIsUploadingTpl(false); e.target.value = ''
    }
  }

  useEffect(()=>{
    const imgSrc = removedUrl || originalUrl
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return

    const loadImage = (url) => new Promise((resolve, reject) => {
      const im = new Image(); im.crossOrigin = 'anonymous'
      im.onload = () => resolve(im); im.onerror = reject; im.src = url
    })

    ;(async ()=>{
      let W=900, H=1200
      if (manifest && manifest.canvas){ W=manifest.canvas.width; H=manifest.canvas.height }
      const maxW = 1100, scale = Math.min(1, maxW/W)
      const w = Math.round(W*scale), h = Math.round(H*scale)
      canvas.width = w; canvas.height = h

      if (showGrid) drawCheckerboard(ctx, w, h); else { ctx.fillStyle = '#0b1220'; ctx.fillRect(0,0,w,h) }

      const drawAsset = async (path, x,y, aw,ah, opacity=1) => {
        const base = `/api/templates/${selectedTemplate?.id}/assets/`
        const url = path.startsWith('http') ? path : base + encodeURIComponent(path.replace(/^assets\//,''))
        const im = await loadImage(url)
        ctx.save(); ctx.globalAlpha = opacity
        ctx.drawImage(im, Math.round(x*scale), Math.round(y*scale), Math.round(aw*scale), Math.round(ah*scale))
        ctx.restore()
      }

      if (manifest){
        for (const L of manifest.layers){
          if (L.type==='overlay' && /BACKGROUND/i.test(L.name)) await drawAsset(L.src,L.left,L.top,L.width,L.height,(L.opacity??100)/100)
        }
        if (imgSrc){
          const ph = manifest.layers.find(l => l.type==='placeholder' && l.name==='PLAYER_IMAGE')
          const im = await loadImage(imgSrc)
          const targetW = ph ? ph.width : W, targetH = ph ? ph.height : H
          const targetX = ph ? ph.left : 0, targetY = ph ? ph.top : 0
          const ratio = Math.max(targetW/im.width, targetH/im.height)
          const dw = im.width*ratio, dh = im.height*ratio
          const dx = targetX + (targetW - dw)/2, dy = targetY + (targetH - dh)/2
          ctx.drawImage(im, Math.round(dx*scale), Math.round(dy*scale), Math.round(dw*scale), Math.round(dh*scale))
        }
        for (const L of manifest.layers){
          if (L.type==='overlay' && !/BACKGROUND/i.test(L.name)) await drawAsset(L.src,L.left,L.top,L.width,L.height,(L.opacity??100)/100)
        }
        const nameMap = {
          TEXT_NAME: athleteName,
          TEXT_NUMBER: jersey ? `#${jersey}` : '',
          TEXT_SCHOOL: school,
          TEXT_YEAR: year,
        }
        for (const L of manifest.layers){
          if (L.type === 'text'){
            const value = nameMap[L.token] ?? ''
            drawOverlayText(ctx, value || L.name, (L.size||48)*scale, L.left*scale, L.top*scale, 'white', accentColor, 'left', L.opacity ?? 100)
          }
        }
      } else {
        if (imgSrc){
          const im = await loadImage(imgSrc)
          const ratio = Math.min(w/im.width, h/im.height)
          const dw = im.width*ratio, dh = im.height*ratio
          const dx = (w-dw)/2, dy = (h-dh)/2
          ctx.drawImage(im, dx, dy, dw, dh)
        }
        ctx.strokeStyle = accentColor; ctx.lineWidth = 6; ctx.strokeRect(3,3,w-6,h-6)
        drawOverlayText(ctx, athleteName, 36, 24, h-96, '#fff', accentColor)
        drawOverlayText(ctx, jersey?`#${jersey}`:'', 28, 24, h-56, '#e2e8f0')
        drawOverlayText(ctx, school, 24, w-24, h-96, '#e2e8f0', undefined, 'right')
        drawOverlayText(ctx, year, 24, w-24, h-56, '#0ea5e9', undefined, 'right')
      }
      drawWatermarkPattern(ctx, w, h, wmText, wmOpacity, wmAngle, wmScale)
    })()
  }, [removedUrl, originalUrl, manifest, selectedTemplate, athleteName, jersey, school, year, wmText, wmOpacity, wmAngle, wmScale, accentColor, showGrid])

  return (
    <div style={{maxWidth:1200, margin:'0 auto', padding:24}}>
      <h1 style={{fontWeight:800, fontSize:24, marginBottom:8}}>SeniorNite – Proof Generator</h1>
      <p style={{color:'#475569', marginBottom:16}}>Upload → Template → Remove Background → Watermarked Proof</p>

      <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:16}}>
        <div>
          <div style={{border:'1px dashed #cbd5e1', padding:16, borderRadius:12, background:'#fff', marginBottom:16}}>
            <label style={{display:'block', fontSize:12, color:'#334155', marginBottom:8}}>Template Pack (ZIP)</label>
            <input type="file" accept=".zip" onChange={onUploadTemplatePack} />
            <div style={{marginTop:8, fontSize:12, color:'#334155'}}>{isUploadingTpl?'Uploading…':''}</div>
          </div>

          <div style={{border:'1px solid #e2e8f0', borderRadius:12, padding:12, background:'#fff', marginBottom:16}}>
            <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8}}>
              {templates.map(t => (
                <button key={t.id} onClick={()=>setSelectedTemplate(t)} style={{border:selectedTemplate?.id===t.id?'2px solid #0ea5e9':'1px solid #e2e8f0', borderRadius:10, background:'#fff', cursor:'pointer'}}>
                  <div style={{height:100, background:'#f1f5f9', display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {t.previewUrl ? <img src={t.previewUrl} alt={t.name} style={{maxWidth:'100%', maxHeight:'100%'}}/> : <span style={{fontSize:12, color:'#94a3b8'}}>No preview</span>}
                  </div>
                  <div style={{padding:8, fontSize:12, fontWeight:600}}>{t.name || t.id}</div>
                </button>
              ))}
              {templates.length===0 && <div style={{gridColumn:'1 / -1', fontSize:12, color:'#64748b'}}>No templates yet — upload a pack to begin.</div>}
            </div>
          </div>

          <div style={{border:'1px dashed #cbd5e1', padding:16, borderRadius:12, background:'#fff', marginBottom:16, textAlign:'center'}}>
            <input id="file" type="file" accept="image/*" onChange={handleFileInput} />
            <div style={{fontSize:12, color:'#64748b'}}>JPG/PNG up to ~25MB</div>
          </div>

          <div style={{border:'1px solid #e2e8f0', borderRadius:12, padding:16, background:'#fff', marginBottom:16}}>
            <h3 style={{margin:'0 0 12px 0'}}>Poster Details</h3>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
              <label style={{gridColumn:'1 / -1', fontSize:12}}>Athlete Name<input value={athleteName} onChange={e=>setAthleteName(e.target.value)} style={{display:'block', width:'100%'}} placeholder="Declan Stone" /></label>
              <label style={{fontSize:12}}>Jersey #<input value={jersey} onChange={e=>setJersey(e.target.value)} style={{display:'block', width:'100%'}} placeholder="14" /></label>
              <label style={{fontSize:12}}>Year<input value={year} onChange={e=>setYear(e.target.value)} style={{display:'block', width:'100%'}} placeholder="2025" /></label>
              <label style={{gridColumn:'1 / -1', fontSize:12}}>School<input value={school} onChange={e=>setSchool(e.target.value)} style={{display:'block', width:'100%'}} placeholder="Hall Hockey" /></label>
            </div>
          </div>

          <div style={{display:'flex', gap:8}}>
            <button onClick={removeBackground} disabled={!file || isRemoving} style={{background:'#0284c7', color:'#fff', padding:'8px 12px', borderRadius:8, border:0}}>
              {isRemoving ? 'Removing…' : 'Remove Background'}
            </button>
            <a download={`SeniorNite-Proof-${athleteName||'Athlete'}.png`} href={canvasRef.current ? canvasRef.current.toDataURL('image/png'): undefined} style={{border:'1px solid #e2e8f0', padding:'8px 12px', borderRadius:8, background:'#fff', color:'#0f172a'}}>
              Download Proof PNG
            </a>
          </div>

          {error && <div style={{marginTop:8, color:'#b91c1c', fontSize:12}}>{error}</div>}
        </div>

        <div>
          <div style={{border:'1px solid #e2e8f0', borderRadius:12, background:'#fff', padding:12}}>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:12, color:'#475569', marginBottom:8}}>
              <div>{selectedTemplate ? <>Template: <b>{selectedTemplate.name||selectedTemplate.id}</b></> : 'Select a template'} {removedUrl ? ' • Background Removed' : originalUrl ? ' • Original' : ''}</div>
              <div style={{display:'flex', alignItems:'center', gap:6}}><span style={{width:8, height:8, background:'#0ea5e9', borderRadius:9999}}/> Ready</div>
            </div>
            <canvas ref={canvasRef} style={{width:'100%', background:'#0b1220', display:'block'}} />
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8}}>
            <Thumb label="Original" url={originalUrl} />
            <Thumb label="Removed" url={removedUrl} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Thumb({label, url}){
  return (
    <div style={{border:'1px solid #e2e8f0', borderRadius:12, background:'#fff', padding:8}}>
      <div style={{fontSize:12, color:'#475569', marginBottom:4}}>{label}</div>
      <div style={{height:160, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', borderRadius:8}}>
        {url ? <img src={url} alt={label} style={{maxHeight:'100%', width:'auto'}}/> : <span style={{fontSize:12, color:'#94a3b8'}}>—</span>}
      </div>
    </div>
  )
}

function drawCheckerboard(ctx, w, h){
  const size = 24
  for (let y=0; y<h; y+=size){
    for (let x=0; x<w; x+=size){
      const isDark = ((x/size)+(y/size)) % 2 === 0
      ctx.fillStyle = isDark ? '#e5e7eb' : '#f3f4f6'
      ctx.fillRect(x,y,size,size)
    }
  }
}

function drawOverlayText(ctx, text, fontSize, x,y, color, glow, align='left', opacityPct=100){
  if (!text) return
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, opacityPct/100))
  ctx.textAlign = align
  ctx.textBaseline = 'top'
  ctx.font = `700 ${Math.max(10, Math.round(fontSize))}px system-ui, -apple-system, 'Segoe UI', Roboto, Arial`
  if (glow){ ctx.shadowColor = glow; ctx.shadowBlur = 12 }
  ctx.fillStyle = color
  ctx.fillText(text, Math.round(x), Math.round(y))
  ctx.restore()
}

function drawWatermarkPattern(ctx, w,h, text, opacity, angleDeg, scale){
  if (!text) return
  const cx=w/2, cy=h/2
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.translate(cx,cy); ctx.rotate((angleDeg*Math.PI)/180); ctx.translate(-cx,-cy)
  const baseFont = Math.max(16, Math.round((w+h)/24 * scale))
  ctx.font = `700 ${baseFont}px system-ui, -apple-system`
  ctx.fillStyle = '#111827'
  const metrics = ctx.measureText(text)
  const stepX = metrics.width + 160, stepY = baseFont * 3
  for (let yy=-h; yy<h*2; yy+=stepY){ for (let xx=-w; xx<w*2; xx+=stepX){ ctx.fillText(text, xx, yy) } }
  ctx.restore()
}
