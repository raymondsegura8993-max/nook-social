(() => {
  const style = document.createElement('style');
  style.textContent = `
    .clantry-shell{display:grid;gap:16px}.clantry-hero{padding:22px;border:1px solid #4a3564;border-radius:18px;background:linear-gradient(125deg,#2b1940,#171320 72%);display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}.clantry-hero h2{margin:0 0 5px}.clantry-hero p{margin:0;color:#d0c2df}.clantry-tabs,.clantry-actions{display:flex;gap:8px;flex-wrap:wrap}.clantry-tabs button{padding:9px 13px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--text);cursor:pointer}.clantry-tabs button.active{background:#392451;color:white}.clantry-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.clantry-card,.clantry-empty{padding:17px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}.clantry-card h3{margin:0 0 8px}.clantry-meta{font-size:13px;color:var(--muted);margin:8px 0;white-space:pre-wrap;overflow-wrap:anywhere}.clantry-empty{text-align:center;color:var(--muted)}.clantry-form{display:grid;grid-template-columns:1fr 1fr;gap:12px}.clantry-form label{display:grid;gap:6px;font-size:13px;font-weight:700}.clantry-form input,.clantry-form textarea{width:100%}.clantry-form .wide{grid-column:1/-1}.clantry-note{font-size:12px;color:var(--muted);line-height:1.5}@media(max-width:600px){.clantry-grid,.clantry-form{grid-template-columns:1fr}.clantry-form .wide{grid-column:auto}}
  `;
  document.head.appendChild(style);
  let view = 'browse', cache = [];
  const context = () => window.nookCoachingContext?.();
  const toast = message => context()?.showToast?.(message);
  async function openTryouts() {
    const c = context(), feed = document.getElementById('feed');
    if (!c || !feed) { toast('Clan Tryouts is still loading. Please try again.'); return; }
    document.body.classList.remove('jobs-mode');
    view = 'browse';
    feed.innerHTML = '<div class="clantry-shell"><div class="clantry-hero"><div><h2>🛡️ Clan Tryouts</h2><p>Find a clan to try out for, or recruit players for your clan.</p></div><button class="primary" id="clantryPostTop">＋ Post a tryout</button></div><div class="clantry-tabs"><button class="active" data-clantry-view="browse">Browse tryouts</button><button data-clantry-view="mine">My tryouts</button></div><input id="clantrySearch" type="search" placeholder="Search game titles or clan names…"><div id="clantryList" class="clantry-grid"><div class="clantry-empty">Loading tryouts…</div></div></div>';
    feed.querySelectorAll('[data-clantry-view]').forEach(b => b.onclick = () => { view=b.dataset.clantryView; feed.querySelectorAll('[data-clantry-view]').forEach(x=>x.classList.toggle('active',x===b)); render(); });
    document.getElementById('clantryPostTop').onclick = showForm;
    document.getElementById('clantrySearch').oninput = render;
    await render();
  }
  async function render() {
    const c=context(), el=document.getElementById('clantryList');
    if(!c||!el)return;
    if(!c.currentUser){el.innerHTML='<div class="clantry-empty">Sign in to browse or post clan tryouts.</div>';return;}
    let q=c.db.from('nook_clan_tryouts').select('*').order('created_at',{ascending:false}).limit(100);
    q=view==='mine'?q.eq('host_id',c.currentUser.id):q.eq('status','open');
    const {data,error}=await q;
    if(error){el.innerHTML='<div class="clantry-empty">Could not load tryouts: '+c.esc(error.message)+'</div>';return;}
    cache=data||[];
    const term=(document.getElementById('clantrySearch')?.value||'').trim().toLowerCase();
    const items=cache.filter(x=>!term||x.game_title.toLowerCase().includes(term)||x.clan_name.toLowerCase().includes(term));
    if(!items.length){el.innerHTML='<div class="clantry-empty">No clan tryouts found.</div>';return;}
    const {data:profiles}=await c.db.from('profiles').select('id,username').in('id',[...new Set(items.map(x=>x.host_id))]);
    const people=new Map((profiles||[]).map(p=>[p.id,p.username]));
    el.innerHTML=items.map(x=>'<article class="clantry-card"><h3>'+c.esc(x.clan_name)+'</h3><div class="clantry-meta"><b>Game:</b> '+c.esc(x.game_title)+'</div><div class="clantry-meta"><b>Tryout username:</b> '+c.esc(x.tryout_username)+'</div>'+(x.details?'<div class="clantry-meta">'+c.esc(x.details)+'</div>':'')+'<div class="clantry-meta">Posted by @'+c.esc(people.get(x.host_id)||'Nook member')+'</div><div class="clantry-actions">'+(x.host_id===c.currentUser.id?'<button class="secondary" data-clantry-toggle="'+c.esc(x.id)+'">'+(x.status==='open'?'Close tryout':'Reopen tryout')+'</button><button class="secondary" data-clantry-delete="'+c.esc(x.id)+'">Delete</button>':'<button class="primary" data-clantry-message="'+c.esc(x.host_id)+'">Message clan</button>')+'</div></article>').join('');
    el.querySelectorAll('[data-clantry-message]').forEach(b=>b.onclick=()=>c.startConversation(b.dataset.clantryMessage));
    el.querySelectorAll('[data-clantry-toggle]').forEach(b=>b.onclick=async()=>{const x=cache.find(y=>y.id===b.dataset.clantryToggle);const {error}=await c.db.from('nook_clan_tryouts').update({status:x.status==='open'?'closed':'open',updated_at:new Date().toISOString()}).eq('id',x.id).eq('host_id',c.currentUser.id);if(error)toast(error.message);else render();});
    el.querySelectorAll('[data-clantry-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this clan tryout?'))return;const {error}=await c.db.from('nook_clan_tryouts').delete().eq('id',b.dataset.clantryDelete).eq('host_id',c.currentUser.id);if(error)toast(error.message);else render();});
  }
  function showForm() {
    const c=context();if(!c?.currentUser)return toast('Sign in to post a clan tryout.');
    const back=document.createElement('div');back.className='modalback show';
    back.innerHTML='<div class="modal" role="dialog" aria-modal="true"><h2>Post a clan tryout</h2><form class="clantry-form"><label>Game title *<input name="game_title" maxlength="100" required placeholder="Rocket League"></label><label>Clan name *<input name="clan_name" maxlength="80" required placeholder="Your clan name"></label><label class="wide">Clan tryout username *<input name="tryout_username" maxlength="60" required placeholder="Your in-game username"></label><label class="wide">Tryout details (optional)<textarea name="details" maxlength="1500" placeholder="Requirements, region, platform, roles, or how to try out"></textarea></label><p class="wide clantry-note">Only share your in-game username. Never share account passwords, recovery codes, or personal contact information.</p><div class="wide modalbar"><button type="button" class="secondary" id="clantryCancel">Cancel</button><button type="submit" class="primary">Publish tryout</button></div></form></div>';
    document.body.appendChild(back);back.addEventListener('click',e=>{if(e.target===back)back.remove();});back.querySelector('#clantryCancel').onclick=()=>back.remove();
    back.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),payload={host_id:c.currentUser.id,game_title:String(f.get('game_title')).trim(),clan_name:String(f.get('clan_name')).trim(),tryout_username:String(f.get('tryout_username')).trim(),details:String(f.get('details')).trim()};const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Publishing…';const {error}=await c.db.from('nook_clan_tryouts').insert(payload);if(error){toast(error.message);btn.disabled=false;btn.textContent='Publish tryout';return;}back.remove();toast('Clan tryout published.');view='mine';render();};
  }
  window.addEventListener('nook-open-clan-tryouts',openTryouts);
})();