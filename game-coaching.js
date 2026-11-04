(() => {
  const style = document.createElement('style');
  style.textContent = `
    .coach-shell{display:grid;gap:16px}.coach-hero{padding:22px;border:1px solid #4a3564;border-radius:18px;background:linear-gradient(125deg,#2b1940,#171320 72%);display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}.coach-hero h2{margin:0 0 5px}.coach-hero p{margin:0;color:#d0c2df}.coach-warning{padding:14px;border:1px solid #9b713b;border-radius:13px;background:#2a2115;color:#f4dfbd;font-size:13px;line-height:1.5}.coach-tabs,.coach-actions{display:flex;gap:8px;flex-wrap:wrap}.coach-tabs button{padding:9px 13px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--text);cursor:pointer}.coach-tabs button.active{background:#392451;color:white}.coach-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.coach-card,.coach-empty{padding:17px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}.coach-card h3{margin:0 0 8px}.coach-price{font-weight:800;color:var(--accent)}.coach-detail{font-size:13px;color:var(--muted);margin:8px 0;white-space:pre-wrap;overflow-wrap:anywhere}.coach-empty{text-align:center;color:var(--muted)}.coach-form{display:grid;grid-template-columns:1fr 1fr;gap:12px}.coach-form label{display:grid;gap:6px;font-size:13px;font-weight:700}.coach-form input,.coach-form textarea{width:100%}.coach-form .wide{grid-column:1/-1}.coach-note{font-size:12px;color:var(--muted);line-height:1.5}@media(max-width:600px){.coach-grid,.coach-form{grid-template-columns:1fr}.coach-form .wide{grid-column:auto}}
  `;
  document.head.appendChild(style);
  let view = 'browse', cache = [];
  const context = () => window.nookCoachingContext?.();
  const toast = message => context()?.showToast?.(message);
  async function openCoaching() {
    const c = context();
    const feed = document.getElementById('feed');
    if (!c || !feed) { toast('Game Coaching is still loading. Please try again.'); return; }
    document.body.classList.remove('jobs-mode');
    view = 'browse';
    feed.innerHTML = '<div class="coach-shell"><div class="coach-hero"><div><h2>🎓 Game Coaching</h2><p>Find a coach or offer coaching for your game.</p></div><button class="primary" id="coachPostTop">＋ Offer coaching</button></div><div class="coach-warning"><b>Payment safety:</b> Nook does not process, collect, or verify payments. Coaches and players arrange payment directly at their own risk. Nook cannot guarantee payments or resolve disputes. Never share passwords or verification codes.</div><div class="coach-tabs"><button class="active" data-coach-view="browse">Browse coaches</button><button data-coach-view="mine">My offers</button></div><input id="coachSearch" type="search" placeholder="Search game titles…"><div id="coachList" class="coach-grid"><div class="coach-empty">Loading offers…</div></div></div>';
    feed.querySelectorAll('[data-coach-view]').forEach(b => b.onclick = () => { view=b.dataset.coachView; feed.querySelectorAll('[data-coach-view]').forEach(x=>x.classList.toggle('active',x===b)); render(); });
    document.getElementById('coachPostTop').onclick = showForm;
    document.getElementById('coachSearch').oninput = render;
    await render();
  }
  async function render() {
    const c=context(), el=document.getElementById('coachList');
    if(!c||!el)return;
    if(!c.currentUser){el.innerHTML='<div class="coach-empty">Sign in to browse or post coaching offers.</div>';return;}
    let q=c.db.from('nook_coaching_offers').select('*').order('created_at',{ascending:false}).limit(100);
    q=view==='mine'?q.eq('host_id',c.currentUser.id):q.eq('status','open');
    const {data,error}=await q;
    if(error){el.innerHTML='<div class="coach-empty">Could not load offers: '+c.esc(error.message)+'</div>';return;}
    cache=data||[];
    const term=(document.getElementById('coachSearch')?.value||'').trim().toLowerCase();
    const items=cache.filter(x=>!term||x.game_title.toLowerCase().includes(term));
    if(!items.length){el.innerHTML='<div class="coach-empty">No coaching offers found.</div>';return;}
    const {data:profiles}=await c.db.from('profiles').select('id,username').in('id',[...new Set(items.map(x=>x.host_id))]);
    const people=new Map((profiles||[]).map(p=>[p.id,p.username]));
    el.innerHTML=items.map(x=>'<article class="coach-card"><h3>'+c.esc(x.game_title)+'</h3><div class="coach-price">$'+Number(x.price_per_hour).toFixed(2)+' / hour</div><div class="coach-detail">Game username: <b>'+c.esc(x.game_username)+'</b></div><div class="coach-detail">'+c.esc(x.details)+'</div><div class="coach-detail">Accepted payments: <b>'+c.esc(x.accepted_payments)+'</b></div><div class="coach-detail">Coach: @'+c.esc(people.get(x.host_id)||'Nook member')+'</div><div class="coach-actions">'+(x.host_id===c.currentUser.id?'<button class="secondary" data-coach-toggle="'+c.esc(x.id)+'">'+(x.status==='open'?'Close offer':'Reopen offer')+'</button><button class="secondary" data-coach-delete="'+c.esc(x.id)+'">Delete</button>':'<button class="primary" data-coach-message="'+c.esc(x.host_id)+'">Message coach</button>')+'</div></article>').join('');
    el.querySelectorAll('[data-coach-message]').forEach(b=>b.onclick=()=>c.startConversation(b.dataset.coachMessage));
    el.querySelectorAll('[data-coach-toggle]').forEach(b=>b.onclick=async()=>{const x=cache.find(y=>y.id===b.dataset.coachToggle);const {error}=await c.db.from('nook_coaching_offers').update({status:x.status==='open'?'closed':'open',updated_at:new Date().toISOString()}).eq('id',x.id).eq('host_id',c.currentUser.id);if(error)toast(error.message);else render();});
    el.querySelectorAll('[data-coach-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this coaching offer?'))return;const {error}=await c.db.from('nook_coaching_offers').delete().eq('id',b.dataset.coachDelete).eq('host_id',c.currentUser.id);if(error)toast(error.message);else render();});
  }
  function showForm() {
    const c=context();if(!c?.currentUser)return toast('Sign in to offer coaching.');
    const back=document.createElement('div');back.className='modalback show';
    back.innerHTML='<div class="modal" role="dialog" aria-modal="true"><h2>Offer game coaching</h2><form class="coach-form"><label>Game title *<input name="game_title" maxlength="100" required placeholder="Rocket League"></label><label>Price per hour (USD) *<input name="price_per_hour" type="number" min="0" max="100000" step="0.01" required></label><label class="wide">Your in-game username *<input name="game_username" maxlength="60" required></label><label class="wide">Coaching details *<textarea name="details" minlength="10" maxlength="2000" required placeholder="What do you teach?"></textarea></label><label class="wide">Accepted payment methods *<input name="accepted_payments" minlength="2" maxlength="300" required placeholder="List payment methods you accept"></label><p class="wide coach-note">Nook does not handle payments. Arrange payment directly at your own risk. Never share passwords or verification codes.</p><div class="wide modalbar"><button type="button" class="secondary" id="coachCancel">Cancel</button><button type="submit" class="primary">Publish offer</button></div></form></div>';
    document.body.appendChild(back);back.addEventListener('click',e=>{if(e.target===back)back.remove();});back.querySelector('#coachCancel').onclick=()=>back.remove();
    back.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),payload={host_id:c.currentUser.id,game_title:String(f.get('game_title')).trim(),price_per_hour:Number(f.get('price_per_hour')),details:String(f.get('details')).trim(),accepted_payments:String(f.get('accepted_payments')).trim(),game_username:String(f.get('game_username')).trim()};if(!Number.isFinite(payload.price_per_hour)||payload.price_per_hour<0)return toast('Enter a valid hourly price.');const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Publishing…';const {error}=await c.db.from('nook_coaching_offers').insert(payload);if(error){toast(error.message);btn.disabled=false;btn.textContent='Publish offer';return;}back.remove();toast('Coaching offer published.');view='mine';render();};
  }
  window.addEventListener('nook-open-coaching',openCoaching);
})();