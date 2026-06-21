'use client'

export function fmt(v,dp=2){if(v===null||v===undefined||isNaN(v))return'—';return parseFloat(v).toFixed(dp)}
export function chgClass(n){if(n===null||n===undefined)return'';return n>=0?'up':'dn'}
export function chgSign(n,dp=2){if(n===null||n===undefined||isNaN(n))return'—';return(n>=0?'+':'')+fmt(n,dp)+'%'}
export function px(v,dp=2){if(v===null||v===undefined||isNaN(v))return'—';return parseFloat(v).toFixed(dp)}

export function SecLabel({children,style={}}){
  return <div style={{fontSize:10,fontWeight:600,color:'var(--muted)',letterSpacing:'0.09em',textTransform:'uppercase',margin:'18px 0 8px',...style}}>{children}</div>
}
export function Card({children,style={}}){
  return <div style={{background:'var(--white)',border:'0.5px solid var(--border)',borderRadius:10,padding:'16px 18px',...style}}>{children}</div>
}
export function CardTitle({icon,children}){
  return <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:12,display:'flex',alignItems:'center',gap:7}}>
    <i className={`ti ti-${icon}`} style={{color:'var(--orange)',fontSize:16}}/>{children}
  </div>
}
export function KpiCard({label,value,sub,subClass='',style={}}){
  return <div style={{background:'var(--white)',border:'0.5px solid var(--border)',borderRadius:8,padding:'14px 16px',...style}}>
    <div style={{fontSize:11,color:'var(--muted)',marginBottom:5}}>{label}</div>
    <div style={{fontSize:20,fontWeight:600,color:'var(--text)',lineHeight:1}}>{value??'—'}</div>
    {sub&&<div style={{fontSize:11,marginTop:4}} className={subClass}>{sub}</div>}
  </div>
}
export function Badge({children,variant='navy'}){
  const map={
    navy:{background:'#E6EBF2',color:'#0D1B2A'},
    orange:{background:'#FEF0EB',color:'#993C1D'},
    green:{background:'#EAF3DE',color:'#27500A'},
    amber:{background:'#FAEEDA',color:'#633806'},
    red:{background:'#FCEBEB',color:'#791F1F'},
    blue:{background:'#E6F1FB',color:'#0C447C'},
    muted:{background:'#F1EFE8',color:'#5F5E5A'},
  }
  return <span style={{display:'inline-block',padding:'2px 7px',borderRadius:4,fontSize:11,fontWeight:500,whiteSpace:'nowrap',...(map[variant]||map.navy)}}>{children}</span>
}
export function THead({children,cols,gap=8}){
  return <div style={{display:'grid',gridTemplateColumns:cols,gap,padding:'0 0 6px',fontSize:10,color:'var(--muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'0.5px solid var(--border)',marginBottom:2}}>{children}</div>
}
export function TRow({children,cols,gap=8,last=false}){
  return <div style={{display:'grid',gridTemplateColumns:cols,gap,alignItems:'center',padding:'7px 0',borderBottom:last?'none':'0.5px solid var(--border)',fontSize:12}}>{children}</div>
}
export function Grid({cols=4,children,style={}}){
  const t={2:'1fr 1fr',3:'1fr 1fr 1fr',4:'1fr 1fr 1fr 1fr'}
  return <div style={{display:'grid',gridTemplateColumns:t[cols]||t[4],gap:10,...style}}>{children}</div>
}
export function ZBadge({z}){
  if(z===null||z===undefined||isNaN(z)) return <span style={{color:'var(--muted)',fontSize:11}}>—</span>
  const abs=Math.abs(z)
  const color=abs>2?'#E24B4A':abs>1?'#BA7517':'#6B7A8D'
  return <span style={{fontSize:11,fontWeight:500,color}}>{z>=0?'+':''}{fmt(z,1)}σ</span>
}
export function PctileBar({pct}){
  if(pct===null||pct===undefined) return <span style={{color:'var(--muted)',fontSize:11}}>—</span>
  const color=pct>80?'#E24B4A':pct>60?'#BA7517':pct<20?'#1D9E75':'#6B7A8D'
  return(
    <div style={{display:'flex',alignItems:'center',gap:5}}>
      <div style={{width:50,height:4,background:'#EEF0F3',borderRadius:2}}>
        <div style={{width:`${pct}%`,height:4,borderRadius:2,background:color}}/>
      </div>
      <span style={{fontSize:10,color,minWidth:26}}>{pct}%</span>
    </div>
  )
}
export function SignalBadge({signal,color}){
  const map={green:'green',amber:'amber',red:'red',blue:'blue',neutral:'muted'}
  return <Badge variant={map[color]||'muted'}>{signal||'—'}</Badge>
}
