// ヘッダー（ブランド帯+ナビ）の実際の高さを計測してCSS変数に反映
(function(){
  const header = document.querySelector('.site-header');
  if(!header) return;
  function syncHeaderHeight(){
    document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  }
  syncHeaderHeight();
  addEventListener('resize', syncHeaderHeight, {passive:true});
  addEventListener('load', syncHeaderHeight);
  if(document.fonts && document.fonts.ready){ document.fonts.ready.then(syncHeaderHeight); }
})();

// モバイル：ハンバーガーメニューの開閉（--header-hはナビ開閉で再計測しない＝ヒーローのガタつき防止）
(function(){
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  if(!header || !toggle) return;
  toggle.addEventListener('click', ()=>{
    const open = header.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  header.querySelectorAll('.site-nav a').forEach(a=>{
    a.addEventListener('click', ()=>{
      header.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded','false');
    });
  });
})();

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// スクロールで要素をフェードイン
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){e.target.classList.add('on');io.unobserve(e.target);}
  });
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

// キネティックタイポ（スクロール連動・1文字ずつ）
const kinetics = document.querySelectorAll('.kinetic');
kinetics.forEach(el=>{
  const text = el.textContent;
  el.setAttribute('aria-label', text);
  el.textContent = '';
  [...text].forEach(ch=>{
    const s = document.createElement('span');
    s.textContent = ch;
    s.setAttribute('aria-hidden','true');
    el.appendChild(s);
  });
});
if(reduced){
  kinetics.forEach(el=>[...el.children].forEach(s=>{s.style.opacity=1;s.style.transform='none';}));
}else if(kinetics.length){
  let ticking = false;
  const kinTick = ()=>{
    ticking = false;
    const vh = innerHeight;
    kinetics.forEach(el=>{
      const r = el.getBoundingClientRect();
      if(r.top > vh || r.bottom < 0) return;
      const p = Math.min(Math.max((vh*0.92 - r.top)/(vh*0.5), 0), 1);
      const spans = el.children, n = spans.length;
      for(let i=0;i<n;i++){
        const cp = Math.min(Math.max((p - (i/n)*0.6)/0.4, 0), 1);
        spans[i].style.opacity = cp;
        spans[i].style.transform = `translateY(${((1-cp)*0.55).toFixed(3)}em)`;
      }
    });
  };
  const onScroll = ()=>{ if(!ticking){ticking = true; requestAnimationFrame(kinTick);} };
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', onScroll, {passive:true});
  kinTick();
}

// パララックス（PC・ホバー可能デバイスのみ。モバイル/タッチは通常表示にフォールバック）
(function(){
  const els = [...document.querySelectorAll('[data-parallax]')];
  if(!els.length) return;
  const enable = matchMedia('(min-width:768px)').matches
              && matchMedia('(hover:hover)').matches
              && !reduced;
  if(!enable) return;               // モバイル等は静止（top/heightで自然にクロップ済み）
  let tick = false;
  const update = ()=>{
    tick = false;
    const vh = innerHeight;
    els.forEach(el=>{
      const host = el.parentElement;
      const r = host.getBoundingClientRect();
      if(r.bottom < 0 || r.top > vh) return;
      const factor = parseFloat(el.dataset.parallax) || 0.12;
      const center = r.top + r.height/2;
      const delta = (center - vh/2) / vh;   // 概ね -0.5〜0.5
      el.style.transform = `translate3d(0, ${(delta*factor*100).toFixed(2)}px, 0)`;
    });
  };
  addEventListener('scroll', ()=>{ if(!tick){tick=true; requestAnimationFrame(update);} }, {passive:true});
  addEventListener('resize', ()=>{ if(!tick){tick=true; requestAnimationFrame(update);} }, {passive:true});
  update();
})();

// カーソル追従の金パーティクル（PC・ホバー可能デバイスのみ。アイドル時はrAF停止）
(function(){
  const enable = matchMedia('(min-width:768px)').matches
              && matchMedia('(hover:hover)').matches
              && !reduced;
  if(!enable) return;

  const COLORS = ['#c4974a', '#e8c57a', '#f3ede0'];
  const MAX = 60;

  const canvas = document.createElement('canvas');
  canvas.className = 'gold-particles';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let dpr = Math.min(devicePixelRatio || 1, 2);
  function resize(){
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize, {passive:true});

  let mouseX = 0, mouseY = 0, lastX = 0, lastY = 0, moving = false;
  let particles = [];
  let rafId = null;

  addEventListener('mousemove', (e)=>{
    mouseX = e.clientX; mouseY = e.clientY; moving = true;
    if(!rafId) rafId = requestAnimationFrame(tick);
  }, {passive:true});

  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden && rafId){ cancelAnimationFrame(rafId); rafId = null; }
    else if(!document.hidden && (particles.length || moving) && !rafId){ rafId = requestAnimationFrame(tick); }
  });

  function spawn(x, y){
    if(particles.length >= MAX) return;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.15 + Math.random() * 0.35;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.25,
      size: 1.5 + Math.random() * 2.5,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      life: 0,
      maxLife: 45 + Math.random() * 30,
    });
  }

  function tick(){
    rafId = null;
    ctx.clearRect(0, 0, innerWidth, innerHeight);

    const dx = mouseX - lastX, dy = mouseY - lastY;
    const dist = Math.hypot(dx, dy);
    if(moving && dist > 2){
      const steps = Math.min(3, Math.max(1, Math.round(dist / 12)));
      for(let i = 0; i < steps; i++){
        spawn(lastX + dx * (i + 1) / steps, lastY + dy * (i + 1) / steps);
      }
    }
    lastX = mouseX; lastY = mouseY; moving = false;

    particles = particles.filter(p=>{
      p.life++;
      if(p.life >= p.maxLife) return false;
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.985; p.vy *= 0.985;
      const t = 1 - p.life / p.maxLife;
      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      g.addColorStop(0, p.color);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.globalAlpha = t;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fill();
      return true;
    });
    ctx.globalAlpha = 1;

    if(particles.length) rafId = requestAnimationFrame(tick);
  }
})();
