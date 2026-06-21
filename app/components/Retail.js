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

const TALKING_POINTS=[
  {text:'Review open FX positions against overnight moves — check if any stops need adjusting before the session opens.',tag:'FX'},
  {text:'VIX movement signals risk sentiment shift — good moment to discuss position sizing with clients holding leveraged equity CFDs.',tag:'Risk'},
  {text:'Gold is a key watch today — clients long XAU should be aware of USD correlation and review profit targets.',tag:'Commodity'},
  {text:'Brent crude curve in backwardation — relevant talking point for any clients trading energy CFDs.',tag:'Commodity'},
  {text:'Remind AI-eligible clients of the 2% margin benefit vs 5% retail — same capital, 2.5× the position size.',tag:'Macro'},
]

function CorrCell({v}){
  const abs=Math.abs(v)
  let bg,color
  if(v===1){bg='#F1EFE8';color='#888780'}
  else if(abs>0.7){bg=v>0?'rgba(240,90,40,0.20)':'rgba(29,158,117,0.20)';color=v>0?'#993C1D':'#085041'}
  else if(abs>0.4){bg=v>0?'rgba(240,90,40,0.08)':'rgba(29,158,117,0.08)';color=v>0?'#BA7517':'#0F6E56'}
  else{bg='#fff';color='#6B7A8D'}
  return <td style={{background:bg,color,padding:'5px 4px',textAlign:'center',borderRadius:4,fontWeight:abs>0.6?600:400,fontSize:11}}>{fmt(v,2)}</td>
}

