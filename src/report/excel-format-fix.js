/* Excel report formatting — stable alignment, adaptive widths, and clean statement borders. */
'use strict';
(function(){
  const NAVY='0B2F59', LIGHT='E8F0FA', SECTION='F0F4F9', TOTAL='E4EEF9', GRID='C9D5E3', RED='EF4B43';
  const clone=x=>x?JSON.parse(JSON.stringify(x)):{};
  const addr=(r,c)=>XLSX.utils.encode_cell({r,c});
  const side=(style='thin',rgb=GRID)=>({style,color:{rgb}});
  function ensure(ws,r,c){const a=addr(r,c);if(!ws[a])ws[a]={t:'s',v:''};return ws[a];}
  function styleCell(ws,r,c,extra){const x=ensure(ws,r,c),s=clone(x.s);x.s={...s,...extra,font:{...(s.font||{}),...(extra.font||{})},alignment:{...(s.alignment||{}),...(extra.alignment||{})},border:{...(s.border||{}),...(extra.border||{})}};return x;}
  function outside(ws,t,l,b,rr){
    for(let c=l;c<=rr;c++){
      styleCell(ws,t,c,{border:{...(ws[addr(t,c)]?.s?.border||{}),top:side('medium',NAVY)}});
      styleCell(ws,b,c,{border:{...(ws[addr(b,c)]?.s?.border||{}),bottom:side('medium',NAVY)}});
    }
    for(let r=t;r<=b;r++){
      styleCell(ws,r,l,{border:{...(ws[addr(r,l)]?.s?.border||{}),left:side('medium',NAVY)}});
      styleCell(ws,r,rr,{border:{...(ws[addr(r,rr)]?.s?.border||{}),right:side('medium',NAVY)}});
    }
  }
  function text(v){return String(v??'').trim();}
  function label(ws,r){return text(ws[addr(r,0)]?.v);}
  function isTotal(v){return /^total\b/i.test(v)||/^(gross profit|net income|net profit)$/i.test(v);}
  function isSection(v){return /^(income|revenue|expenses|cost of goods sold|assets|liabilities|equity|current assets|current liabilities|bank accounts|accounts receivable|accounts payable|other current assets)$/i.test(v);}
  function numeric(x){return !!x&&typeof x.v==='number'&&Number.isFinite(x.v);}
  function isPercentFormat(fmt){return /%/.test(String(fmt||''));}
  function displayWidth(x){
    if(!x)return 0;
    if(numeric(x)){
      const fmt=String(x.s?.numFmt||'');
      if(isPercentFormat(fmt))return Math.min(18,Math.max(8,String(Math.abs(x.v)).length+5));
      return Math.min(19,String(Math.abs(x.v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})).length+3);
    }
    return text(x.v).length;
  }
  function widthForColumn(ws,c,rg,top){
    let max=0;
    for(let r=rg.s.r;r<=rg.e.r;r++){
      if(r===top)continue;
      const x=ws[addr(r,c)];
      if(x)max=Math.max(max,displayWidth(x));
    }
    const header=ws[addr(top,c)];
    if(header)max=Math.max(max,text(header.v).length+3);
    if(c===0)return Math.min(56,Math.max(24,max+2));
    return Math.min(20,Math.max(11,max+1));
  }
  function rowHeight(ws,r,rg,top,labelWidth){
    if(r===top)return 24;
    if(r<top)return 20;
    const lbl=label(ws,r);
    const lines=Math.max(1,Math.ceil(lbl.length/Math.max(18,labelWidth-4)));
    let nonNumLongest=0;
    for(let c=1;c<=rg.e.c;c++){
      const x=ws[addr(r,c)];
      if(x&&!numeric(x))nonNumLongest=Math.max(nonNumLongest,text(x.v).length);
    }
    return Math.min(54,Math.max(18,18*Math.max(lines,Math.ceil(nonNumLongest/22))));
  }
  function format(ws,name){
    if(!ws?.['!ref'])return;
    const rg=XLSX.utils.decode_range(ws['!ref']);
    const cover=name==='Cover',notes=/^(Notes|Disclaimer)$/i.test(name);
    if(cover||notes){
      ws['!cols']=Array.from({length:rg.e.c+1},(_,c)=>({wch:Math.min(50,Math.max(12,widthForColumn(ws,c,rg,rg.s.r)))}));
      ws['!rows']=ws['!rows']||[];
      for(let r=rg.s.r;r<=rg.e.r;r++){
        if(!ws['!rows'][r])ws['!rows'][r]={hpt:r<=3?24:20};
      }
      outside(ws,rg.s.r,rg.s.c,rg.e.r,rg.e.c);
      return;
    }

    const top=name==='Analytical Summary'?2:Math.min(4,rg.e.r);
    const labelWidth=Math.min(56,Math.max(24,widthForColumn(ws,0,rg,top)));
    ws['!cols']=Array.from({length:rg.e.c+1},(_,c)=>({wch:widthForColumn(ws,c,rg,top)}));
    ws['!rows']=ws['!rows']||[];
    for(let r=rg.s.r;r<=rg.e.r;r++){
      if(!ws['!rows'][r]||typeof ws['!rows'][r] !== 'object')ws['!rows'][r]={};
      if(ws['!rows'][r].hpt==null)ws['!rows'][r].hpt=rowHeight(ws,r,rg,top,labelWidth);
    }

    /* Do not box every Excel cell. Keep the requested clean outside-border style. */
    outside(ws,top,0,rg.e.r,rg.e.c);

    /* Header row. */
    for(let c=0;c<=rg.e.c;c++)styleCell(ws,top,c,{
      fill:{fgColor:{rgb:NAVY}},
      font:{bold:true,color:{rgb:'FFFFFF'}},
      alignment:{horizontal:c===0?'left':'right',vertical:'center',wrapText:true}
    });

    for(let r=top+1;r<=rg.e.r;r++){
      const lbl=label(ws,r), total=isTotal(lbl), section=isSection(lbl);
      if(section)for(let c=0;c<=rg.e.c;c++)styleCell(ws,r,c,{
        fill:{fgColor:{rgb:SECTION}},
        font:{bold:true,color:{rgb:NAVY}},
        alignment:{horizontal:c===0?'left':'right',vertical:'center',wrapText:c===0}
      });
      if(total)for(let c=0;c<=rg.e.c;c++)styleCell(ws,r,c,{
        fill:{fgColor:{rgb:TOTAL}},
        font:{bold:true,color:{rgb:NAVY}},
        border:{top:side('medium',NAVY)}
      });

      const old=ws[addr(r,0)]?.s?.alignment||{};
      styleCell(ws,r,0,{alignment:{...old,horizontal:'left',vertical:'center',wrapText:lbl.length>30,indent:Math.min(Number(old.indent)||0,15)}});

      for(let c=1;c<=rg.e.c;c++){
        const x=ws[addr(r,c)];
        if(!x)continue;
        if(numeric(x)){
          const s=clone(x.s);
          const keepFmt=s.numFmt;
          s.alignment={...(s.alignment||{}),horizontal:'right',vertical:'center',wrapText:false};
          /* Preserve percentage/accounting formats already assigned by the export layer. */
          if(!keepFmt)s.numFmt='#,##0.00;[Red](#,##0.00)';
          if(x.v<0)s.font={...(s.font||{}),color:{rgb:RED}};
          x.s=s;
        }else{
          styleCell(ws,r,c,{alignment:{horizontal:'left',vertical:'center',wrapText:true}});
        }
      }
    }

    /* Never force a new freeze pane/filter that changes the workbook's native layout. */
    delete ws['!autofilter'];
    delete ws['!freeze'];
  }

  const write=XLSX.writeFile.bind(XLSX);
  XLSX.writeFile=function(wb,filename,opts){
    if(filename&&/Management-Report\.xlsx$/i.test(filename)&&wb?.SheetNames){
      wb.SheetNames.forEach(name=>format(wb.Sheets[name],name));
    }
    return write(wb,filename,{cellStyles:true,...(opts||{})});
  };
})();