import { useMemo, useState } from "react";
import "./SplitPage.css";
import { calculateEqualShares, getOutstandingShare, isUserSettlementAllowed, roundToPaise, summarizeUserSplits, validateSplitShares } from "../utils/splitEngine.js";

const money = value => `₹${Number(value || 0).toLocaleString("en-IN",{maximumFractionDigits:2})}`;
const today = () => { const date = new Date(); const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60_000).toISOString().slice(0,10); };
const METHODS = ["UPI","Cash","Bank Transfer"];

export default function SplitPage({ splits=[], onCreate, onSettle, onDelete, onBack }) {
  const [showForm,setShowForm]=useState(false),[title,setTitle]=useState(""),[amount,setAmount]=useState(""),[date,setDate]=useState(today),[category,setCategory]=useState("Dining"),[scope,setScope]=useState("personal"),[groupName,setGroupName]=useState(""),[splitType,setSplitType]=useState("equal"),[paidBy,setPaidBy]=useState("Me"),[paymentMethod,setPaymentMethod]=useState("UPI"),[people,setPeople]=useState(["Me","Friend 1"]),[shares,setShares]=useState(["",""]),[error,setError]=useState("");
  const [settleTarget,setSettleTarget]=useState(null),[settleAmount,setSettleAmount]=useState(""),[settleMethod,setSettleMethod]=useState("UPI"),[settleDate,setSettleDate]=useState(today),[settleNote,setSettleNote]=useState("");
  const totals=useMemo(()=>summarizeUserSplits(splits),[splits]);
  function reset(){setTitle("");setAmount("");setDate(today());setCategory("Dining");setScope("personal");setGroupName("");setSplitType("equal");setPaidBy("Me");setPaymentMethod("UPI");setPeople(["Me","Friend 1"]);setShares(["",""]);setError("");setShowForm(false);}
  async function submit(e){e.preventDefault();setError("");const total=roundToPaise(amount);
    if(!title.trim()||!Number.isFinite(total)||total<=0){setError("Enter a title and a valid amount.");return;}
    if(!people.some(p=>p.trim().toLowerCase()===paidBy.trim().toLowerCase())){setError("Payer must be one of the participants.");return;}
    const allocated=splitType==="equal"?calculateEqualShares(total,people.length):shares.map(roundToPaise);
    const validation=validateSplitShares(total,people.map((name,i)=>({name,share:allocated[i]})));
    if(validation){setError(validation);return;}
    const saved=await onCreate({title:title.trim(),amount:total,date,category,scope,groupName,splitType,paidBy,paymentMethod,participants:people.map((name,i)=>({name:name.trim(),share:allocated[i]}))});if(saved!==false)reset();
  }
  async function saveSettlement(e){e.preventDefault();if(!settleTarget)return;const saved=await onSettle(settleTarget.splitId,{participantId:settleTarget.participantId,amount:Number(settleAmount),method:settleMethod,date:settleDate,note:settleNote});if(saved===false)return;setSettleTarget(null);setSettleAmount("");setSettleNote("");}
  return <div className="page-content page split-page">
    <div className="page-title-row"><div className="page-title"><span>PACE FINANCIAL CONTROL</span><h2>Split expenses</h2><p>Keep shared spending clear, without mixing up your own spend.</p></div><button className="back-btn" onClick={onBack}>← Back</button></div>
    <div className="split-summary-grid"><div className="split-summary-card"><small>OWED TO YOU</small><strong className="positive">{money(totals.owedToYou)}</strong></div><div className="split-summary-card"><small>YOU OWE</small><strong>{money(totals.youOwe)}</strong></div><div className="split-summary-card"><small>OPEN SPLITS</small><strong>{totals.openSplits}</strong></div></div>
    <div className="split-actions"><div><h3>Your shared expenses</h3><p>{splits.length} recorded split{splits.length===1?"":"s"}</p></div><button className="primary-action-btn" onClick={()=>setShowForm(v=>!v)}>＋ New split</button></div>
    {showForm&&<form className="split-form-card" onSubmit={submit}>
      <div className="split-form-heading"><div><span>NEW SHARED EXPENSE</span><h3>Create a split</h3></div><button type="button" className="close-btn" onClick={reset}>×</button></div>
      <label>What was it for?<input className="input-text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Dinner, office farewell" required/></label>
      <div className="form-row"><label>Total amount (₹)<input className="input-text" type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/></label><label>Date<input className="input-text" type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
      <div className="form-row"><label>Split scope<select className="input-select" value={scope} onChange={e=>setScope(e.target.value)}><option value="personal">Personal · friends</option><option value="group">Group expense</option></select></label><label>Category<input className="input-text" value={category} onChange={e=>setCategory(e.target.value)}/></label></div>
      {scope==="group"&&<label>Group name<input className="input-text" value={groupName} onChange={e=>setGroupName(e.target.value)} placeholder="e.g. Office farewell"/></label>}
      <div className="form-row"><label>Paid by<select className="input-select" value={paidBy} onChange={e=>setPaidBy(e.target.value)}>{people.filter(p=>p.trim()).map(p=><option key={p} value={p}>{p}</option>)}</select></label><label>Payment method<select className="input-select" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}>{METHODS.map(m=><option key={m}>{m}</option>)}</select></label></div>
      <div className="split-participant-heading"><strong>Participants</strong><button type="button" className="auth-link-btn" onClick={()=>{if(people.length<30){setPeople(p=>[...p,""]);setShares(s=>[...s,""]);}}}>＋ Add person</button></div>
      {people.map((p,i)=><div className="split-person-row" key={i}><input className="input-text" value={p} placeholder={i===0?"Me":"Friend name"} disabled={i===0} onChange={e=>setPeople(old=>old.map((v,j)=>j===i?e.target.value:v))}/>{splitType==="custom"?<input className="input-text" type="number" min="0" step="0.01" placeholder="Share ₹" value={shares[i]} onChange={e=>setShares(old=>old.map((v,j)=>j===i?e.target.value:v))}/>:<span>{money(Number(amount)>0?calculateEqualShares(Number(amount),people.length)[i]:0)}</span>}</div>)}
      <div className="split-mode-row"><label><input type="radio" checked={splitType==="equal"} onChange={()=>setSplitType("equal")}/> Equal split</label><label><input type="radio" checked={splitType==="custom"} onChange={()=>setSplitType("custom")}/> Custom amounts</label></div>
      <p className="split-hint">{splitType==="custom"?`Allocated: ${money(shares.reduce((a,b)=>a+(Number(b)||0),0))} / ${money(amount)}`:"Any rounding remainder is assigned to the last participant."}</p>
      {error&&<p className="split-error">{error}</p>}<div className="modal-btn-row"><button type="button" className="secondary-btn" onClick={reset}>Cancel</button><button className="primary-action-btn">Save split</button></div>
    </form>}
    {splits.length===0&&!showForm&&<div className="empty-state"><div>↗</div><h3>No split expenses yet</h3><p>Record a dinner, trip or office expense and track who owes what.</p><button onClick={()=>setShowForm(true)}>＋ Create your first split</button></div>}
    <div className="split-list">{splits.map(s=>{
      const settled=(s.participants||[]).reduce((v,p)=>v+Number(p.settledAmount||0),0);
      return <article className="split-item-card" key={s.id}><div className="split-item-top"><div><span className="split-scope-tag">{s.scope==="group"?"GROUP":"PERSONAL"}</span><h3>{s.title}</h3><small>{s.groupName?s.groupName+" · ":""}{s.date} · Paid by {s.paidBy}</small></div><strong>{money(s.amount)}</strong></div><div className="split-progress-track"><span style={{width:`${s.amount?Math.min(100,settled/s.amount*100):0}%`}}/></div><div className="split-person-balances">{(s.participants||[]).map(p=>{
        const due=getOutstandingShare(p);
        const canSettle=isUserSettlementAllowed(s,p);
        return <div className="split-balance-row" key={p.id||p.name}>
          <div><strong>{p.name}{p.name.toLowerCase()==="me"?" (you)":""}</strong><small>{money(p.settledAmount)} settled of {money(p.share)}</small></div>
          <span>{due<=0.005?"Settled":money(due)+" due"}</span>
          {due>0.005&&canSettle&&<button className="transaction-edit" onClick={()=>{setSettleTarget({splitId:s.id,participantId:p.id,direction:s.paidBy.toLowerCase()==="me"?"receive":"send"});setSettleAmount(due.toFixed(2));}}>Settle</button>}
        </div>;
      })}</div><div className="split-item-footer"><small>{s.paymentMethod} · {s.splitType==="equal"?"Equal":"Custom"} split</small><button className="transaction-delete" onClick={()=>onDelete(s.id)}>Delete</button></div></article>;
    })}</div>
    {settleTarget&&<div className="modal-overlay" onMouseDown={()=>setSettleTarget(null)}><form className="modal split-settlement-modal" onSubmit={saveSettlement} onMouseDown={e=>e.stopPropagation()}><div className="modal-handle"/><div className="modal-header"><div><span>SETTLEMENT</span><h2>{settleTarget.direction==="receive"?"Record payment received":"Record payment sent"}</h2></div><button type="button" className="close-btn" onClick={()=>setSettleTarget(null)}>×</button></div><label>Amount {settleTarget.direction==="receive"?"received":"sent"} (₹)<input className="input-text" type="number" min="0.01" step="0.01" value={settleAmount} onChange={e=>setSettleAmount(e.target.value)} required/></label><label>Payment method<select className="input-select" value={settleMethod} onChange={e=>setSettleMethod(e.target.value)}>{METHODS.map(m=><option key={m}>{m}</option>)}</select></label><label>Date<input className="input-text" type="date" value={settleDate} onChange={e=>setSettleDate(e.target.value)}/></label><label>Reference / note<input className="input-text" value={settleNote} onChange={e=>setSettleNote(e.target.value)} placeholder="Optional"/></label><div className="modal-btn-row"><button type="button" className="secondary-btn" onClick={()=>setSettleTarget(null)}>Cancel</button><button className="primary-action-btn">Save settlement</button></div></form></div>}
  </div>;
}
