/* Site-wide theme: auto (follows system) | light | dark. Saved in localStorage as "theme". */
(function(){
  var KEY='theme',root=document.documentElement;
  function get(){try{var v=localStorage.getItem(KEY);return v==='light'||v==='dark'?v:'auto'}catch(e){return 'auto'}}
  function apply(m){
    if(m==='auto')root.removeAttribute('data-theme');else root.setAttribute('data-theme',m);
    var dark=m==='dark'||(m==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);
    var meta=document.querySelector('meta[name=theme-color]');
    if(meta)meta.setAttribute('content',dark?'#0f1712':'#f7f8f4');
  }
  apply(get());
  window.__setTheme=function(m){try{m==='auto'?localStorage.removeItem(KEY):localStorage.setItem(KEY,m)}catch(e){}apply(m);mark(m)};
  function mark(m){document.querySelectorAll('.theme-switch button').forEach(function(b){var on=b.dataset.mode===m;b.setAttribute('aria-pressed',on);b.classList.toggle('on',on)})}
  document.addEventListener('DOMContentLoaded',function(){
    var d=document.createElement('div');d.className='theme-switch';d.setAttribute('role','group');d.setAttribute('aria-label','Colour theme');
    d.innerHTML='<button type="button" data-mode="auto" title="Match system">Auto</button><button type="button" data-mode="light" title="Light mode">Light</button><button type="button" data-mode="dark" title="Dark mode">Dark</button>';
    d.addEventListener('click',function(e){var b=e.target.closest('button');if(b)window.__setTheme(b.dataset.mode)});
    document.body.appendChild(d);mark(get());
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(){if(get()==='auto')apply('auto')});
})();
