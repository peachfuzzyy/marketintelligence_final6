'use client'
import { SecLabel,Card,CardTitle,KpiCard,Grid,THead,TRow,ZBadge,PctileBar,Badge,fmt,chgClass,chgSign,px } from './ui'

// ── Macro regime tag ─────────────────────────────────────────────────────────
function buildRegime(data) {
  const { sentiment={}, indices=[], fx=[], spread2s10s, rates=[] } = data

  const tags = []

  // Risk on/off from VIX + SPX
  const spx = indices.find(d => d.name === 'S&P 500')
  const vix = sentiment.vix
  if (vix != null && spx?.chgPct != null) {
    if (vix > 25 || spx.chgPct < -1) tags.push({ label: 'Risk-off', color: '#E24B4A' })
    else if (vix < 15 && spx.chgPct > 0) tags.push({ label: 'Risk-on', color: '#1D9E75' })
    else tags.push({ label: 'Risk-neutral', color: '#6B7A8D' })
  }

  // USD direction from DXY
  const dxy = fx.find(d => d.name === 'DXY')
  if (dxy?.chgPct != null) {
    tags.push({
      label: dxy.chgPct > 0.1 ? 'USD bid' : dxy.chgPct < -0.1 ? 'USD offered' : 'USD flat',
      color: dxy.chgPct > 0.1 ? '#E24B4A' : dxy.chgPct < -0.1 ? '#1D9E75' : '#6B7A8D'
    })
  }

  // Curve shape from 2s10s + 10Y direction
  const r10 = rates.find(d => d.name === 'US 10Y')
  const r2 = rates.find(d => d.name === 'US 2Y')
  if (spread2s10s != null && r10?.chgPct != null && r2?.chgPct != null) {
    const steepening = (r10.chgPct - r2.chgPct) > 0
    const risingRates = r10.chgPct > 0
    let curveLabel
    if (steepening && risingRates) curveLabel = 'Bear steepener'
    else if (steepening && !risingRates) curveLabel = 'Bull steepener'
    else if (!steepening && risingRates) curveLabel = 'Bear flattener'
    else curveLabel = 'Bull flattener'
    tags.push({ label: curveLabel, color: '#BA7517' })
  }

  // Inverted curve flag
  if (spread2s10s != null && spread2s10s < 0) {
    tags.push({ label: 'Curve inverted', color: '#E24B4A' })
  }

  return tags
}

// ── Vol term structure per pair ──────────────────────────────────────────────
function VolStructureSignal({ v10, v90 }) {
  if (v10 == null || v90 == null) return <span style={{color:'var(--muted)',fontSize:11}}>—</span>
  const isContango = v90 > v10
  return (
    <Badge variant={isContango ? 'amber' : 'blue'}>
      {isContango ? 'Contango' : 'Backwdn'}
    </Badge>
  )
}

