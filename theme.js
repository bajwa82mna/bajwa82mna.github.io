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
    var bar=document.createElement('div'),inner=document.createElement('div'),d=document.createElement('div');bar.className='site-bar';inner.className='site-bar-inner';d.className='theme-switch';d.setAttribute('role','group');d.setAttribute('aria-label','Colour theme');
    d.innerHTML='<span class="theme-state" aria-live="polite">Theme</span><button type="button" data-mode="auto" aria-label="Use automatic colour theme" title="Match system">Auto</button><button type="button" data-mode="light" aria-label="Use light colour theme" title="Light mode">Light</button><button type="button" data-mode="dark" aria-label="Use dark colour theme" title="Dark mode">Dark</button>';
    d.addEventListener('click',function(e){var b=e.target.closest('button');if(b)window.__setTheme(b.dataset.mode)});
    var home=document.createElement('a');home.className='site-brand';home.href='/';home.setAttribute('aria-label','smbajwa.com home');
    home.innerHTML='<img class="site-logo site-logo-light" src="/assets/logo/logo-horizontal.svg?v=16" alt="smbajwa.com"><img class="site-logo site-logo-dark" src="/assets/logo/logo-dark.svg?v=16" alt="smbajwa.com">';
    inner.append(home,d);bar.append(inner);document.body.prepend(bar);mark(get());
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(){if(get()==='auto')apply('auto')});
})();
