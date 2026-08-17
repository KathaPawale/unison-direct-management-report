window.UnisonPDF = (() => {
  function money(n){return Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD'});}
  function escapePdf(s){return String(s).replace(/[()\\]/g,x=>'\\'+x);}
  function text(x,y,size,s,bold=false){return `BT /F${bold?2:1} ${size} Tf ${x} ${y} Td (${escapePdf(s)}) Tj ET\n`;}
  function watermark(){return `q 0.92 g BT /F2 42 Tf 0.839 0.545 -0.545 0.839 155 360 Tm (UNISON DIRECT) Tj ET Q\n`;}
  function create(state, findSheet){
    const m=state.metrics; const pages=[];
    pages.push(`0.122 0.286 0.49 rg 0 625 612 167 re f\n1 g${text(42,720,28,'Management Report')}${text(42,680,18,state.client)}${text(42,655,16,state.period)}0.855 0.898 0.945 rg 0 0 612 47 re f\n`);
    let dash=watermark()+text(48,720,20,'Analytical Dashboard',true)+text(48,695,11,state.period), y=650;
    [['Revenue / Income',m.income],['Gross Profit',m.gross],['Net Income',m.net],['Cash / Bank',m.bank],['Accounts Receivable',m.ar],['Accounts Payable',m.ap]].forEach(([l,v])=>{dash+=text(55,y,11,l)+text(410,y,11,money(v),true);y-=34;}); pages.push(dash);
    for(const [title,re] of [['Profit and Loss',/profit.*loss|p&l|income statement/i],['Balance Sheet',/balance sheet/i]]){
      let c=watermark()+text(48,720,20,title,true)+text(48,695,11,state.period), yy=660;
      for(const r of findSheet(re).slice(0,38)){const lab=String(r[0]??'').slice(0,62);if(!lab){yy-=8;continue;}const val=[...r.slice(1)].reverse().find(v=>String(v??'').trim()!=='');c+=text(52,yy,9,lab);if(val!==undefined)c+=text(420,yy,9,typeof val==='number'?money(val):String(val).slice(0,22));yy-=14;if(yy<55)break;} pages.push(c);
    }
    pages.push(watermark()+text(48,720,20,'Management Purpose Disclaimer',true)+text(48,640,11,'The report we are submitting is for management purpose only.',true)+text(48,615,11,'The numbers are based on data submitted and instructed by client',true)+text(48,555,11,'Prepared by Unison Direct GCC INC'));
    const objs=['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'],pids=[],cids=[];
    for(const c of pages){cids.push(objs.length+1);objs.push(`<< /Length ${c.length} >>\nstream\n${c}\nendstream`);pids.push(objs.length+1);objs.push('');}
    const pagesId=objs.length+1;objs.push('');pids.forEach((id,i)=>objs[id-1]=`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 1 0 R /F2 2 0 R >> >> /Contents ${cids[i]} 0 R >>`);objs[pagesId-1]=`<< /Type /Pages /Kids [${pids.map(x=>x+' 0 R').join(' ')}] /Count ${pids.length} >>`;const cat=objs.length+1;objs.push(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);let out='%PDF-1.4\n',off=[0];objs.forEach((o,i)=>{off[i+1]=out.length;out+=`${i+1} 0 obj\n${o}\nendobj\n`;});const xr=out.length;out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;for(let i=1;i<=objs.length;i++)out+=String(off[i]).padStart(10,'0')+' 00000 n \n';out+=`trailer\n<< /Size ${objs.length+1} /Root ${cat} 0 R >>\nstartxref\n${xr}\n%%EOF`;return new Blob([out],{type:'application/pdf'});
  }
  async function save(blob,name){if(window.showSaveFilePicker){try{const h=await showSaveFilePicker({suggestedName:name,types:[{description:'PDF',accept:{'application/pdf':['.pdf']}}]});const w=await h.createWritable();await w.write(blob);await w.close();return true;}catch(e){if(e.name==='AbortError')return false;}}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);return true;}
  return {create,save};
})();