function BrentCurve({brentCurve}){
  const prices=brentCurve.map(d=>d.price).filter(Boolean)
  if(!prices.length) return null
  const minP=Math.min(...prices)-1
  const maxP=Math.max(...prices)+0.5
  const isBackward=prices[0]>prices[prices.length-1]
  return(
    <Card>
      <CardTitle icon="chart-dots">Brent futures curve</CardTitle>
      <div style={{display:'flex',alignItems:'flex-end',gap:6,height:80,marginBottom:6}}>
        {brentCurve.map((d,i)=>{
          const h=d.price?Math.round(((d.price-minP)/(maxP-minP))*100):0
          const alpha=(1-i*0.13).toFixed(2)
          return <div key={d.month} style={{flex:1,height:h?`${h}%`:'4px',background:`rgba(240,90,40,${h?alpha:'0.2'})`,borderRadius:'3px 3px 0 0'}}/>
        })}
      </div>
      <div style={{display:'flex',gap:6}}>
        {brentCurve.map(d=>(
          <div key={d.month} style={{flex:1,textAlign:'center'}}>
            <div style={{fontSize:10,color:'var(--muted)'}}>{d.month}</div>
            <div style={{fontSize:10,fontWeight:600}}>{d.price?fmt(d.price,1):'—'}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:10}}>
        <Badge variant="blue">Contango</Badge>
      </div>
    </Card>
  )
}

export default function Retail({data,marketData}){
  const [activeTab,setActiveTab]=useState('setups')
  const [showModal,setShowModal]=useState(false)
  if(!data) return null
  const {sectors={},ranked200dma=[],setupsNear200=[],highVolume=[],near52wHigh=[]}=data
  const fx=marketData?.fx||[]
  const macro=marketData?.macro||[]
  const volSurface=marketData?.volSurface||[]
  const brentCurve=marketData?.brentCurve||[]
  const correlations=marketData?.correlations||{labels:[],matrix:[]}
  const indices=marketData?.indices||[]
  const mktSectors=marketData?.sectors||[]
  const maxVol=Math.max(...fx.map(d=>d.vol30||0),1)

  return(
    <div>
      {/* 1. MARKET SNAPSHOT FX */}
      {fx.length>0&&(
        <>
          <SecLabel style={{marginTop:0}}>Market snapshot — FX</SecLabel>
          <Grid cols={4}>
            {fx.slice(0,4).map(d=>(
              <KpiCard key={d.name} label={d.name}
                value={px(d.last,d.last>10?2:4)}
                sub={chgSign(d.chgPct)+' today'}
                subClass={chgClass(d.chgPct)}/>
            ))}
          </Grid>
        </>
      )}

      {/* 2. MARKET SNAPSHOT INDICES */}
      {macro.length>0&&(
        <>
          <SecLabel style={{marginTop:14}}>Market snapshot — indices & commodities</SecLabel>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr) 1fr',gap:10}}>
            {macro.map(d=>(
              <KpiCard key={d.label||d.name} label={d.label||d.name} value={d.value||px(d.last,2)}
                sub={chgSign(d.chgPct)+' today'}
                subClass={chgClass(d.chgPct)}/>
            ))}
          </div>
        </>
      )}

      {/* 3. FX VOL TABLE */}
      {fx.length>0&&(
        <>
          <SecLabel style={{marginTop:14}}>FX volatility (30d realised)</SecLabel>
          <Card>
            <THead cols="90px 75px 65px 1fr 55px">
              <span>Pair</span><span>Price</span><span>Chg%</span><span>30d vol</span><span>Margin</span>
            </THead>
            {fx.map((d,i)=>{
              const pct=maxVol>0?Math.round(((d.vol30||0)/maxVol)*100):0
              const barColor=(d.chgPct||0)>=0?'#1D9E75':'#E24B4A'
              return(
                <TRow key={d.name} cols="90px 75px 65px 1fr 55px" last={i===fx.length-1}>
                  <span style={{fontWeight:500}}>{d.name}</span>
                  <span style={{color:'var(--muted)',fontFamily:'monospace'}}>{px(d.last,d.last>10?2:4)}</span>
                  <span className={chgClass(d.chgPct)}>{chgSign(d.chgPct)}</span>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{flex:1,height:4,background:'#EEF0F3',borderRadius:2}}>
                      <div style={{width:`${pct}%`,height:4,borderRadius:2,background:barColor}}/>
                    </div>
                    <span style={{fontSize:11,color:'var(--muted)',minWidth:34}}>{fmt(d.vol30||0)}%</span>
                  </div>
                  <Badge variant="navy">5%</Badge>
                </TRow>
              )
            })}
          </Card>
        </>
      )}

      {/* 4. GLOBAL INDICES */}
      {indices.length>0&&(
        <>
          <SecLabel style={{marginTop:14}}>Global indices</SecLabel>
          <Card>
            <THead cols="120px 90px 65px 60px 1fr 75px 70px">
              <span>Index</span><span>Price</span><span>Chg%</span><span>Z-score</span><span>52W %ile</span><span>52W High</span><span>vs 200DMA</span>
            </THead>
            {indices.map((d,i)=>(
              <TRow key={d.name} cols="120px 90px 65px 60px 1fr 75px 70px" last={i===indices.length-1}>
                <span style={{fontWeight:500}}>{d.name}</span>
                <span style={{fontFamily:'monospace'}}>{d.last?d.last.toLocaleString():'—'}</span>
                <span className={chgClass(d.chgPct)}>{chgSign(d.chgPct)}</span>
                <span style={{fontSize:11,fontWeight:500,color:Math.abs(d.zscore||0)>2?'#E24B4A':Math.abs(d.zscore||0)>1?'#BA7517':'#6B7A8D'}}>{d.zscore!=null?`${d.zscore>=0?'+':''}${fmt(d.zscore,1)}σ`:'—'}</span>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:50,height:4,background:'#EEF0F3',borderRadius:2}}>
                    <div style={{width:`${d.pctile||0}%`,height:4,borderRadius:2,background:d.pctile>80?'#E24B4A':d.pctile>60?'#BA7517':'#6B7A8D'}}/>
                  </div>
                  <span style={{fontSize:10,color:'var(--muted)',minWidth:26}}>{d.pctile!=null?`${d.pctile}%`:'—'}</span>
                </div>
                <span style={{fontSize:11,color:'var(--muted)'}}>{d.w52high?d.w52high.toLocaleString():'—'}</span>
                <span className={d.ma200pct>=0?'up':'dn'} style={{fontSize:11}}>{chgSign(d.ma200pct)}</span>
              </TRow>
            ))}
          </Card>
        </>
      )}

      {/* 5. SECTOR HEATMAP */}
      {mktSectors.length>0&&(
        <>
          <SecLabel style={{marginTop:14}}>S&P 500 sector heatmap</SecLabel>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
            {mktSectors.map(s=>{
              const c=s.chgPct||0
              const bg=c>1?'rgba(29,158,117,0.15)':c>0?'rgba(29,158,117,0.07)':c>-1?'rgba(226,75,74,0.07)':'rgba(226,75,74,0.15)'
              const border=c>0?'rgba(29,158,117,0.3)':'rgba(226,75,74,0.3)'
              return(
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
        </>
      )}

      {/* 6. VOL SURFACE + BRENT CURVE */}
      {(volSurface.length>0||brentCurve.length>0)&&(
        <>
          <SecLabel style={{marginTop:14}}>Realised vol surface & Brent curve</SecLabel>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {volSurface.length>0&&(
              <Card>
                <CardTitle icon="activity">Realised vol surface</CardTitle>
                <THead cols="85px 52px 52px 52px">
                  <span>Pair</span><span>10d</span><span>30d</span><span>90d</span>
                </THead>
                {volSurface.map((r,i,a)=>(
                  <TRow key={r.pair} cols="85px 52px 52px 52px" last={i===a.length-1}>
                    <span style={{fontWeight:500}}>{r.pair}</span>
                    <span style={{color:'var(--muted)'}}>{fmt(r.v10)}%</span>
                    <span>{fmt(r.v30)}%</span>
                    <span style={{color:'var(--orange)',fontWeight:600}}>{fmt(r.v90)}%</span>
                  </TRow>
                ))}
                <div style={{marginTop:8,fontSize:11,color:'var(--muted)',paddingTop:8,borderTop:'0.5px solid var(--border)'}}>
                  Realised vol from daily returns · In production: Bloomberg OVDV
                </div>
              </Card>
            )}
            <BrentCurve brentCurve={brentCurve}/>
          </div>
        </>
      )}

      {/* 7. CORRELATION MATRIX */}
      {correlations.labels.length>0&&(
        <>
          <SecLabel style={{marginTop:14}}>60-day correlation matrix</SecLabel>
          <Card>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'separate',borderSpacing:3,fontSize:11}}>
                <thead>
                  <tr>
                    <td style={{padding:'4px 6px',width:80}}/>
                    {correlations.labels.map(l=>(
                      <td key={l} style={{padding:'4px 3px',textAlign:'center',color:'var(--muted)',fontWeight:600,fontSize:10}}>{l}</td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {correlations.matrix.map((row,i)=>(
                    <tr key={i}>
                      <td style={{padding:'4px 6px',fontWeight:600,fontSize:10,color:'var(--text)',whiteSpace:'nowrap'}}>{correlations.labels[i]}</td>
                      {row.map((v,j)=><CorrCell key={j} v={v}/>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{marginTop:8,display:'flex',gap:14,fontSize:11,color:'var(--muted)',flexWrap:'wrap'}}>
              <span><span style={{display:'inline-block',width:9,height:9,background:'rgba(240,90,40,0.25)',borderRadius:2,marginRight:4,verticalAlign:'middle'}}/>Positive correlation</span>
              <span><span style={{display:'inline-block',width:9,height:9,background:'rgba(29,158,117,0.25)',borderRadius:2,marginRight:4,verticalAlign:'middle'}}/>Negative correlation</span>
              <span style={{marginLeft:'auto'}}>60-day rolling · Yahoo Finance</span>
            </div>
          </Card>
        </>
      )}

      {/* 8. SGX SCREENER */}
      <div style={{margin:'20px 0 16px',borderTop:'0.5px solid var(--border)'}}/>
      <SecLabel style={{marginTop:0}}>SGX stock screener</SecLabel>
      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
            padding:'6px 14px',fontSize:12,fontWeight:500,borderRadius:6,cursor:'pointer',
            border:'0.5px solid',fontFamily:'inherit',
            background:activeTab===t.id?'var(--orange)':'var(--white)',
            color:activeTab===t.id?'#fff':'var(--muted)',
            borderColor:activeTab===t.id?'var(--orange)':'var(--border)',
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab==='setups'&&(
        <Card>
          <THead cols="110px 70px 65px 65px 70px 70px 80px 1fr">
            <span>Stock</span><span>Sector</span><span>Price</span><span>Chg%</span>
            <span>vs 200DMA</span><span>vs 6M High</span><span>Vol ratio</span><span>Signal</span>
          </THead>
          {setupsNear200.length===0&&<div style={{padding:'12px 0',fontSize:13,color:'var(--muted)'}}>No setups found</div>}
          {setupsNear200.map((s,i)=>(
            <TRow key={s.ticker} cols="110px 70px 65px 65px 70px 70px 80px 1fr" last={i===setupsNear200.length-1}>
              <div><div style={{fontWeight:600,fontSize:12}}>{s.name}</div><div style={{fontSize:10,color:'var(--muted)'}}>{s.ticker}</div></div>
              <div style={{fontSize:11}}><SectorDot sector={s.sector}/>{s.sector}</div>
              <span>{px(s.last)}</span>
              <span className={chgClass(s.chgPct)}>{chgSign(s.chgPct)}</span>
              <span className={s.ma200pct>=0?'up':'dn'}>{chgSign(s.ma200pct)}</span>
              <span className={s.pctFrom6mHigh>=0?'up':'dn'}>{chgSign(s.pctFrom6mHigh)}</span>
              <span style={{color:s.volRatio>2?'var(--orange)':s.volRatio>1.5?'var(--warn)':'var(--muted)'}}>{s.volRatio?`${fmt(s.volRatio)}×`:'—'}</span>
              <SignalBadge signal={s.signal} color={s.signalColor}/>
            </TRow>
          ))}
        </Card>
      )}

      {activeTab==='200dma'&&(
        <div>
          {Object.entries(
            ranked200dma.reduce((acc,s)=>{if(!acc[s.sector])acc[s.sector]=[];acc[s.sector].push(s);return acc},{})
          ).map(([sector,stocks])=>(
            <Card key={sector} style={{marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <SectorDot sector={sector}/>
                <span style={{fontSize:13,fontWeight:600}}>{sector}</span>
              </div>
              <THead cols="110px 65px 65px 70px 70px 65px 65px 1fr">
                <span>Stock</span><span>Price</span><span>Chg%</span>
                <span>vs 200DMA</span><span>vs 50DMA</span><span>vs 6M Hi</span><span>52W %ile</span><span>Signal</span>
              </THead>
              {stocks.map((s,i)=>(
                <TRow key={s.ticker} cols="110px 65px 65px 70px 70px 65px 65px 1fr" last={i===stocks.length-1}>
                  <div><div style={{fontWeight:600,fontSize:12}}>{s.name}</div><div style={{fontSize:10,color:'var(--muted)'}}>{s.ticker}</div></div>
                  <span>{px(s.last)}</span>
                  <span className={chgClass(s.chgPct)}>{chgSign(s.chgPct)}</span>
                  <span className={s.ma200pct>=0?'up':'dn'} style={{fontWeight:500}}>{chgSign(s.ma200pct)}</span>
                  <span className={s.ma50pct>=0?'up':'dn'}>{chgSign(s.ma50pct)}</span>
                  <span className={s.pctFrom6mHigh>=0?'up':'dn'}>{chgSign(s.pctFrom6mHigh)}</span>
                  <span style={{color:'var(--muted)'}}>{s.pctile!=null?`${s.pctile}%`:'—'}</span>
                  <SignalBadge signal={s.signal} color={s.signalColor}/>
                </TRow>
              ))}
            </Card>
          ))}
        </div>
      )}

      {activeTab==='volume'&&(
        <Card>
          <THead cols="110px 70px 65px 65px 80px 70px 1fr">
            <span>Stock</span><span>Sector</span><span>Price</span><span>Chg%</span>
            <span>Vol ratio</span><span>vs 200DMA</span><span>Signal</span>
          </THead>
          {highVolume.length===0&&<div style={{padding:'12px 0',fontSize:13,color:'var(--muted)'}}>No high volume stocks today</div>}
          {highVolume.map((s,i)=>(
            <TRow key={s.ticker} cols="110px 70px 65px 65px 80px 70px 1fr" last={i===highVolume.length-1}>
              <div><div style={{fontWeight:600,fontSize:12}}>{s.name}</div><div style={{fontSize:10,color:'var(--muted)'}}>{s.ticker}</div></div>
              <div style={{fontSize:11}}><SectorDot sector={s.sector}/>{s.sector}</div>
              <span>{px(s.last)}</span>
              <span className={chgClass(s.chgPct)}>{chgSign(s.chgPct)}</span>
              <span style={{fontWeight:600,color:'var(--orange)'}}>{fmt(s.volRatio)}×</span>
              <span className={s.ma200pct>=0?'up':'dn'}>{chgSign(s.ma200pct)}</span>
              <SignalBadge signal={s.signal} color={s.signalColor}/>
            </TRow>
          ))}
        </Card>
      )}

      {activeTab==='52w'&&(
        <Card>
          <THead cols="110px 70px 65px 65px 75px 75px 70px">
            <span>Stock</span><span>Sector</span><span>Price</span><span>Chg%</span>
            <span>52W high</span><span>vs 52W hi</span><span>vs 200DMA</span>
          </THead>
          {near52wHigh.length===0&&<div style={{padding:'12px 0',fontSize:13,color:'var(--muted)'}}>No stocks near 52W high</div>}
          {near52wHigh.map((s,i)=>(
            <TRow key={s.ticker} cols="110px 70px 65px 65px 75px 75px 70px" last={i===near52wHigh.length-1}>
              <div><div style={{fontWeight:600,fontSize:12}}>{s.name}</div><div style={{fontSize:10,color:'var(--muted)'}}>{s.ticker}</div></div>
              <div style={{fontSize:11}}><SectorDot sector={s.sector}/>{s.sector}</div>
              <span>{px(s.last)}</span>
              <span className={chgClass(s.chgPct)}>{chgSign(s.chgPct)}</span>
              <span style={{color:'var(--muted)'}}>{px(s.w52high)}</span>
              <span className={s.pctFrom52wHigh>=0?'up':'dn'} style={{fontWeight:500}}>{chgSign(s.pctFrom52wHigh)}</span>
              <span className={s.ma200pct>=0?'up':'dn'}>{chgSign(s.ma200pct)}</span>
            </TRow>
          ))}
        </Card>
      )}

      {activeTab==='all'&&(
        <div>
          {Object.entries(sectors).map(([sector,stocks])=>(
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
              {stocks.map((s,i)=>(
                <TRow key={s.ticker} cols="110px 65px 65px 70px 70px 65px 65px 1fr" last={i===stocks.length-1}>
                  <div><div style={{fontWeight:600,fontSize:12}}>{s.name}</div><div style={{fontSize:10,color:'var(--muted)'}}>{s.ticker}</div></div>
                  <span>{px(s.last)}</span>
                  <span className={chgClass(s.chgPct)}>{chgSign(s.chgPct)}</span>
                  <span className={s.ma200pct>=0?'up':'dn'} style={{fontWeight:500}}>{chgSign(s.ma200pct)}</span>
                  <span style={{color:s.volRatio>2?'var(--orange)':s.volRatio>1.5?'var(--warn)':'var(--muted)'}}>{s.volRatio?`${fmt(s.volRatio)}×`:'—'}</span>
                  <span className={chgClass(s.ret1w)}>{chgSign(s.ret1w)}</span>
                  <span className={chgClass(s.ret1m)}>{chgSign(s.ret1m)}</span>
                  <SignalBadge signal={s.signal} color={s.signalColor}/>
                </TRow>
              ))}
            </Card>
          ))}
        </div>
      )}

      {/* 9. TALKING POINTS */}
      <div style={{margin:'20px 0 16px',borderTop:'0.5px solid var(--border)'}}/>
      <Card>
        <CardTitle icon="message-circle">Today's talking points</CardTitle>
        {TALKING_POINTS.map((t,i)=>(
          <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'9px 0',borderBottom:i<TALKING_POINTS.length-1?'0.5px solid var(--border)':'none'}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:'var(--orange)',flexShrink:0,marginTop:5}}/>
            <div style={{flex:1,fontSize:13,lineHeight:1.5}}>{t.text}</div>
            <Badge variant="navy">{t.tag}</Badge>
          </div>
        ))}
      </Card>

      {/* 10. SPEAK TO AM CTA */}
      <div style={{margin:'16px 0 0',padding:'18px 22px',background:'var(--navy)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:14,fontWeight:600,color:'#fff',marginBottom:4}}>Need personalised market guidance?</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>Your dedicated account manager is here to help you navigate the markets.</div>
        </div>
        <button onClick={()=>setShowModal(true)} style={{padding:'10px 20px',background:'var(--orange)',color:'#fff',border:'none',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',marginLeft:20}}>
          Speak to your account manager
        </button>
      </div>

      {showModal&&(
        <div onClick={()=>setShowModal(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:12,padding:'32px',maxWidth:420,width:'90%',textAlign:'center'}}>
            <div style={{width:48,height:48,background:'var(--orange-lt)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
              <i className="ti ti-headset" style={{fontSize:24,color:'var(--orange)'}}/>
            </div>
            <div style={{fontSize:17,fontWeight:600,marginBottom:8}}>Speak to your account manager</div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:24,lineHeight:1.6}}>
              Your dedicated CMC Markets account manager is available to discuss your portfolio, market conditions, and trading opportunities.
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={()=>setShowModal(false)} style={{padding:'10px 20px',background:'#F4F6F9',border:'0.5px solid var(--border)',borderRadius:7,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Close</button>
              <button onClick={()=>setShowModal(false)} style={{padding:'10px 20px',background:'var(--orange)',color:'#fff',border:'none',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Request a call back</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
