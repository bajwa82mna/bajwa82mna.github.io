(()=>{
  if(!window.EXTRA?.rows)return;
  const findIndex=card=>{
    const title=card.querySelector('h3')?.textContent||'';
    const print=[...card.querySelectorAll('.journal-meta span')].find(x=>x.textContent.startsWith('Print '))?.textContent.slice(6);
    return RAW.rows.findIndex(r=>r[1]===title&&(!print||print==='—'||r[4]===print));
  };
  const el=(tag,text,className)=>{const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node};
  function addWarning(card,index){
    if(card.dataset.openMetrics)return;card.dataset.openMetrics='1';card.dataset.rowIndex=index;
    const x=EXTRA.rows[index];
    if(x&&x[10])card.querySelector('.status-line')?.prepend(el('span','Warning list '+x[10],'status warning'));
  }
  function enhance(){document.querySelectorAll('.journal-card').forEach(card=>{const index=+card.dataset.rowIndex>=0?+card.dataset.rowIndex:findIndex(card);if(index>=0)addWarning(card,index)})}
  new MutationObserver(enhance).observe(document.getElementById('rows'),{childList:true,subtree:true});document.addEventListener('journal-tool:event',enhance);enhance();
})();
