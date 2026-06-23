'use client'
import { useState } from 'react'
import { SecLabel,Card,CardTitle,Badge,THead,TRow,KpiCard,Grid,SignalBadge,fmt,chgClass,chgSign,px } from './ui'

const SECTOR_COLORS = {
  'Banking':'#185FA5','REITs':'#0F6E56','Telco':'#854F0B',
  'Property':'#993C1D','Industrial':'#3C3489','Consumer':'#639922','Healthcare':'#E24B4A',
}

function SectorDot({sector}){
  return <span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:SECTOR_COLORS[sector]||'#888',marginRight:5,verticalAlign:'middle'}}/>
}

const TABS=[
  {id:'setups',label:'Key setups'},
  {id:'200dma',label:'200DMA ranker'},
  {id:'volume',label:'High volume'},
  {id:'52w',label:'52W highs'},
  {id:'all',label:'All stocks'},
]

// ── Templated narrative ──────────────────────────────────────────────────────
function buildNarrative(marketData, sgxData) {
  if (!marketData) return null

  const { sentiment={}, indices=[], sectors=[], fx=[] } = marketData
  const spx = indices.find(d => d.name === 'S&P 500')
  const sti = indices.find(d => d.name === 'STI')
  const topSector = sectors[0]
  const btmSector = sectors[sectors.length - 1]
  const dxy = fx.find(d => d.name === 'DXY')
  const gold = marketData.commodities?.find(d => d.name === 'Gold')

  const parts = []

  // Sentence 1 — equity tone
  if (spx?.chgPct != null) {
    const dir = spx.chgPct >= 0 ? 'advanced' : 'pulled back'
    const tone = spx.chgPct >= 0.5 ? 'Risk appetite is firm' : spx.chgPct <= -0.5 ? 'Risk-off tone prevails' : 'Markets are broadly flat'
    parts.push(`${tone} — S&P 500 ${dir} ${Math.abs(spx.chgPct).toFixed(2)}% overnight${topSector?.name ? `, with ${topSector.name} leading${btmSector?.name ? ` and ${btmSector.name} lagging` : ''}` : ''}.`)
  }

  // Sentence 2 — VIX + SGX local colour
  if (sentiment.vix != null) {
    const vixTone = sentiment.vix < 15 ? 'Volatility is compressed' : sentiment.vix > 25 ? 'Volatility is elevated' : 'Volatility is contained'
    const stiStr = sti?.chgPct != null ? ` STI ${sti.chgPct >= 0 ? 'is holding up' : 'faces some pressure'} at ${sti.last?.toLocaleString() || '—'}.` : ''
    parts.push(`${vixTone} with VIX at ${fmt(sentiment.vix, 1)} (${sentiment.fearLevel || '—'}).${stiStr}`)
  }

  // Sentence 3 — FX / Gold if notable
  const notable = []
  if (dxy?.chgPct != null && Math.abs(dxy.chgPct) > 0.2) notable.push(`DXY ${dxy.chgPct > 0 ? 'strengthening' : 'weakening'} ${Math.abs(dxy.chgPct).toFixed(2)}%`)
  if (gold?.chgPct != null && Math.abs(gold.chgPct) > 0.3) notable.push(`Gold ${gold.chgPct > 0 ? 'up' : 'down'} ${Math.abs(gold.chgPct).toFixed(2)}%`)
  if (notable.length) parts.push(`Watch: ${notable.join('; ')}.`)

  return parts.join(' ')
}

// ── Momentum badge replacing Z-score ────────────────────────────────────────
function MomentumBadge({ ma200pct, chgPct }) {
  if (ma200pct == null) return <span style={{color:'var(--muted)',fontSize:11}}>—</span>
  let label, variant
  if (ma200pct > 5 && chgPct >= 0) { label = 'Bullish'; variant = 'green' }
  else if (ma200pct < -5 && chgPct <= 0) { label = 'Bearish'; variant = 'red' }
  else if (ma200pct >= 0) { label = 'Neutral+'; variant = 'blue' }
  else { label = 'Neutral−'; variant = 'amber' }
  return <Badge variant={variant}>{label}</Badge>
}

