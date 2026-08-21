/* Flexible workbook metric recovery for differently formatted client files. */
'use strict';
(function(){
  const baseParse = parseWorkbook;
  const norm = v => String(v ?? '').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
  const isText = v => typeof v === 'string' && v.trim() && !isNumericCell(v);
  const currentYear = new Date().getFullYear();

  function rowHeaderInfo(rows, r){
    for(let rr=r-1; rr>=Math.max(0,r-10); rr--){
      const row=rows[rr]||[];
      const txt=row.map(norm);
      const score=txt.filter(x=>/current|prior|py|change|variance|total|20\d\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/.test(x)).length;
      if(score>=1) return {row:rr, cells:txt};
    }
    return {row:-1,cells:[]};
  }

  function numericValue(rows,r,labelCol,prefer='current'){
    const row=rows[r]||[], h=rowHeaderInfo(rows,r).cells;
    const nums=[];
    for(let c=labelCol+1;c<row.length;c++) if(String(row[c]??'').trim()!=='' && isNumericCell(row[c])) nums.push({c,v:num(row[c]),h:h[c]||''});
    if(!nums.length) return null;
    const notDerived=nums.filter(x=>!/change|variance|difference|%|percent/.test(x.h));
    const pool=notDerived.length?notDerived:nums;
    if(prefer==='prior'){
      const py=pool.find(x=>/prior|\bpy\b|previous|202[0-5]/.test(x.h)); if(py) return py.v;
      return pool.length>1?pool[1].v:null;
    }
    const cur=pool.find(x=>/current|this year|ytd|2026|2027|2028|2029/.test(x.h) && !/prior|py/.test(x.h));
    if(cur) return cur.v;
    const total=pool.find(x=>/^total$|ytd|year to date/.test(x.h)); if(total) return total.v;
    // Monthly layouts: last non-derived number is usually the Total column.
    const monthHeaders=pool.filter(x=>/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/.test(x.h));
    if(monthHeaders.length>=2){
      const explicitTotal=pool.find(x=>/total|ytd/.test(x.h));
      return explicitTotal?explicitTotal.v:monthHeaders.reduce((s,x)=>s+x.v,0);
    }
    return pool[0].v;
  }

  const specs={
    income:{re:[/^total for income$/, /^total income$/, /^total revenue$/, /^revenue total$/, /^net sales$/, /^sales revenue$/, /^income$/], sheets:/profit|loss|p\s*&?\s*l|income|statement|monthly|compar/i},
    gross:{re:[/^gross profit$/, /^gross margin$/], sheets:/profit|loss|p\s*&?\s*l|income|statement/i},
    expenses:{re:[/^total for expenses$/, /^total expenses$/, /^total operating expenses$/, /^operating expenses$/], sheets:/profit|loss|p\s*&?\s*l|income|statement/i},
    net:{re:[/^net income$/, /^net profit$/, /^profit for the period$/, /^net earnings$/, /^net loss$/], sheets:/profit|loss|p\s*&?\s*l|income|statement/i},
    bank:{re:[/^total for bank accounts$/, /^total bank accounts$/, /^cash and cash equivalents$/, /^total cash$/, /^cash bank$/, /^cash and bank$/], sheets:/balance|sheet|financial position/i},
    ar:{re:[/^total for accounts receivable$/, /^total accounts receivable$/, /^accounts receivable total$/, /^total a r$/, /^a r total$/], sheets:/balance|receivable|a\s*\/?\s*r|aging/i},
    ap:{re:[/^total for accounts payable$/, /^total accounts payable$/, /^accounts payable total$/, /^total a p$/, /^a p total$/], sheets:/balance|payable|a\s*\/?\s*p|aging/i},
    assets:{re:[/^total for assets$/, /^total assets$/],sheets:/balance|sheet|financial position/i},
    liabilities:{re:[/^total for liabilities$/, /^total liabilities$/],sheets:/balance|sheet|financial position/i},
    equity:{re:[/^total for equity$/, /^total equity$/, /^total shareholders equity$/, /^total stockholders equity$/],sheets:/balance|sheet|financial position/i}
  };

  function candidates(sheets,key,prefer='current'){
    const sp=specs[key], out=[];
    for(const [name,rows] of Object.entries(sheets)){
      for(let r=0;r<rows.length;r++){
        const row=rows[r]||[];
        for(let c=0;c<row.length;c++){
          if(!isText(row[c])) continue;
          const label=norm(row[c]);
          const pi=sp.re.findIndex(re=>re.test(label));
          if(pi<0) continue;
          const v=numericValue(rows,r,c,prefer); if(v===null) continue;
          let score=100-pi*8;
          if(sp.sheets.test(name)) score+=35;
          if(/^total/.test(label)) score+=18;
          if(/change|variance|budget/.test(norm(name))) score-=25;
          out.push({v,score,name,r,label});
        }
      }
    }
    return out.sort((a,b)=>b.score-a.score);
  }

  function recover(sheets,key,old,prefer='current'){
    const c=candidates(sheets,key,prefer);
    if(!c.length) return old;
    const best=c[0];
    // High-confidence totals override parser output; otherwise only fill missing/zero values.
    if(best.score>=135 || old===null || old===undefined || Math.abs(Number(old)||0)<0.000001) return best.v;
    return old;
  }

  function sectionSum(sheets, sectionNames, stopNames){
    for(const [name,rows] of Object.entries(sheets)){
      if(!/profit|loss|income|p\s*&?\s*l/i.test(name)) continue;
      for(let r=0;r<rows.length;r++){
        const row=rows[r]||[]; const lc=row.findIndex(x=>sectionNames.includes(norm(x)));
        if(lc<0) continue;
        let sum=0,found=0;
        for(let rr=r+1;rr<rows.length;rr++){
          const lbl=norm((rows[rr]||[])[lc]);
          if(stopNames.some(x=>lbl===x||lbl.startsWith('total '+x)||lbl.startsWith('total for '+x))) break;
          if(/^total/.test(lbl)) continue;
          const v=numericValue(rows,rr,lc,'current'); if(v!==null){sum+=v;found++;}
        }
        if(found) return sum;
      }
    }
    return null;
  }

  parseWorkbook=function(sheets){
    const model=baseParse(sheets);
    model.metrics=model.metrics||{}; model.prior=model.prior||{};
    for(const k of Object.keys(specs)) model.metrics[k]=recover(sheets,k,model.metrics[k],'current');
    for(const k of ['income','gross','expenses','net','bank','ar','ap','assets']){
      const p=recover(sheets,k,model.prior[k],'prior');
      model.prior[k]=(p===undefined?model.prior[k]:p);
    }
    if(!model.metrics.income){ const s=sectionSum(sheets,['income','revenue','sales'],['expenses','cost of goods sold','gross profit']); if(s!==null) model.metrics.income=s; }
    if(!model.metrics.expenses){ const s=sectionSum(sheets,['expenses','operating expenses'],['net income','net profit']); if(s!==null) model.metrics.expenses=s; }
    if(!model.metrics.net && model.metrics.income && model.metrics.expenses) model.metrics.net=model.metrics.income-model.metrics.expenses;
    if(!model.metrics.gross && model.metrics.income) model.metrics.gross=model.metrics.income;
    return model;
  };
})();