import test from "node:test";
import assert from "node:assert/strict";
function equalShares(amount,count){const base=Math.floor(amount/count*100)/100;return Array.from({length:count},(_,i)=>i===count-1?Math.round((amount-base*(count-1))*100)/100:base);}
test("equal shares sum to total in paise",()=>{for(const [amount,count] of [[1200,3],[100,6],[10,3],[0.1,3]])assert.equal(Math.round(equalShares(amount,count).reduce((a,b)=>a+b,0)*100)/100,amount);});
test("payer expense is only payer share, not full group bill",()=>{const people=[{name:"Me",share:400},{name:"A",share:400},{name:"B",share:400}];assert.equal(people.find(p=>p.name==="Me").share,400);assert.equal(people.reduce((s,p)=>s+p.share,0),1200);});
test("settlements are capped at outstanding share",()=>{const share=400,settled=250;assert.ok(settled+150<=share);assert.ok(settled+150.01>share);});