// ── Dynamic talking points ───────────────────────────────────────────────────
function buildTalkingPoints(marketData) {
  if (!marketData) return []
  const { sentiment={}, fx=[], sectors=[], commodities=[], spread2s10s, brentCurve=[] } = marketData

  const points = []

  // 1. Highest vol FX pair
  const topVolFx = [...fx].filter(d => d.vol30 != null).sort((a,b) => (b.vol30||0)-(a.vol30||0))[0]
  if (topVolFx) {
    points.push({
      text: `${topVolFx.name} is the most volatile major pair today (30d realised vol: ${fmt(topVolFx.vol30)}%) — clients holding ${topVolFx.name} CFDs should review margin buffers and stop placement.`,
      tag: 'FX'
    })
  }

  // 2. VIX-driven risk sizing point
  if (sentiment.vix != null) {
    const vixMsg = sentiment.vix > 20
      ? `VIX at ${fmt(sentiment.vix,1)} signals elevated fear — this is a good moment to discuss position sizing with clients holding leveraged equity CFDs.`
      : `VIX at ${fmt(sentiment.vix,1)} is relatively calm — clients may have appetite to look at new setups, but remind them that low-vol environments can shift quickly.`
    points.push({ text: vixMsg, tag: 'Risk' })
  }

  // 3. Gold / commodity if notable move
  const gold = commodities.find(d => d.name === 'Gold')
  if (gold?.chgPct != null && Math.abs(gold.chgPct) > 0.2) {
    points.push({
      text: `Gold is ${gold.chgPct > 0 ? 'bid' : 'offered'} ${Math.abs(gold.chgPct).toFixed(2)}% today — clients long XAU/USD should ${gold.chgPct > 0 ? 'consider trailing their stops' : 'review downside levels against key support'}.`,
      tag: 'Commodity'
    })
  }

  // 4. Brent curve shape
  if (brentCurve.length >= 2) {
    const isBackward = brentCurve[0]?.price > brentCurve[brentCurve.length-1]?.price
    points.push({
      text: `Brent futures curve is in ${isBackward ? 'backwardation' : 'contango'} — ${isBackward ? 'near-term supply tightness is being priced in; relevant for clients trading energy CFDs.' : 'market is pricing oversupply expectations; energy longs should be aware of the roll cost.'}`,
      tag: 'Commodity'
    })
  }

  // 5. AI margin reminder
  points.push({
    text: 'Remind AI-eligible clients of the 2% margin benefit vs 5% retail — same capital, 2.5× the position size. Worth raising on any new position discussion.',
    tag: 'Margin'
  })

  // 6. Top sector callout
  const top = sectors[0]
  const btm = sectors[sectors.length-1]
  if (top && btm) {
    points.push({
      text: `Sector rotation: ${top.name} is leading (${chgSign(top.chgPct)}) while ${btm.name} lags (${chgSign(btm.chgPct)}) — useful context for clients with equity index or sector ETF CFD exposure.`,
      tag: 'Macro'
    })
  }

  // 7. Yield curve if inverted
  if (spread2s10s != null) {
    const inverted = spread2s10s < 0
    if (inverted) {
      points.push({
        text: `The US yield curve remains inverted (2s10s: ${spread2s10s >= 0 ? '+' : ''}${fmt(spread2s10s,2)}%) — a macro talking point for longer-term oriented clients watching recession signals.`,
        tag: 'Rates'
      })
    }
  }

  return points.slice(0, 5) // cap at 5
}

