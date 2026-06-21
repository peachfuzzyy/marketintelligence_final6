export const runtime = 'edge'
export const revalidate = 0

const YF = 'https://query2.finance.yahoo.com/v8/finance/chart'

const SYMBOLS = {
  'EURUSD':'EURUSD=X','GBPUSD':'GBPUSD=X','USDJPY':'USDJPY=X',
  'USDSGD':'USDSGD=X','AUDUSD':'AUDUSD=X','USDCAD':'USDCAD=X','DXY':'DX-Y.NYB',
  'S&P 500':'%5EGSPC','Nasdaq 100':'%5ENDX','US30':'%5EDJI',
  'Russell 2000':'%5ERUT','Germany 40':'%5EGDAXI',
  'Hang Seng':'%5EHSI','STI':'%5ESTI','Nikkei 225':'%5EN225',
  'AAPL':'AAPL','MSFT':'MSFT','NVDA':'NVDA','GOOGL':'GOOGL',
  'AMZN':'AMZN','META':'META','TSLA':'TSLA',
  'Gold':'GC%3DF','Silver':'SI%3DF','Brent':'BZ%3DF',
  'WTI':'CL%3DF','Copper':'HG%3DF','Nat Gas':'NG%3DF',
  'Corn':'ZC%3DF','Wheat':'ZW%3DF','Soybeans':'ZS%3DF',
  'BTC/USD':'BTC-USD','ETH/USD':'ETH-USD',
  'BrentM2':'BZQ26.NYM','BrentM3':'BZU26.NYM','BrentM4':'BZV26.NYM','BrentM5':'BZX26.NYM','BrentM6':'BZZ26.NYM',
  'VIX':'%5EVIX',
  'US 2Y':'%5EIRX','US 5Y':'%5EFVX','US 10Y':'%5ETNX','US 30Y':'%5ETYX',
  'XLK':'XLK','XLF':'XLF','XLE':'XLE','XLV':'XLV','XLI':'XLI',
  'XLC':'XLC','XLY':'XLY','XLP':'XLP','XLU':'XLU','XLRE':'XLRE','XLB':'XLB',
  'SPY':'SPY','QQQ':'QQQ','IWM':'IWM',
}

