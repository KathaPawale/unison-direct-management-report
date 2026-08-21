/* Excel report formatting: clean management-report layout with OUTSIDE borders only. */
'use strict';
(function(){
  const LINE='9EADBC'; const side={style:'thin',color:{rgb:LINE}};
  const clone=x=>x?JSON.parse(JSON.stringify(x)):{};
  const addr=(r,c)=>XLSX.utils.encode_cell({r,c});
  function ensure(ws,r,c){const a=addr(r,c);if(!ws[a])ws[a]={t:'s',v:''};return ws[a];}
  function clearBorders(ws,rg){for(let r=rg.s.r;r<=rg.e.r;r++)for(let c=rg.s.c;c<=rg.e.c;c++){const x=ws[addr(r,c)];if(x?.s){const s=clone(x.s);delete s.border;x.s=s;}}}
  function border(ws,r,c,k){const x=ensure(ws,r,c),s=clone(x.s);s.border=clone(s.border);s.border[k]=side;x.s=s;}
  function outside(ws,t,l,b,rr){for(let c=l;c<=rr;c++){border(ws,t,c,'top');border(ws,b,c,'bottom');}for(let r=t;r<=b;r++){border(ws,r,l,'left');border(ws,r,rr,'right');}}
  function format(ws,name){
    if(!ws?.['!ref'])return;const rg=XLSX.utils.decode_range(ws['!ref']);clearBorders(ws,rg);
    const cover=name==='Cover',notes=name==='Notes'||name==='Disclaimer';
    if(cover){ws['!cols']=[{wch:54},...Array(rg.e.c).fill(0).map(()=>({wch:13}))];outside(ws,1,0,Math.min(7,rg.e.r),rg.e.c);return;}
    if(notes){ws['!cols']=[{wch:105}];outside(ws,rg.s.r,rg.s.c,rg.e.r,rg.e.c);return;}
    ws['!cols']=Array.from({length:rg.e.c+1},(_,c)=>({wch:c===0?42:16}));
    ws['!rows']=ws['!rows']||[];for(let r=rg.s.r;r<=rg.e.r;r++)ws['!rows'][r]={...(ws['!rows'][r]||{}),hpt:r<=4?22:18};
    const top=name==='Analytical Summary'?2:Math.min(4,rg.e.r);outside(ws,top,0,rg.e.r,rg.e.c);
    delete ws['!autofilter'];delete ws['!freeze'];
    for(let r=top+1;r<=rg.e.r;r++)for(let c=1;c<=rg.e.c;c++){const x=ws[addr(r,c)];if(x&&typeof x.v==='number'){const s=clone(x.s);s.numFmt='#,##0.00;[Red](#,##0.00)';x.s=s;}}
  }
  const write=XLSX.writeFile.bind(XLSX);
  XLSX.writeFile=function(wb,filename,opts){if(filename&&/Management-Report\.xlsx$/i.test(filename))(wb.SheetNames||[]).forEach(n=>format(wb.Sheets[n],n));return write(wb,filename,{cellStyles:true,...(opts||{})});};
})();