export default function Insti({ data }) {
  if (!data) return null
  const {
    fx=[], indices=[], mag7=[], commodities=[], crypto=[], rates=[],
    spread2s10s, sentiment={}, sectors=[], breadth={}, volSurface=[], brentCurve=[], correlations={labels:[],matrix:[]}
  } = data

  const regimeTags = buildRegime(data)

  return (
    <div>

      {/* ── MACRO REGIME HEADER ── */}
      {regimeTags.length > 0 && (
        <div style={{
          display:'flex', alignItems:'center', gap:10, flexWrap:'wrap',
          padding:'12px 16px', background:'#0D1B2A', borderRadius:8,
          marginBottom:4, border:'0.5px solid #243B55'
        }}>
          <span style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.35)',letterSpacing:'0.1em',textTransform:'uppercase',marginRight:4}}>
            Macro regime
          </span>
          {regimeTags.map((t, i) => (
            <span key={i} style={{
              display:'inline-flex', alignItems:'center', gap:5,
              padding:'3px 10px', borderRadius:4, fontSize:12, fontWeight:600,
              background:'rgba(255,255,255,0.06)', color:t.color,
              border:`0.5px solid ${t.color}33`
            }}>
              <span style={{width:6,height:6,borderRadius:'50%',background:t.color,display:'inline-block'}}/>
              {t.label}
            </span>
          ))}
        </div>
      )}

      {/* ── SENTIMENT ── */}
      <SecLabel style={{marginTop:16}}>Sentiment</SecLabel>
      <Grid cols={4}>
        <KpiCard label="VIX" value={sentiment.vix ? fmt(sentiment.vix,1) : '—'}
          sub={`${chgSign(sentiment.vixChg)} today · ${sentiment.fearLevel||'—'}`}
          subClass={sentiment.vix>20?'dn':sentiment.vix<15?'up':''}/>
        <KpiCard label="VIX Z-score" value={sentiment.vixZ ? `${sentiment.vixZ>=0?'+':''}${fmt(sentiment.vixZ,1)}σ` : '—'}
          sub={Math.abs(sentiment.vixZ||0)>2?'Statistically extreme':'Within normal range'}
          subClass={Math.abs(sentiment.vixZ||0)>2?'dn':''}/>
        <KpiCard label="Fear level" value={sentiment.fearLevel||'—'} sub="Based on VIX level"/>
        <KpiCard label="VIX 52W %ile" value={sentiment.vixPct!=null?`${sentiment.vixPct}%`:'—'} sub="vs 1-year range"/>
      </Grid>

      {/* ── GLOBAL INDICES ── */}
      <SecLabel>Global indices</SecLabel>
      <Card>
        <THead cols="120px 90px 65px 60px 1fr 75px 70px">
          <span>Index</span><span>Price</span><span>Chg%</span><span>Z-score</span><span>52W %ile</span><span>52W High</span><span>vs 200DMA</span>
        </THead>
        {indices.map((d,i) => (
          <TRow key={d.name} cols="120px 90px 65px 60px 1fr 75px 70px" last={i===indices.length-1}>
            <span style={{fontWeight:500}}>{d.name}</span>
            <span style={{fontFamily:'monospace'}}>{d.last?d.last.toLocaleString():'—'}</span>
            <span className={chgClass(d.chgPct)}>{chgSign(d.chgPct)}</span>
            <ZBadge z={d.zscore}/>
            <PctileBar pct={d.pctile}/>
            <span style={{fontSize:11,color:'var(--muted)'}}>{d.w52high?d.w52high.toLocaleString():'—'}</span>
            <span className={d.ma200pct>=0?'up':'dn'} style={{fontSize:11}}>{chgSign(d.ma200pct)}</span>
          </TRow>
        ))}
      </Card>

      {/* ── SECTOR HEATMAP ── */}
      <SecLabel>S&P 500 sector heatmap</SecLabel>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:4}}>
        {sectors.map(s => {
          const c = s.chgPct || 0
          const bg = c>1?'rgba(29,158,117,0.18)':c>0?'rgba(29,158,117,0.09)':c>-1?'rgba(226,75,74,0.09)':'rgba(226,75,74,0.18)'
          const border = c>0?'rgba(29,158,117,0.35)':'rgba(226,75,74,0.35)'
          return (
            <div key={s.ticker} style={{background:bg,border:`0.5px solid ${border}`,borderRadius:8,padding:'10px 12px'}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>{s.name}</div>
              <div style={{fontSize:16,fontWeight:600}} className={chgClass(s.chgPct)}>{chgSign(s.chgPct)}</div>
              <div style={{fontSize:10,color:'var(--muted)',marginTop:3}}>
                Z: {s.zscore!=null?`${s.zscore>=0?'+':''}${fmt(s.zscore,1)}σ`:'—'} · 1W: {chgSign(s.ret1w)}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── MAG7 ── */}
      <SecLabel>MAG7</SecLabel>
      <Card>
        <THead cols="75px 80px 65px 60px 1fr 70px 70px 70px">
          <span>Stock</span><span>Price</span><span>Chg%</span><span>Z-score</span>
          <span>52W %ile</span><span>vs 200DMA</span><span>Vol ratio</span><span>vs 52W Hi</span>
        </THead>
        {mag7.map((d,i) => (
          <TRow key={d.name} cols="75px 80px 65px 60px 1fr 70px 70px 70px" last={i===mag7.length-1}>
            <span style={{fontWeight:600}}>{d.name}</span>
            <span style={{fontFamily:'monospace'}}>${d.last?px(d.last,2):'—'}</span>
            <span className={chgClass(d.chgPct)}>{chgSign(d.chgPct)}</span>
            <ZBadge z={d.zscore}/>
            <PctileBar pct={d.pctile}/>
            <span className={d.ma200pct>=0?'up':'dn'}>{chgSign(d.ma200pct)}</span>
            <span style={{color:d.volRatio>2?'var(--orange)':d.volRatio>1.5?'var(--warn)':'var(--muted)'}}>{d.volRatio?`${fmt(d.volRatio)}×`:'—'}</span>
            <span className={d.pctFrom52wHigh>=0?'up':'dn'}>{chgSign(d.pctFrom52wHigh)}</span>
          </TRow>
        ))}
      </Card>

      {/* ── BREADTH ── */}
      <SecLabel>Market breadth proxies</SecLabel>
      <Grid cols={3}>
        {[{label:'SPY (S&P 500)',d:breadth.spy},{label:'QQQ (Nasdaq)',d:breadth.qqq},{label:'IWM (Russell 2000)',d:breadth.iwm}].map(({label,d})=>(
          <KpiCard key={label} label={label}
            value={chgSign(d?.chgPct)}
            sub={`vs 200DMA: ${chgSign(d?.ma200pct)} · 52W: ${d?.pctile!=null?d.pctile+'%':'—'}`}
            subClass={chgClass(d?.chgPct)}/>
        ))}
      </Grid>

      {/* ── FX ── */}
      <SecLabel>FX</SecLabel>
      <Card>
        <THead cols="100px 80px 65px 60px 1fr 75px 75px 70px">
          <span>Pair</span><span>Price</span><span>Chg%</span><span>Z-score</span>
          <span>52W %ile</span><span>52W High</span><span>52W Low</span><span>vs 200DMA</span>
        </THead>
        {fx.map((d,i) => (
          <TRow key={d.name} cols="100px 80px 65px 60px 1fr 75px 75px 70px" last={i===fx.length-1}>
            <span style={{fontWeight:500}}>{d.name}</span>
            <span style={{fontFamily:'monospace'}}>{d.last?px(d.last,4):'—'}</span>
            <span className={chgClass(d.chgPct)}>{chgSign(d.chgPct)}</span>
            <ZBadge z={d.zscore}/>
            <PctileBar pct={d.pctile}/>
            <span style={{fontSize:11,color:'var(--muted)'}}>{d.w52high?px(d.w52high,4):'—'}</span>
            <span style={{fontSize:11,color:'var(--muted)'}}>{d.w52low?px(d.w52low,4):'—'}</span>
            <span className={d.ma200pct>=0?'up':'dn'} style={{fontSize:11}}>{chgSign(d.ma200pct)}</span>
          </TRow>
        ))}
      </Card>

      {/* ── US TREASURY CURVE ── */}
      <SecLabel>US Treasury curve</SecLabel>
      <Card>
        <div style={{display:'flex',alignItems:'flex-end',gap:10,height:90,marginBottom:8}}>
          {rates.map(r => {
            const h = r.last ? Math.max(Math.round((r.last/8)*100),10) : 10
            const color = (r.chgPct||0) > 0 ? '#E24B4A' : '#1D9E75'
            return (
              <div key={r.name} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <span style={{fontSize:10,color:'var(--muted)'}}>{r.last?fmt(r.last,2)+'%':'—'}</span>
                <div style={{width:'100%',height:`${h}%`,background:color,borderRadius:'3px 3px 0 0',opacity:0.75}}/>
              </div>
            )
          })}
        </div>
        <div style={{display:'flex',gap:10,marginBottom:10}}>
          {rates.map(r => <div key={r.name} style={{flex:1,textAlign:'center',fontSize:10,color:'var(--muted)'}}>{r.name.replace('US ','')}</div>)}
        </div>
        <THead cols="80px 70px 65px 60px 1fr 65px 65px">
          <span>Tenor</span><span>Yield</span><span>Chg%</span><span>Z-score</span><span>52W %ile</span><span>52W Hi</span><span>52W Lo</span>
        </THead>
        {rates.map((d,i) => (
          <TRow key={d.name} cols="80px 70px 65px 60px 1fr 65px 65px" last={i===rates.length-1}>
            <span style={{fontWeight:500}}>{d.name}</span>
            <span style={{fontFamily:'monospace'}}>{d.last?fmt(d.last,2)+'%':'—'}</span>
            <span className={chgClass(d.chgPct)}>{chgSign(d.chgPct)}</span>
            <ZBadge z={d.zscore}/>
            <PctileBar pct={d.pctile}/>
            <span style={{fontSize:11,color:'var(--muted)'}}>{d.w52high?fmt(d.w52high,2)+'%':'—'}</span>
            <span style={{fontSize:11,color:'var(--muted)'}}>{d.w52low?fmt(d.w52low,2)+'%':'—'}</span>
          </TRow>
        ))}
        {spread2s10s != null && (
          <div style={{marginTop:10,padding:'8px 10px',background:'#F4F6F9',borderRadius:6,fontSize:12,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <span><span style={{color:'var(--muted)'}}>2s10s spread: </span>
              <span style={{fontWeight:600,color:spread2s10s>=0?'var(--up)':'var(--dn)'}}>
                {spread2s10s>=0?'+':''}{fmt(spread2s10s,2)}%
              </span>
              <span style={{color:'var(--muted)',marginLeft:8}}>{spread2s10s>=0?'Normal (upward sloping)':'Inverted (recession signal)'}</span>
            </span>
            {/* Curve shape badge derived from rate moves */}
            {(() => {
              const r10 = rates.find(d => d.name === 'US 10Y')
              const r2 = rates.find(d => d.name === 'US 2Y')
              if (!r10?.chgPct || !r2?.chgPct) return null
              const steepening = (r10.chgPct - r2.chgPct) > 0
              const risingRates = r10.chgPct > 0
              let label
              if (steepening && risingRates) label = 'Bear steepener'
              else if (steepening && !risingRates) label = 'Bull steepener'
              else if (!steepening && risingRates) label = 'Bear flattener'
              else label = 'Bull flattener'
              return <Badge variant="amber">{label}</Badge>
            })()}
          </div>
        )}
      </Card>

      {/* ── VOL SURFACE + BRENT CURVE ── */}
      {(volSurface.length > 0 || brentCurve.length > 0) && (
        <>
          <SecLabel>Realised vol surface & Brent curve</SecLabel>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {volSurface.length > 0 && (
              <Card>
                <CardTitle icon="activity">Realised vol surface</CardTitle>
                <THead cols="85px 52px 52px 52px 80px">
                  <span>Pair</span><span>10d</span><span>30d</span><span>90d</span><span>Structure</span>
                </THead>
                {volSurface.map((r,i,a) => (
                  <TRow key={r.pair} cols="85px 52px 52px 52px 80px" last={i===a.length-1}>
                    <span style={{fontWeight:500}}>{r.pair}</span>
                    <span style={{color:'var(--muted)'}}>{fmt(r.v10)}%</span>
                    <span>{fmt(r.v30)}%</span>
                    <span style={{color:'var(--orange)',fontWeight:600}}>{fmt(r.v90)}%</span>
                    <VolStructureSignal v10={r.v10} v90={r.v90}/>
                  </TRow>
                ))}
                <div style={{marginTop:8,fontSize:11,color:'var(--muted)',paddingTop:8,borderTop:'0.5px solid var(--border)'}}>
                  Realised vol from daily returns · In production: Bloomberg OVDV
                </div>
              </Card>
            )}
            {brentCurve.length > 0 && (() => {
              const prices = brentCurve.map(d => d.price).filter(Boolean)
              const minP = Math.min(...prices) - 1
              const maxP = Math.max(...prices) + 0.5
              const isBackward = prices[0] > prices[prices.length-1]
              return (
                <Card>
                  <CardTitle icon="chart-dots">Brent futures curve</CardTitle>
                  <div style={{display:'flex',alignItems:'flex-end',gap:6,height:80,marginBottom:6}}>
                    {brentCurve.map((d,i) => {
                      const h = d.price ? Math.round(((d.price-minP)/(maxP-minP))*100) : 0
                      const alpha = (1-i*0.13).toFixed(2)
                      return <div key={d.month} style={{flex:1,height:h?`${h}%`:'4px',background:`rgba(240,90,40,${h?alpha:'0.2'})`,borderRadius:'3px 3px 0 0'}}/>
                    })}
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    {brentCurve.map(d => (
                      <div key={d.month} style={{flex:1,textAlign:'center'}}>
                        <div style={{fontSize:10,color:'var(--muted)'}}>{d.month}</div>
                        <div style={{fontSize:10,fontWeight:600}}>{d.price?fmt(d.price,1):'—'}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:10}}>
                    <Badge variant={isBackward?'blue':'amber'}>{isBackward?'Backwardation':'Contango'}</Badge>
                  </div>
                </Card>
              )
            })()}
          </div>
        </>
      )}

      {/* ── CORRELATION MATRIX — stronger heat colours ── */}
      {correlations.labels.length > 0 && (
        <>
          <SecLabel>60-day correlation matrix</SecLabel>
          <Card>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'separate',borderSpacing:3,fontSize:11}}>
                <thead>
                  <tr>
                    <td style={{padding:'4px 6px',width:80}}/>
                    {correlations.labels.map(l => (
                      <td key={l} style={{padding:'4px 3px',textAlign:'center',color:'var(--muted)',fontWeight:600,fontSize:10}}>{l}</td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {correlations.matrix.map((row,i) => (
                    <tr key={i}>
                      <td style={{padding:'4px 6px',fontWeight:600,fontSize:10,color:'var(--text)',whiteSpace:'nowrap'}}>{correlations.labels[i]}</td>
                      {row.map((v,j) => {
                        const abs = Math.abs(v)
                        let bg, color
                        if (v === 1) { bg='#F1EFE8'; color='#888780' }
                        else if (abs > 0.7) { bg=v>0?'rgba(240,90,40,0.35)':'rgba(29,158,117,0.35)'; color=v>0?'#7A2910':'#054535' }
                        else if (abs > 0.4) { bg=v>0?'rgba(240,90,40,0.16)':'rgba(29,158,117,0.16)'; color=v>0?'#993C1D':'#0F6E56' }
                        else { bg='#fff'; color='#6B7A8D' }
                        return (
                          <td key={j} style={{background:bg,color,padding:'5px 4px',textAlign:'center',borderRadius:4,fontWeight:abs>0.6?600:400,fontSize:11}}>
                            {fmt(v,2)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{marginTop:8,display:'flex',gap:14,fontSize:11,color:'var(--muted)',flexWrap:'wrap'}}>
              <span><span style={{display:'inline-block',width:9,height:9,background:'rgba(240,90,40,0.35)',borderRadius:2,marginRight:4,verticalAlign:'middle'}}/>Positive correlation</span>
              <span><span style={{display:'inline-block',width:9,height:9,background:'rgba(29,158,117,0.35)',borderRadius:2,marginRight:4,verticalAlign:'middle'}}/>Negative correlation</span>
              <span style={{marginLeft:'auto'}}>60-day rolling · Yahoo Finance</span>
            </div>
          </Card>
        </>
      )}

      {/* ── COMMODITIES ── */}
      <SecLabel>Commodities</SecLabel>
      <Card>
        <THead cols="100px 80px 65px 60px 1fr 75px 75px 70px">
          <span>Asset</span><span>Price</span><span>Chg%</span><span>Z-score</span>
          <span>52W %ile</span><span>52W High</span><span>52W Low</span><span>vs 200DMA</span>
        </THead>
        {commodities.map((d,i) => (
          <TRow key={d.name} cols="100px 80px 65px 60px 1fr 75px 75px 70px" last={i===commodities.length-1}>
            <span style={{fontWeight:500}}>{d.name}</span>
            <span style={{fontFamily:'monospace'}}>{d.last?px(d.last,2):'—'}</span>
            <span className={chgClass(d.chgPct)}>{chgSign(d.chgPct)}</span>
            <ZBadge z={d.zscore}/>
            <PctileBar pct={d.pctile}/>
            <span style={{fontSize:11,color:'var(--muted)'}}>{d.w52high?px(d.w52high,2):'—'}</span>
            <span style={{fontSize:11,color:'var(--muted)'}}>{d.w52low?px(d.w52low,2):'—'}</span>
            <span className={d.ma200pct>=0?'up':'dn'} style={{fontSize:11}}>{chgSign(d.ma200pct)}</span>
          </TRow>
        ))}
      </Card>

      {/* ── CRYPTO ── */}
      <SecLabel>Crypto</SecLabel>
      <Card>
        <THead cols="100px 110px 65px 60px 1fr 70px">
          <span>Asset</span><span>Price</span><span>Chg%</span><span>Z-score</span><span>52W %ile</span><span>vs 200DMA</span>
        </THead>
        {crypto.map((d,i) => (
          <TRow key={d.name} cols="100px 110px 65px 60px 1fr 70px" last={i===crypto.length-1}>
            <span style={{fontWeight:500}}>{d.name}</span>
            <span style={{fontFamily:'monospace'}}>${d.last?d.last.toLocaleString():'—'}</span>
            <span className={chgClass(d.chgPct)}>{chgSign(d.chgPct)}</span>
            <ZBadge z={d.zscore}/>
            <PctileBar pct={d.pctile}/>
            <span className={d.ma200pct>=0?'up':'dn'} style={{fontSize:11}}>{chgSign(d.ma200pct)}</span>
          </TRow>
        ))}
      </Card>

    </div>
  )
}