export default function Retail({ data, marketData }) {
  const [activeTab, setActiveTab] = useState('setups')
  const [showModal, setShowModal] = useState(false)
  if (!data) return null

  const { sectors={}, ranked200dma=[], setupsNear200=[], highVolume=[], near52wHigh=[] } = data
  const fx = marketData?.fx || []
  const indices = marketData?.indices || []
  const mktSectors = marketData?.sectors || []

  const narrative = buildNarrative(marketData, data)
  const talkingPoints = buildTalkingPoints(marketData)

  return (
    <div>

      {/* ── NARRATIVE BLURB ── */}
      {narrative && (
        <div style={{
          background:'linear-gradient(135deg,#0D1B2A 0%,#1A2E45 100%)',
          borderRadius:10, padding:'18px 22px', marginBottom:4,
          border:'0.5px solid #243B55'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <i className="ti ti-news" style={{color:'var(--orange)',fontSize:15}}/>
            <span style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.45)',letterSpacing:'0.09em',textTransform:'uppercase'}}>
              Market colour
            </span>
          </div>
          <p style={{fontSize:14,lineHeight:1.7,color:'rgba(255,255,255,0.88)',margin:0}}>
            {narrative}
          </p>
        </div>
      )}

      {/* ── FX SNAPSHOT KPIs ── */}
      {fx.length > 0 && (
        <>
          <SecLabel style={{marginTop:16}}>Market snapshot — FX</SecLabel>
          <Grid cols={4}>
            {fx.slice(0,4).map(d => (
              <KpiCard key={d.name} label={d.name}
                value={px(d.last, d.last > 10 ? 2 : 4)}
                sub={chgSign(d.chgPct) + ' today'}
                subClass={chgClass(d.chgPct)} />
            ))}
          </Grid>
        </>
      )}

      {/* ── FX VOL TABLE (with Margin — retail-relevant) ── */}
      {fx.length > 0 && (() => {
        const maxVol = Math.max(...fx.map(d => d.vol30 || 0), 1)
        return (
          <>
            <SecLabel style={{marginTop:14}}>FX volatility (30d realised)</SecLabel>
            <Card>
              <THead cols="90px 75px 65px 1fr 55px">
                <span>Pair</span><span>Price</span><span>Chg%</span><span>30d vol</span><span>Margin</span>
              </THead>
              {fx.map((d, i) => {
                const pct = maxVol > 0 ? Math.round(((d.vol30 || 0) / maxVol) * 100) : 0
                const barColor = (d.chgPct || 0) >= 0 ? '#1D9E75' : '#E24B4A'
                return (
                  <TRow key={d.name} cols="90px 75px 65px 1fr 55px" last={i === fx.length - 1}>
                    <span style={{fontWeight:500}}>{d.name}</span>
                    <span style={{color:'var(--muted)',fontFamily:'monospace'}}>{px(d.last, d.last > 10 ? 2 : 4)}</span>
                    <span className={chgClass(d.chgPct)}>{chgSign(d.chgPct)}</span>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{flex:1,height:4,background:'#EEF0F3',borderRadius:2}}>
                        <div style={{width:`${pct}%`,height:4,borderRadius:2,background:barColor}}/>
                      </div>
                      <span style={{fontSize:11,color:'var(--muted)',minWidth:34}}>{fmt(d.vol30 || 0)}%</span>
                    </div>
                    <Badge variant="navy">5%</Badge>
                  </TRow>
                )
              })}
            </Card>
          </>
        )
      })()}

      {/* ── GLOBAL INDICES — simplified, no Z-score, momentum badge ── */}
      {indices.length > 0 && (
        <>
          <SecLabel style={{marginTop:14}}>Global indices</SecLabel>
          <Card>
            <THead cols="120px 100px 70px 80px 1fr 75px">
              <span>Index</span><span>Price</span><span>Chg%</span><span>Momentum</span><span>vs 52W High</span><span>vs 200DMA</span>
            </THead>
            {indices.map((d, i) => {
              const from52 = d.w52high && d.last ? (((d.last - d.w52high) / d.w52high) * 100).toFixed(1) : null
              return (
                <TRow key={d.name} cols="120px 100px 70px 80px 1fr 75px" last={i === indices.length - 1}>
                  <span style={{fontWeight:500}}>{d.name}</span>
                  <span style={{fontFamily:'monospace'}}>{d.last ? d.last.toLocaleString() : '—'}</span>
                  <span className={chgClass(d.chgPct)}>{chgSign(d.chgPct)}</span>
                  <MomentumBadge ma200pct={d.ma200pct} chgPct={d.chgPct} />
                  <span style={{fontSize:12,color:from52 != null && parseFloat(from52) >= -3 ? 'var(--up)' : 'var(--muted)'}}>
                    {from52 != null ? `${parseFloat(from52) >= 0 ? '+' : ''}${from52}%` : '—'}
                  </span>
                  <span className={d.ma200pct >= 0 ? 'up' : 'dn'} style={{fontSize:11}}>{chgSign(d.ma200pct)}</span>
                </TRow>
              )
            })}
          </Card>
        </>
      )}

      {/* ── SECTOR HEATMAP — clean, no Z labels ── */}
      {mktSectors.length > 0 && (
        <>
          <SecLabel style={{marginTop:14}}>S&P 500 sector heatmap</SecLabel>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
            {mktSectors.map(s => {
              const c = s.chgPct || 0
              const bg = c > 1 ? 'rgba(29,158,117,0.15)' : c > 0 ? 'rgba(29,158,117,0.07)' : c > -1 ? 'rgba(226,75,74,0.07)' : 'rgba(226,75,74,0.15)'
              const border = c > 0 ? 'rgba(29,158,117,0.3)' : 'rgba(226,75,74,0.3)'
              return (
                <div key={s.ticker} style={{background:bg,border:`0.5px solid ${border}`,borderRadius:8,padding:'10px 12px'}}>
                  <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>{s.name}</div>
                  <div style={{fontSize:17,fontWeight:600}} className={chgClass(s.chgPct)}>{chgSign(s.chgPct)}</div>
                  <div style={{fontSize:10,color:'var(--muted)',marginTop:3}}>1W: {chgSign(s.ret1w)}</div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── SGX SCREENER ── */}
      <div style={{margin:'20px 0 16px',borderTop:'0.5px solid var(--border)'}}/>
      <SecLabel style={{marginTop:0}}>SGX stock screener</SecLabel>
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding:'6px 14px',fontSize:12,fontWeight:500,borderRadius:6,cursor:'pointer',
            border:'0.5px solid',fontFamily:'inherit',
            background:activeTab===t.id?'var(--orange)':'var(--white)',
            color:activeTab===t.id?'#fff':'var(--muted)',
            borderColor:activeTab===t.id?'var(--orange)':'var(--border)',
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'setups' && (
        <Card>
          <THead cols="110px 70px 65px 65px 70px 70px 80px 1fr">
            <span>Stock</span><span>Sector</span><span>Price</span><span>Chg%</span>
            <span>vs 200DMA</span><span>vs 6M High</span><span>Vol ratio</span><span>Signal</span>
          </THead>
          {setupsNear200.length === 0 && <div style={{padding:'12px 0',fontSize:13,color:'var(--muted)'}}>No setups found</div>}
          {setupsNear200.map((s, i) => (
            <TRow key={s.ticker} cols="110px 70px 65px 65px 70px 70px 80px 1fr" last={i === setupsNear200.length - 1}>
              <div><div style={{fontWeight:600,fontSize:12}}>{s.name}</div><div style={{fontSize:10,color:'var(--muted)'}}>{s.ticker}</div></div>
              <div style={{fontSize:11}}><SectorDot sector={s.sector}/>{s.sector}</div>
              <span>{px(s.last)}</span>
              <span className={chgClass(s.chgPct)}>{chgSign(s.chgPct)}</span>
              <span className={s.ma200pct >= 0 ? 'up' : 'dn'}>{chgSign(s.ma200pct)}</span>
              <span className={s.pctFrom6mHigh >= 0 ? 'up' : 'dn'}>{chgSign(s.pctFrom6mHigh)}</span>
              <span style={{color:s.volRatio>2?'var(--orange)':s.volRatio>1.5?'var(--warn)':'var(--muted)'}}>{s.volRatio ? `${fmt(s.volRatio)}×` : '—'}</span>
              <SignalBadge signal={s.signal} color={s.signalColor}/>
            </TRow>
          ))}
        </Card>
      )}

      {activeTab === '200dma' && (
        <div>
          {Object.entries(
            ranked200dma.reduce((acc,s) => { if(!acc[s.sector]) acc[s.sector]=[]; acc[s.sector].push(s); return acc }, {})
          ).map(([sector, stocks]) => (
            <Card key={sector} style={{marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <SectorDot sector={sector}/>
                <span style={{fontSize:13,fontWeight:600}}>{sector}</span>
              </div>
              <THead cols="110px 65px 65px 70px 70px 65px 65px 1fr">
                <span>Stock</span><span>Price</span><span>Chg%</span>
                <span>vs 200DMA</span><span>vs 50DMA</span><span>vs 6M Hi</span><span>52W %ile</span><span>Signal</span>
              </THead>
              {stocks.map((s, i) => (
                <TRow key={s.ticker} cols="110px 65px 65px 70px 70px 65px 65px 1fr" last={i === stocks.length - 1}>
                  <div><div style={{fontWeight:600,fontSize:12}}>{s.name}</div><div style={{fontSize:10,color:'var(--muted)'}}>{s.ticker}</div></div>
                  <span>{px(s.last)}</span>
                  <span className={chgClass(s.chgPct)}>{chgSign(s.chgPct)}</span>
                  <span className={s.ma200pct >= 0 ? 'up' : 'dn'} style={{fontWeight:500}}>{chgSign(s.ma200pct)}</span>
                  <span className={s.ma50pct >= 0 ? 'up' : 'dn'}>{chgSign(s.ma50pct)}</span>
                  <span className={s.pctFrom6mHigh >= 0 ? 'up' : 'dn'}>{chgSign(s.pctFrom6mHigh)}</span>
                  <span style={{color:'var(--muted)'}}>{s.pctile != null ? `${s.pctile}%` : '—'}</span>
                  <SignalBadge signal={s.signal} color={s.signalColor}/>
                </TRow>
              ))}
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'volume' && (
        <Card>
          <THead cols="110px 70px 65px 65px 80px 70px 1fr">
            <span>Stock</span><span>Sector</span><span>Price</span><span>Chg%</span>
            <span>Vol ratio</span><span>vs 200DMA</span><span>Signal</span>
          </THead>
          {highVolume.length === 0 && <div style={{padding:'12px 0',fontSize:13,color:'var(--muted)'}}>No high volume stocks today</div>}
          {highVolume.map((s, i) => (
            <TRow key={s.ticker} cols="110px 70px 65px 65px 80px 70px 1fr" last={i === highVolume.length - 1}>
              <div><div style={{fontWeight:600,fontSize:12}}>{s.name}</div><div style={{fontSize:10,color:'var(--muted)'}}>{s.ticker}</div></div>
              <div style={{fontSize:11}}><SectorDot sector={s.sector}/>{s.sector}</div>
              <span>{px(s.last)}</span>
              <span className={chgClass(s.chgPct)}>{chgSign(s.chgPct)}</span>
              <span style={{fontWeight:600,color:'var(--orange)'}}>{fmt(s.volRatio)}×</span>
              <span className={s.ma200pct >= 0 ? 'up' : 'dn'}>{chgSign(s.ma200pct)}</span>
              <SignalBadge signal={s.signal} color={s.signalColor}/>
            </TRow>
          ))}
        </Card>
      )}

      {activeTab === '52w' && (
        <Card>
          <THead cols="110px 70px 65px 65px 75px 75px 70px">
            <span>Stock</span><span>Sector</span><span>Price</span><span>Chg%</span>
            <span>52W high</span><span>vs 52W hi</span><span>vs 200DMA</span>
          </THead>
          {near52wHigh.length === 0 && <div style={{padding:'12px 0',fontSize:13,color:'var(--muted)'}}>No stocks near 52W high</div>}
          {near52wHigh.map((s, i) => (
            <TRow key={s.ticker} cols="110px 70px 65px 65px 75px 75px 70px" last={i === near52wHigh.length - 1}>
              <div><div style={{fontWeight:600,fontSize:12}}>{s.name}</div><div style={{fontSize:10,color:'var(--muted)'}}>{s.ticker}</div></div>
              <div style={{fontSize:11}}><SectorDot sector={s.sector}/>{s.sector}</div>
              <span>{px(s.last)}</span>
              <span className={chgClass(s.chgPct)}>{chgSign(s.chgPct)}</span>
              <span style={{color:'var(--muted)'}}>{px(s.w52high)}</span>
              <span className={s.pctFrom52wHigh >= 0 ? 'up' : 'dn'} style={{fontWeight:500}}>{chgSign(s.pctFrom52wHigh)}</span>
              <span className={s.ma200pct >= 0 ? 'up' : 'dn'}>{chgSign(s.ma200pct)}</span>
            </TRow>
          ))}
        </Card>
      )}

      {activeTab === 'all' && (
        <div>
          {Object.entries(sectors).map(([sector, stocks]) => (
            <Card key={sector} style={{marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <SectorDot sector={sector}/>
                <span style={{fontSize:13,fontWeight:600}}>{sector}</span>
                <span style={{fontSize:11,color:'var(--muted)',marginLeft:'auto'}}>{stocks.length} stocks</span>
              </div>
              <THead cols="110px 65px 65px 70px 70px 65px 65px 1fr">
                <span>Stock</span><span>Price</span><span>Chg%</span>
                <span>vs 200DMA</span><span>Vol ratio</span><span>1W</span><span>1M</span><span>Signal</span>
              </THead>
              {stocks.map((s, i) => (
                <TRow key={s.ticker} cols="110px 65px 65px 70px 70px 65px 65px 1fr" last={i === stocks.length - 1}>
                  <div><div style={{fontWeight:600,fontSize:12}}>{s.name}</div><div style={{fontSize:10,color:'var(--muted)'}}>{s.ticker}</div></div>
                  <span>{px(s.last)}</span>
                  <span className={chgClass(s.chgPct)}>{chgSign(s.chgPct)}</span>
                  <span className={s.ma200pct >= 0 ? 'up' : 'dn'} style={{fontWeight:500}}>{chgSign(s.ma200pct)}</span>
                  <span style={{color:s.volRatio>2?'var(--orange)':s.volRatio>1.5?'var(--warn)':'var(--muted)'}}>{s.volRatio ? `${fmt(s.volRatio)}×` : '—'}</span>
                  <span className={chgClass(s.ret1w)}>{chgSign(s.ret1w)}</span>
                  <span className={chgClass(s.ret1m)}>{chgSign(s.ret1m)}</span>
                  <SignalBadge signal={s.signal} color={s.signalColor}/>
                </TRow>
              ))}
            </Card>
          ))}
        </div>
      )}

      {/* ── DYNAMIC TALKING POINTS ── */}
      <div style={{margin:'20px 0 16px',borderTop:'0.5px solid var(--border)'}}/>
      <Card>
        <CardTitle icon="message-circle">Today's talking points</CardTitle>
        {talkingPoints.map((t, i) => (
          <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'9px 0',borderBottom:i<talkingPoints.length-1?'0.5px solid var(--border)':'none'}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:'var(--orange)',flexShrink:0,marginTop:5}}/>
            <div style={{flex:1,fontSize:13,lineHeight:1.55}}>{t.text}</div>
            <Badge variant="navy">{t.tag}</Badge>
          </div>
        ))}
      </Card>

      {/* ── SPEAK TO AM CTA ── */}
      <div style={{margin:'16px 0 0',padding:'18px 22px',background:'var(--navy)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:14,fontWeight:600,color:'#fff',marginBottom:4}}>Need personalised market guidance?</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>Your dedicated account manager is here to help you navigate the markets.</div>
        </div>
        <button onClick={() => setShowModal(true)} style={{padding:'10px 20px',background:'var(--orange)',color:'#fff',border:'none',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',marginLeft:20}}>
          Speak to your account manager
        </button>
      </div>

      {showModal && (
        <div onClick={() => setShowModal(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div onClick={e => e.stopPropagation()} style={{background:'#fff',borderRadius:12,padding:'32px',maxWidth:420,width:'90%',textAlign:'center'}}>
            <div style={{width:48,height:48,background:'var(--orange-lt)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
              <i className="ti ti-headset" style={{fontSize:24,color:'var(--orange)'}}/>
            </div>
            <div style={{fontSize:17,fontWeight:600,marginBottom:8}}>Speak to your account manager</div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:24,lineHeight:1.6}}>
              Your dedicated CMC Markets account manager is available to discuss your portfolio, market conditions, and trading opportunities.
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={() => setShowModal(false)} style={{padding:'10px 20px',background:'#F4F6F9',border:'0.5px solid var(--border)',borderRadius:7,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Close</button>
              <button onClick={() => setShowModal(false)} style={{padding:'10px 20px',background:'var(--orange)',color:'#fff',border:'none',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Request a call back</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