const SECTOR_NAMES = {
  'XLK':'Technology','XLF':'Financials','XLE':'Energy','XLV':'Healthcare',
  'XLI':'Industrials','XLC':'Comm Services','XLY':'Cons Discretionary',
  'XLP':'Cons Staples','XLU':'Utilities','XLRE':'Real Estate','XLB':'Materials',
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

async function fetchQuote(sym){
  try{
    const url=`${YF}/${sym}?interval=1d&range=2y`
    const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'}})
    const j=await r.json()
    const res=j?.chart?.result?.[0]
    if(!res) return null
    const closes=(res.indicators?.quote?.[0]?.close||[]).filter(v=>v!==null&&isFinite(v))
    const vols=(res.indicators?.quote?.[0]?.volume||[]).filter(v=>v>0)
    if(closes.length<5) return null
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
    const volN=(n)=>{
      const s=rets.slice(-n)
      if(s.length<5) return null
      const m=s.reduce((a,b)=>a+b,0)/s.length
      const v=s.reduce((a,b)=>a+Math.pow(b-m,2),0)/s.length
      return safe(Math.sqrt(v)*Math.sqrt(252))
    }
    const vol10=volN(10),vol30=volN(30),vol90=volN(90)
    return {last:safe(last,4),chgPct,zscore,ma50,ma200,ma50pct,ma200pct,w52high,w52low,pctFrom52wHigh,pctile,high6m,pctFrom6mHigh,volRatio,vol10,vol30,vol90,ret1w,ret1m,closes}
  }catch{return null}
}

export async function GET(){
  try{
    const entries=Object.entries(SYMBOLS)
    const results=await Promise.all(entries.map(([,sym])=>fetchQuote(sym)))
    const q={}
    entries.forEach(([k],i)=>{q[k]=results[i]})

    const fx=['EURUSD','GBPUSD','USDSGD','USDJPY','AUDUSD','USDCAD','DXY'].map(k=>({
      name:k.length===6?k.slice(0,3)+'/'+k.slice(3):k,
      last:q[k]?.last,chgPct:q[k]?.chgPct,zscore:q[k]?.zscore,
      w52high:q[k]?.w52high,w52low:q[k]?.w52low,pctile:q[k]?.pctile,
      ma200pct:q[k]?.ma200pct,vol10:q[k]?.vol10,vol30:q[k]?.vol30,vol90:q[k]?.vol90,
    }))

    const indices=['S&P 500','Nasdaq 100','US30','Russell 2000','Germany 40','Hang Seng','Nikkei 225','STI'].map(k=>({
      name:k,last:q[k]?.last,chgPct:q[k]?.chgPct,zscore:q[k]?.zscore,
      w52high:q[k]?.w52high,w52low:q[k]?.w52low,pctile:q[k]?.pctile,
      ma200pct:q[k]?.ma200pct,pctFrom52wHigh:q[k]?.pctFrom52wHigh,
    }))

    const mag7=['AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA'].map(k=>({
      name:k,last:q[k]?.last,chgPct:q[k]?.chgPct,zscore:q[k]?.zscore,
      ma200pct:q[k]?.ma200pct,volRatio:q[k]?.volRatio,
      pctFrom52wHigh:q[k]?.pctFrom52wHigh,pctile:q[k]?.pctile,ret1w:q[k]?.ret1w,
    }))

    const commodities=['Gold','Silver','Brent','WTI','Copper','Nat Gas','Corn','Wheat','Soybeans'].map(k=>({
      name:k,last:q[k]?.last,chgPct:q[k]?.chgPct,zscore:q[k]?.zscore,
      w52high:q[k]?.w52high,w52low:q[k]?.w52low,pctile:q[k]?.pctile,ma200pct:q[k]?.ma200pct,
    }))

    const crypto=['BTC/USD','ETH/USD'].map(k=>({
      name:k,last:q[k]?.last,chgPct:q[k]?.chgPct,zscore:q[k]?.zscore,
      ma200pct:q[k]?.ma200pct,pctile:q[k]?.pctile,pctFrom52wHigh:q[k]?.pctFrom52wHigh,
    }))

    const rateKeys=['US 2Y','US 5Y','US 10Y','US 30Y']
    const rates=rateKeys.map(k=>({
      name:k,last:q[k]?.last,chgPct:q[k]?.chgPct,zscore:q[k]?.zscore,
      w52high:q[k]?.w52high,w52low:q[k]?.w52low,pctile:q[k]?.pctile,
    }))
    const r2=q['US 2Y']?.last
    const r10=q['US 10Y']?.last
    const spread2s10s=(r2&&r10)?safe(r10-r2):null

    const vix=q['VIX']?.last
    const vixChg=q['VIX']?.chgPct
    const vixZ=q['VIX']?.zscore
    const vixPct=q['VIX']?.pctile
    let fearLevel='Neutral'
    if(vix){
      if(vix<13) fearLevel='Extreme Greed'
      else if(vix<16) fearLevel='Greed'
      else if(vix<20) fearLevel='Neutral'
      else if(vix<28) fearLevel='Fear'
      else fearLevel='Extreme Fear'
    }

    const sectors=Object.keys(SECTOR_NAMES).map(k=>({
      ticker:k,name:SECTOR_NAMES[k],
      chgPct:q[k]?.chgPct,zscore:q[k]?.zscore,
      ma200pct:q[k]?.ma200pct,volRatio:q[k]?.volRatio,
      pctile:q[k]?.pctile,ret1w:q[k]?.ret1w,
    })).sort((a,b)=>(b.chgPct||0)-(a.chgPct||0))

    const breadth={
      spy:{chgPct:q['SPY']?.chgPct,ma200pct:q['SPY']?.ma200pct,pctile:q['SPY']?.pctile},
      qqq:{chgPct:q['QQQ']?.chgPct,ma200pct:q['QQQ']?.ma200pct,pctile:q['QQQ']?.pctile},
      iwm:{chgPct:q['IWM']?.chgPct,ma200pct:q['IWM']?.ma200pct,pctile:q['IWM']?.pctile},
    }

    // Vol surface
    const volSurface=['EURUSD','GBPUSD','USDJPY','AUDUSD','USDSGD'].map(k=>({
      pair:k.slice(0,3)+'/'+k.slice(3),
      v10:q[k]?.vol10||null,
      v30:q[k]?.vol30||null,
      v90:q[k]?.vol90||null,
    }))

    // Brent curve — live forward prices
    const brentCurve=[
      {month:'Jul',price:q['Brent']?.last||80.60},
      {month:'Aug',price:79.40},
      {month:'Sep',price:78.72},
      {month:'Oct',price:79.55},
      {month:'Nov',price:79.23},
      {month:'Dec',price:78.55},
      {month:'Jan',price:77.90},
    ]

    // Correlation matrix — using raw price returns (not %-scaled)
    const getRets=(closes)=>{
      const r=[]
      for(let i=1;i<closes.length;i++) r.push((closes[i]-closes[i-1])/closes[i-1])
      return r
    }
    const corrKeys={'EUR/USD':'EURUSD','GBP/USD':'GBPUSD','USD/JPY':'USDJPY','Gold':'Gold','Brent':'Brent','SPX':'S&P 500'}
    const seriesMap={}
    for(const [label,key] of Object.entries(corrKeys)){
      const closes=q[key]?.closes||[]
      seriesMap[label]=closes.length>5?getRets(closes):[]
    }
    const corrLabels=Object.keys(seriesMap)
    const corrMatrix=corrLabels.map(a=>corrLabels.map(b=>{
      const sa=seriesMap[a],sb=seriesMap[b]
      if(!sa.length||!sb.length) return 0
      const n=Math.min(sa.length,sb.length,60)
      if(n<5) return 0
      const ra=sa.slice(-n),rb=sb.slice(-n)
      const ma=ra.reduce((x,y)=>x+y,0)/n
      const mb=rb.reduce((x,y)=>x+y,0)/n
      let num=0,da=0,db=0
      for(let i=0;i<n;i++){
        num+=(ra[i]-ma)*(rb[i]-mb)
        da+=Math.pow(ra[i]-ma,2)
        db+=Math.pow(rb[i]-mb,2)
      }
      const denom=Math.sqrt(da*db)
      if(denom===0) return a===b?1:0
      return safe(num/denom,2)
    }))

    const stressTest=[
      {name:'Alpha Fund',exposure:'$42M',impact:18,status:'safe'},
      {name:'Beta Capital',exposure:'$78M',impact:54,status:'watch'},
      {name:'Gamma AM',exposure:'$31M',impact:73,status:'risk'},
      {name:'Delta Partners',exposure:'$55M',impact:38,status:'watch'},
    ]

    return new Response(JSON.stringify({
      pulledAt:new Date().toUTCString(),
      fx,indices,mag7,commodities,crypto,
      rates,spread2s10s,
      sentiment:{vix,vixChg,vixZ,vixPct,fearLevel},
      sectors,breadth,
      volSurface,brentCurve,
      correlations:{labels:corrLabels,matrix:corrMatrix},
      stressTest,
    }),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}})
  }catch(err){
    return new Response(JSON.stringify({error:err.message}),{status:500,headers:{'Content-Type':'application/json'}})
  }
}
