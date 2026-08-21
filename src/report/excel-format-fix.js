/* Excel formatting hardening: visible borders, columns, widths and panes. */
'use strict';

(function(){
  const BORDER_COLOR = 'B7C4D3';
  const thinBorder = {
    top:{style:'thin',color:{rgb:BORDER_COLOR}},
    bottom:{style:'thin',color:{rgb:BORDER_COLOR}},
    left:{style:'thin',color:{rgb:BORDER_COLOR}},
    right:{style:'thin',color:{rgb:BORDER_COLOR}}
  };

  function mergeStyle(base, extra){
    return {...(base||{}), ...(extra||{}),
      font:{...((base||{}).font||{}),...((extra||{}).font||{})},
      fill:{...((base||{}).fill||{}),...((extra||{}).fill||{})},
      alignment:{...((base||{}).alignment||{}),...((extra||{}).alignment||{})},
      border:{...((base||{}).border||{}),...((extra||{}).border||{})}
    };
  }

  function hardenSheet(ws, options={}){
    if (!ws || !ws['!ref']) return ws;
    const range=XLSX.utils.decode_range(ws['!ref']);
    for(let r=range.s.r;r<=range.e.r;r++){
      for(let c=range.s.c;c<=range.e.c;c++){
        const addr=XLSX.utils.encode_cell({r,c});
        if(!ws[addr]) ws[addr]={t:'s',v:''};
        const cell=ws[addr];
        const existing=cell.s||{};
        cell.s=mergeStyle(existing,{border:thinBorder,alignment:{vertical:'center',...(existing.alignment||{})}});
        if(typeof cell.v==='number' && !cell.s.numFmt) cell.s.numFmt='#,##0.00;[Red](#,##0.00)';
      }
    }
    if(!ws['!cols'] || !ws['!cols'].length){
      ws['!cols']=Array.from({length:range.e.c-range.s.c+1},(_,i)=>({wch:i===0?36:16}));
    } else {
      ws['!cols']=ws['!cols'].map((col,i)=>({wch:Math.max(Number(col?.wch)||0,i===0?28:14)}));
    }
    ws['!rows']=ws['!rows']||[];
    for(let r=range.s.r;r<=range.e.r;r++) if(!ws['!rows'][r]) ws['!rows'][r]={hpt:r<=4?22:18};
    if(options.freeze!==false) ws['!freeze']={xSplit:1,ySplit:5,topLeftCell:'B6',activePane:'bottomRight',state:'frozen'};
    if(options.filter && range.e.r>=options.filterRow){
      ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:options.filterRow,c:0},e:{r:options.filterRow,c:range.e.c}})};
    }
    return ws;
  }

  const originalModelSheetToWs=window._modelSheetToWs || (typeof _modelSheetToWs==='function'?_modelSheetToWs:null);
  if(originalModelSheetToWs){
    window._modelSheetToWs=function(sm){ return hardenSheet(originalModelSheetToWs(sm),{filter:true,filterRow:4}); };
    try{ _modelSheetToWs=window._modelSheetToWs; }catch(e){}
  }

  const originalWriteFile=XLSX.writeFile.bind(XLSX);
  XLSX.writeFile=function(wb,filename,opts){
    if(filename && /Management-Report\.xlsx$/i.test(filename)){
      (wb.SheetNames||[]).forEach(name=>{
        const ws=wb.Sheets[name];
        if(!ws) return;
        const isCover=name==='Cover', isNotes=name==='Notes'||name==='Disclaimer';
        hardenSheet(ws,{freeze:!isCover&&!isNotes,filter:false});
        if(isCover) ws['!cols']=[{wch:52},...Array(7).fill(null).map(()=>({wch:14}))];
        if(isNotes) ws['!cols']=[{wch:110}];
      });
    }
    return originalWriteFile(wb,filename,{cellStyles:true,...(opts||{})});
  };
})();