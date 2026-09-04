/* Excel report formatting — preserve the existing design while making workbook layout adaptive. */
'use strict';
(function(){
  const NAVY='0B2F59', LIGHT='E8F0FA', SECTION='F0F4F9', TOTAL='E4EEF9', GRID='C9D5E3', RED='EF4B43';
  const clone=x=>x?JSON.parse(JSON.stringify(x)):{};
  const addr=(r,c)=>XLSX.utils.encode_cell({r,c});
  const side=(style='thin',rgb=GRID)=>({style,color:{rgb}});
  function ensure(ws,r,c){const a=addr(r,c);if(!ws[a])ws[a]={t:'s',v:''};return ws[a];}
  function styleCell(ws,r,c,extra){const x=ensure(ws,r,c),s=clone(x.s);x.s={...s,...extra,font:{...(s.font||{}),...(extra.font||{})},alignment:{...(s.alignment||{}),...(extra.alignment||{})},border:{...(s.border||{}),...(extra.border||{})}};return x;}
  function fullGrid(ws,t,l,b,rr){for(let r=t;r<=b;r++)for(let c=l;c<=rr;c++)styleCell(ws,r,c,{border:{top:side(),bottom:side(),left:side(),right:side()}});}
  function outside(ws,t,l,b,rr){for(let c=l;c<=rr;c++){styleCell(ws,t,c,{border:{top:side('medium',NAVY)}});styleCell(ws,b,c,{border:{bottom:side('medium',NAVY)}});}for(let r=t;r<=b;r++){styleCell(ws,r,l,{border:{left:side('medium',NAVY)}});styleCell(ws,r,rr,{border:{right:side('medium',NAVY)}});}}
  function text(v){return String(v??'').trim();}
  function label(ws,r){return text(ws[addr(r,0)]?.v);}
  function isTotal(v){return /^total\b/i.test(v)||/^(gross profit|net income|net profit)$/i.test(v);}
  function isSection(v){return /^(income|revenue|expenses|cost of goods sold|assets|liabilities|equity|current assets|current liabilities|bank accounts|accounts receivable|accounts payable|other current assets)$/i.test(v);}
  function numeric(x){return x&&typeof x.v==='number'&&Number.isFinite(x.v);}
  function visibleLength(v){return text(v).replace(/https?:\/\/\S+/g,'').length;}
  function widthForColumn(ws,c,rg,top){
    let max=0,hasNum=false,hasText=false;
    for(let r=0;r<=rg.e.r;r++){
      if(r===top)continue;
      const x=ws[addr(r,c)];if(!x)continue;
      if(numeric(x)){hasNum=true;max=Math.max(max,Math.min(18,visibleLength(Math.abs(x.v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}))+2));}
      else {hasText=true;max=Math.max(max,visibleLength(x.v));}
    }
    const header=ws[addr(top,c)];if(header)max=Math.max(max,visibleLength(header.v)+2);
    if(c===0)return Math.min(58,Math.max(24,max+2));
    if(hasText&&!hasNum)return Math.min(30,Math.max(12,max+2));
    return Math.min(19,Math.max(12,max+2));
  }
  function rowHeight(ws,r,rg,top,labelWidth){
    const lbl=label(ws,r);let longest=lbl.length;
    for(let c=1;c<=rg.e.c;c++){const x=ws[addr(r,c)];if(x&&!numeric(x))longest=Math.max(longest,visibleLength(x.v));}
    if(r===top)return 28;if(r<=3)return 24;if(longest>labelWidth*1.2)return 30;if(longest>labelWidth)return 24;return 19;
  }
  function format(ws,name){
    if(!ws?.['!ref'])return;
    const rg=XLSX.utils.decode_range(ws['!ref']);
    const cover=name==='Cover',notes=/^(Notes|Disclaimer)$/i.test(name);
    if(cover||notes){
      ws['!cols']=Array.from({length:rg.e.c+1},(_,c)=>({wch:Math.min(42,Math.max(12,widthForColumn(ws,c,rg,rg.s.r)))}));
      ws['!rows']=ws['!rows']||[];for(let r=rg.s.r;r<=rg.e.r;r++)ws['!rows'][r]={...(ws['!rows'][r]||{}),hpt:r<=3?26:20};
      outside(ws,rg.s.r,rg.s.c,rg.e.r,rg.e.c);return;
    }
    const top=name==='Analytical Summary'?2:Math.min(4,rg.e.r);
    const labelWidth=Math.min(58,Math.max(24,widthForColumn(ws,0,rg,top)));
    ws['!cols']=Array.from({length:rg.e.c+1},(_,c)=>({wch:widthForColumn(ws,c,rg,top)}));
    ws['!rows']=ws['!rows']||[];
    for(let r=rg.s.r;r<=rg.e.r;r++)ws['!rows'][r]={...(ws['!rows'][r]||{}),hpt:rowHeight(ws,r,rg,top,labelWidth)};
    fullGrid(ws,top,0,rg.e.r,rg.e.c);outside(ws,top,0,rg.e.r,rg.e.c);
    for(let c=0;c<=rg.e.c;c++)styleCell(ws,top,c,{fill:{fgColor:{rgb:NAVY}},font:{bold:true,color:{rgb:'FFFFFF'}},alignment:{horizontal:c===0?'left':'right',vertical:'center',wrapText:true}});
    for(let r=top+1;r<=rg.e.r;r++){
      const lbl=label(ws,r),total=isTotal(lbl),section=isSection(lbl);
      if(section)for(let c=0;c<=rg.e.c;c++)styleCell(ws,r,c,{fill:{fgColor:{rgb:SECTION}},font:{bold:true,color:{rgb:NAVY}},alignment:{vertical:'center'}});
      if(total)for(let c=0;c<=rg.e.c;c++)styleCell(ws,r,c,{fill:{fgColor:{rgb:TOTAL}},font:{bold:true,color:{rgb:NAVY}},border:{top:side('medium',NAVY),bottom:side('thin',GRID)}});
      const oldIndent=Number(ws[addr(r,0)]?.s?.alignment?.indent)||0;
      styleCell(ws,r,0,{alignment:{horizontal:'left',vertical:'center',wrapText:visibleLength(lbl)>28,indent:Math.min(oldIndent,15)}});
      for(let c=1;c<=rg.e.c;c++){
        const x=ws[addr(r,c)];if(!x)continue;
        if(numeric(x)){
          const s=clone(x.s);s.alignment={...(s.alignment||{}),horizontal:'right',vertical:'center',wrapText:false};if(!s.numFmt)s.numFmt='#,##0.00;[Red](#,##0.00)';if(x.v<0)s.font={...(s.font||{}),color:{rgb:RED}};x.s=s;
        }else styleCell(ws,r,c,{alignment:{horizontal:'left',vertical:'center',wrapText:true}});
      }
    }
    if(!ws['!freeze'])ws['!freeze']={xSplit:0,ySplit:top+1};
    if(!ws['!autofilter']&&rg.e.r>top)ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:top,c:0},e:{r:top,c:rg.e.c}})};
  }
  const write=XLSX.writeFile.bind(XLSX);
  XLSX.writeFile=function(wb,filename,opts){if(filename&&/Management-Report\.xlsx$/i.test(filename)&&wb?.SheetNames)wb.SheetNames.forEach(name=>format(wb.Sheets[name],name));return write(wb,filename,{cellStyles:true,...(opts||{})});};
})();