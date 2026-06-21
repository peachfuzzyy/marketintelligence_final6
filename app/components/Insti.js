'use client'
import { SecLabel,Card,CardTitle,KpiCard,Grid,THead,TRow,ZBadge,PctileBar,fmt,chgClass,chgSign,px } from './ui'

export default function Insti({data}){
  if(!data) return null
  const {fx=[],indices=[],mag7=[],commodities=[],crypto=[],rates=[],spread2s10s,sentiment={},sectors=[],breadth={}}=data

  return(
    <div>
      {/* SENTIMENT */}
      <SecLabel style={{marginTop:0}}>Sentiment</SecLabel>
      <Grid cols={4}>
        <KpiCard label="VIX" value={sentiment.vix?fmt(sentiment.vix,1):'—'}
          sub={`${chgSign(sentiment.vixChg)} today · ${sentiment.fearLevel||'—'}`}
          subClass={sentiment.vix>20?'dn':sentiment.vix<15?'up':''}/>
        <KpiCard label="VIX Z-score" value={sentiment.vixZ?`${sentiment.vixZ>=0?'+':''}${fmt(sentiment.vixZ,1)}σ`:'—'}
          sub={Math.abs(sentiment.vixZ||0)>2?'Statistically extreme':'Within normal range'}
          subClass={Math.abs(sentiment.vixZ||0)>2?'dn':''}/>
        <KpiCard label="Fear level" value={sentiment.fearLevel||'—'} sub="Based on VIX level"/>
        <KpiCard label="VIX 52W %ile" value={sentiment.vixPct!==null?`${sentiment.vixPct}%`:'—'} sub="vs 1-year range"/>
      </Grid>

      {/* INDICES */}
      <SecLabel>Global indices</SecLabel>
      <Card>
        <THead cols="120px 90px 65px 60px 1fr 75px 70px">
          <span>Index</span><span>Price</span><span>Chg%</span><span>Z-score</span><span>52W %ile</span><span>52W High</span><span>vs 200DMA</span>
        </THead>
        {indices.map((d,i)=>(
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

      {/* SECTOR HEATMAP */}
      <SecLabel>S&P 500 sector heatmap</SecLabel>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:4}}>
        {sectors.map(s=>{
          const c=s.chgPct||0
          const bg=c>1?'rgba(29,158,117,0.15)':c>0?'rgba(29,158,117,0.07)':c>-1?'rgba(226,75,74,0.07)':'rgba(226,75,74,0.15)'
          const border=c>0?'rgba(29,158,117,0.3)':'rgba(226,75,74,0.3)'
          return(
            <div key={s.ticker} style={{background:bg,border:`0.5px solid ${border}`,borderRadius:8,padding:'10px 12px'}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:3}}>{s.name}</div>
              <div style={{fontSize:16,fontWeight:600}} className={chgClass(s.chgPct)}>{chgSign(s.chgPct)}</div>
              <div style={{fontSize:10,color:'var(--muted)',marginTop:3}}>
                Z: {s.zscore?`${s.zscore>=0?'+':''}${fmt(s.zscore,1)}σ`:'—'} · 1W: {chgSign(s.ret1w)}
              </div>
            </div>
          )
        })}
      </div>

      {/* MAG7 */}
      <SecLabel>MAG7</SecLabel>
      <Card>
        <THead cols="75px 80px 65px 60px 1fr 70px 70px 70px">
          <span>Stock</span><span>Price</span><span>Chg%</span><span>Z-score</span>
          <span>52W %ile</span><span>vs 200DMA</span><span>Vol ratio</span><span>vs 52W Hi</span>
        </THead>
        {mag7.map((d,i)=>(
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

      {/* BREADTH */}
      <SecLabel>Market breadth proxies</SecLabel>
      <Grid cols={3}>
        {[{label:'SPY (S&P 500)',d:breadth.spy},{label:'QQQ (Nasdaq)',d:breadth.qqq},{label:'IWM (Russell 2000)',d:breadth.iwm}].map(({label,d})=>(
          <KpiCard key={label} label={label}
            value={chgSign(d?.chgPct)}
            sub={`vs 200DMA: ${chgSign(d?.ma200pct)} · 52W: ${d?.pctile!=null?d.pctile+'%':'—'}`}
            subClass={chgClass(d?.chgPct)}/>
        ))}
      </Grid>

      {/* FX */}
      <SecLabel>FX</SecLabel>
      <Card>
        <THead cols="100px 80px 65px 60px 1fr 75px 75px 70px">
          <span>Pair</span><span>Price</span><span>Chg%</span><span>Z-score</span>
          <span>52W %ile</span><span>52W High</span><span>52W Low</span><span>vs 200DMA</span>
        </THead>
        {fx.map((d,i)=>(
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

      {/* RATES CURVE */}
      <SecLabel>US Treasury curve</SecLabel>
      <Card>
        <div style={{display:'flex',alignItems:'flex-end',gap:10,height:90,marginBottom:8}}>
          {rates.map((r)=>{
            const h=r.last?Math.max(Math.round((r.last/8)*100),10):10
            const color=(r.chgPct||0)>0?'#E24B4A':'#1D9E75'
            return(
              <div key={r.name} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <span style={{fontSize:10,color:'var(--muted)'}}>{r.last?fmt(r.last,2)+'%':'—'}</span>
                <div style={{width:'100%',height:`${h}%`,background:color,borderRadius:'3px 3px 0 0',opacity:0.75}}/>
              </div>
            )
          })}
        </div>
        <div style={{display:'flex',gap:10,marginBottom:10}}>
          {rates.map(r=><div key={r.name} style={{flex:1,textAlign:'center',fontSize:10,color:'var(--muted)'}}>{r.name.replace('US ','')}</div>)}
        </div>
        <THead cols="80px 70px 65px 60px 1fr 65px 65px">
          <span>Tenor</span><span>Yield</span><span>Chg%</span><span>Z-score</span><span>52W %ile</span><span>52W Hi</span><span>52W Lo</span>
        </THead>
        {rates.map((d,i)=>(
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
        {spread2s10s!==null&&(
          <div style={{marginTop:10,padding:'8px 10px',background:'#F4F6F9',borderRadius:6,fontSize:12}}>
            <span style={{color:'var(--muted)'}}>2s10s spread: </span>
            <span style={{fontWeight:600,color:spread2s10s>=0?'var(--up)':'var(--dn)'}}>{spread2s10s>=0?'+':''}{fmt(spread2s10s,2)}%</span>
            <span style={{color:'var(--muted)',marginLeft:8}}>{spread2s10s>=0?'Normal (upward sloping)':'Inverted (recession signal)'}</span>
          </div>
        )}
      </Card>

      {/* COMMODITIES */}
      <SecLabel>Commodities</SecLabel>
      <Card>
        <THead cols="100px 80px 65px 60px 1fr 75px 75px 70px">
          <span>Asset</span><span>Price</span><span>Chg%</span><span>Z-score</span>
          <span>52W %ile</span><span>52W High</span><span>52W Low</span><span>vs 200DMA</span>
        </THead>
        {commodities.map((d,i)=>(
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

      {/* CRYPTO */}
      <SecLabel>Crypto</SecLabel>
      <Card>
        <THead cols="100px 110px 65px 60px 1fr 70px">
          <span>Asset</span><span>Price</span><span>Chg%</span><span>Z-score</span><span>52W %ile</span><span>vs 200DMA</span>
        </THead>
        {crypto.map((d,i)=>(
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
