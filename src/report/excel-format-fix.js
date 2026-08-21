/* Excel report formatting — match the management-report statement style. */
'use strict';
(function(){
  const NAVY='0B2F59', LIGHT='E8F0FA', SECTION='F0F4F9', TOTAL='E4EEF9', GRID='C9D5E3', RED='EF4B43', CYAN='18A6D9', TEXT='243B57';
  const clone=x=>x?JSON.parse(JSON.stringify(x)):{};
  const addr=(r,c)=>XLSX.utils.encode_cell({r,c});
  const side=(style='thin',rgb=GRID)=>({style,color:{rgb}});
  function ensure(ws,r,c){const a=addr(r,c);if(!ws[a])ws[a]={t:'s',v:''};return ws[a];}
  function styleCell(ws,r,c,extra){const x=ensure(ws,r,c),s=clone(x.s);x.s={...s,...extra,font:{...(s.font||{}),...(extra.font||{})},alignment:{...(s.alignment||{}),...(extra.alignment||{})},border:{...(s.border||{}),...(extra.border||{})}};return x;}
  function fullGrid(ws,t,l,b,rr){for(let r=t;r<=b;r++)for(let c=l;c<=rr;c++)styleCell(ws,r,c,{border:{top:side(),bottom:side(),left:side(),right:side()}});}
  function outside(ws,t,l,b,rr){for(let c=l;c<=rr;c++){styleCell(ws,t,c,{border:{top:side('medium',NAVY)}});styleCell(ws,b,c,{border:{bottom:side('medium',NAVY)}});}for(let r=t;r<=b;r++){styleCell(ws,r,l,{border:{left:side('medium',NAVY)}});styleCell(ws,r,rr,{border:{right:side('medium',NAVY)}});}}
  function label(ws,r){return String(ws[addr(r,0)]?.v??'').trim();}
  function isTotal(v){return /^total\b/i.test(v)||/^(gross profit|net income|net profit|total assets|total liabilities|total equity)$/i.test(v);}
  function isSection(v){return /^(income|revenue|expenses|cost of goods sold|assets|liabilities|equity|current assets|current liabilities|bank accounts|accounts receivable|accounts payable|other current assets)$/i.test(v);}
  function format(ws,name){
    if(!ws?.['!ref'])return;const rg=XLSX.utils.decode_range(ws['!ref']);
    const cover=name==='Cover',notes=name==='Notes'||name==='Disclaimer';
    if(cover||notes){outside(ws,rg.s.r,rg.s.c,rg.e.r,rg.e.c);return;}
    ws['!cols']=Array.from({length:rg.e.c+1},(_,c)=>({wch:c===0?42:16}));
    ws['!rows']=ws['!rows']||[];for(let r=rg.s.r;r<=rg.e.r;r++)ws['!rows'][r]={...(ws['!rows'][r]||{}),hpt:r<=4?22:18};
    const top=name==='Analytical Summary'?2:Math.min(4,rg.e.r);
    fullGrid(ws,top,0,rg.e.r,rg.e.c);outside(ws,top,0,rg.e.r,rg.e.c);
    // Main column heading band.
    for(let c=0;c<=rg.e.c;c++)styleCell(ws,top,c,{fill:{fgColor:{rgb:NAVY}},font:{bold:true,color:{rgb:'FFFFFF'}},alignment:{horizontal:c===0?'left':'right',vertical:'center'}});
    for(let r=top+1;r<=rg.e.r;r++){
      const lbl=label(ws,r);
      if(isSection(lbl)) for(let c=0;c<=rg.e.c;c++)styleCell(ws,r,c,{fill:{fgColor:{rgb:SECTION}},font:{bold:true,color:{rgb:NAVY}}});
      if(isTotal(lbl)) for(let c=0;c<=rg.e.c;c++)styleCell(ws,r,c,{fill:{fgColor:{rgb:TOTAL}},font:{bold:true,color:{rgb:NAVY}},border:{top:side('medium',NAVY),bottom:side('thin',GRID)}});
      for(let c=1;c<=rg.e.c;c++){
        const x=ws[addr(r,c)];if(!x)continue;
        if(typeof x.v==='number'){const s=clone(x.s);s.numFmt='#,##0.00;[Red]-#,##0.00';s.alignment={...(s.alignment||{}),horizontal:'right'};if(x.v<0)s.font={...(s.font||{}),color:{rgb:RED}};x.s=s;}
      }
    }
    delete ws['!autofilter'];delete ws['!freeze'];
  }
  const write=XLSX.writeFile.bind(XLSX);
  XLSX.writeFile=function(wb,filename,opts){if(filename&&/Management-Report\.xlsx$/i.test(filename))(wb.SheetNames||[]).forEach(n=>format(wb.Sheets[n],n));return write(wb,filename,{cellStyles:true,...(opts||{})});};
})();