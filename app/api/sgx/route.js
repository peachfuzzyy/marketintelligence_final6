export const runtime = 'edge'
export const revalidate = 0

const YF = 'https://query2.finance.yahoo.com/v8/finance/chart'

const SGX_STOCKS = {
  'Banking':    [{ticker:'D05.SI',name:'DBS'},{ticker:'O39.SI',name:'OCBC'},{ticker:'U11.SI',name:'UOB'}],
  'REITs':      [{ticker:'A17U.SI',name:'CapitaLand Integrated'},{ticker:'C38U.SI',name:'CapitaLand Ascendas'},{ticker:'ME8U.SI',name:'Mapletree Ind Trust'},{ticker:'M44U.SI',name:'Mapletree Log Trust'},{ticker:'N2IU.SI',name:'Mapletree PanAsia'}],
  'Telco':      [{ticker:'Z74.SI',name:'Singtel'},{ticker:'CC3.SI',name:'StarHub'}],
  'Property':   [{ticker:'C09.SI',name:'City Developments'},{ticker:'U14.SI',name:'UOL Group'},{ticker:'F34.SI',name:'Frasers Property'}],
  'Industrial': [{ticker:'BN4.SI',name:'Keppel Corp'},{ticker:'S63.SI',name:'ST Engineering'},{ticker:'U96.SI',name:'Sembcorp Industries'}],
  'Consumer':   [{ticker:'G13.SI',name:'Genting Singapore'},{ticker:'C6L.SI',name:'Singapore Airlines'},{ticker:'S68.SI',name:'Singapore Exchange'}],
  'Healthcare': [{ticker:'Q0F.SI',name:'Parkway Life REIT'},{ticker:'BSL.SI',name:'Raffles Medical'}],
}

function safe(v,dp=2){const n=parseFloat(v);return isFinite(n)?parseFloat(n.toFixed(dp)):null}

function zScore(rets,window=252){
  const s=rets.slice(-window)
  if(s.length<20) return null
  const mean=s.reduce((a,b)=>a+b,0)/s.length
  const std=Math.sqrt(s.reduce((a,b)=>a+Math.pow(b-mean,2),0)/s.length)
  if(std===0) return null
  return safe((s[s.length-1]-mean)/std)
}

function percentile(series,current){
  if(!series.length) return null
  return safe((series.filter(v=>v<=current).length/series.length)*100,0)
}

async function fetchSGX(ticker){
  try{
    const url=`${YF}/${encodeURIComponent(ticker)}?interval=1d&range=2y`
    const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'}})
    const j=await r.json()
    const res=j?.chart?.result?.[0]
    if(!res) return null
    const closes=(res.indicators?.quote?.[0]?.close||[]).filter(v=>v!==null&&isFinite(v))
    const vols=(res.indicators?.quote?.[0]?.volume||[]).filter(v=>v>0)
    if(closes.length<10) return null
    const last=closes[closes.length-1]
    const prev=closes[closes.length-2]
    const chgPct=safe(((last-prev)/prev)*100)
    const rets=[]
    for(let i=1;i<closes.length;i++) rets.push(((closes[i]-closes[i-1])/closes[i-1])*100)
    const zscore=zScore(rets,252)
    const ma50=closes.length>=50?safe(closes.slice(-50).reduce((a,b)=>a+b,0)/50):null
    const ma200=closes.length>=200?safe(closes.slice(-200).reduce((a,b)=>a+b,0)/200):null
    const ma200pct=ma200?safe(((last-ma200)/ma200)*100):null
    const ma50pct=ma50?safe(((last-ma50)/ma50)*100):null
    const yr=closes.slice(-252)
    const w52high=safe(Math.max(...yr))
    const w52low=safe(Math.min(...yr))
    const pctFrom52wHigh=w52high?safe(((last-w52high)/w52high)*100):null
    const pctile=percentile(yr,last)
    const m6=closes.slice(-126)
    const high6m=safe(Math.max(...m6))
    const pctFrom6mHigh=high6m?safe(((last-high6m)/high6m)*100):null
    const lastVol=vols[vols.length-1]||null
    const avgVol30=vols.length>=30?vols.slice(-30).reduce((a,b)=>a+b,0)/30:null
    const volRatio=lastVol&&avgVol30?safe(lastVol/avgVol30):null
    const ret1w=closes.length>5?safe(((last-closes[closes.length-6])/closes[closes.length-6])*100):null
    const ret1m=closes.length>22?safe(((last-closes[closes.length-23])/closes[closes.length-23])*100):null
    let signal='Neutral',signalColor='neutral'
    if(ma200pct!==null){
      if(ma200pct>10&&volRatio&&volRatio>1.3){signal='Breakout';signalColor='green'}
      else if(ma200pct>5){signal='Extended';signalColor='amber'}
      else if(ma200pct>=-2&&ma200pct<=5){signal='Near 200DMA';signalColor='blue'}
      else if(ma200pct<-2&&ma200pct>-10){signal='Below 200DMA';signalColor='amber'}
      else if(ma200pct<=-10){signal='Downtrend';signalColor='red'}
    }
    return {last,chgPct,zscore,ma50,ma200,ma50pct,ma200pct,w52high,w52low,pctFrom52wHigh,pctile,high6m,pctFrom6mHigh,volRatio,ret1w,ret1m,signal,signalColor}
  }catch{return null}
}

export async function GET(){
  try{
    const sectors={}
    for(const [sector,stocks] of Object.entries(SGX_STOCKS)){
      const results=await Promise.all(stocks.map(s=>fetchSGX(s.ticker)))
      sectors[sector]=stocks.map((s,i)=>({ticker:s.ticker,name:s.name,...(results[i]||{})})).filter(s=>s.last)
    }
    const all=Object.entries(sectors).flatMap(([sector,stocks])=>stocks.map(s=>({...s,sector})))
    const ranked200dma=[...all].filter(s=>s.ma200pct!==null).sort((a,b)=>(b.ma200pct||0)-(a.ma200pct||0))
    const setupsNear200=all.filter(s=>s.ma200pct!==null&&s.ma200pct>=-3&&s.ma200pct<=8).sort((a,b)=>(b.volRatio||0)-(a.volRatio||0))
    const highVolume=all.filter(s=>s.volRatio&&s.volRatio>1.5).sort((a,b)=>(b.volRatio||0)-(a.volRatio||0)).slice(0,8)
    const near52wHigh=all.filter(s=>s.pctFrom52wHigh!==null&&s.pctFrom52wHigh>-8).sort((a,b)=>(b.pctFrom52wHigh||0)-(a.pctFrom52wHigh||0)).slice(0,8)
    return new Response(JSON.stringify({
      pulledAt:new Date().toUTCString(),
      sectors,ranked200dma,setupsNear200,highVolume,near52wHigh,
    }),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}})
  }catch(err){
    return new Response(JSON.stringify({error:err.message}),{status:500,headers:{'Content-Type':'application/json'}})
  }
}
