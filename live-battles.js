/* Nook LIVE Battles — free-for-all creator battles */
(function(){
  const style=document.createElement('style');
  style.textContent=`
  .nook-battle-wrap{display:grid;gap:14px}
  .nook-battle-card{background:#17131f;border:1px solid #40334f;border-radius:16px;padding:15px}
  .nook-battle-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
  .nook-battle-row{display:flex;align-items:center;gap:10px;justify-content:space-between;padding:10px 0;border-bottom:1px solid #33283f}
  .nook-battle-row:last-child{border-bottom:0}
  .nook-battle-muted{color:#a39aae;font-size:13px}
  .nook-battle-video{width:100%;aspect-ratio:16/9;background:#09070d;border-radius:12px;object-fit:cover}
  .nook-battle-score{font-size:25px;font-weight:850;color:#d4aaff}
  .nook-battle-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  .nook-battle-chat{height:170px;overflow:auto;background:#100d16;border:1px solid #292335;border-radius:10px;padding:9px;margin:10px 0}
  .nook-battle-chatline{font-size:13px;margin:5px 0;overflow-wrap:anywhere}
  .nook-battle-chatline b{color:#d2aaff}
  .nook-battle-timer{font-size:22px;font-weight:800;color:#f1d8ff}
  `;
  document.head.appendChild(style);
  let battleRooms=[],battleChannel=null,battleTimer=null,battleTimers={},battleRefreshBusy=false,currentBattleWatch=null;
  const byId=id=>document.getElementById(id);
  const mk=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;};
  const btn=(txt,cls,fn)=>{const b=mk('button',cls||'secondary',txt);b.type='button';b.onclick=fn;return b;};
  const box=(title,desc)=>{const e=mk('section','nook-battle-card');if(title)e.append(mk('h3','',title));if(desc)e.append(mk('p','nook-battle-muted',desc));return e;};
  async function stopBattleWatch(keepChannel=false){
    if(!keepChannel&&battleChannel){try{await db.removeChannel(battleChannel);}catch(_){}battleChannel=null;}
    await Promise.all(battleRooms.map(r=>r.disconnect().catch(()=>{})));battleRooms=[];
    currentBattleWatch=null;
  }
  function profileName(p){return p?.display_name||p?.username||'Creator';}
  async function getOwnLive(){
    const r=await db.from('live_streams').select('id,host_id,title,room_name,status,created_at').eq('host_id',currentUser.id).eq('status','live').order('created_at',{ascending:false}).limit(1).maybeSingle();
    return r.data||null;
  }
  async function getProfiles(ids){
    const clean=[...new Set(ids.filter(Boolean))];if(!clean.length)return new Map();
    const r=await db.from('profiles').select('id,username,display_name,avatar_url').in('id',clean);
    return new Map((r.data||[]).map(p=>[p.id,p]));
  }
  async function battleRows(battleId){
    const [p,l,c]=await Promise.all([
      db.from('nook_live_battle_participants').select('id,battle_id,user_id,live_stream_id,invite_status,accepted_at').eq('battle_id',battleId).order('created_at'),
      db.from('nook_live_battle_likes').select('creator_id,viewer_id').eq('battle_id',battleId),
      db.from('nook_live_battle_chat').select('id,user_id,message,created_at').eq('battle_id',battleId).order('created_at',{ascending:true}).limit(100)
    ]);
    if(p.error||l.error||c.error)throw new Error(p.error?.message||l.error?.message||c.error?.message);
    return {participants:p.data||[],likes:l.data||[],chat:c.data||[]};
  }
  async function finishBattle(battle){
    const likes=await db.from('nook_live_battle_likes').select('creator_id').eq('battle_id',battle.id);
    if(likes.error)return showToast(likes.error.message);
    const scores={};(likes.data||[]).forEach(x=>scores[x.creator_id]=(scores[x.creator_id]||0)+1);
    const top=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
    const winner=top.length&&(!top[1]||top[0][1]>top[1][1])?top[0][0]:null;
    const done=await db.from('nook_live_battles').update({status:'completed',finished_at:new Date().toISOString(),winner_user_id:winner}).eq('id',battle.id).eq('host_id',currentUser.id).eq('status','live');
    if(done.error)return showToast('Could not finish battle: '+done.error.message);
    showToast(winner?'Battle finished! The winner has been recorded.':'Battle finished in a tie!');
    await loadNookLiveBattles();
  }
  async function createBattlePanel(parent){
    const own=await getOwnLive();
    const create=box('🔴 Start a LIVE Battle','Battles are only available while your own livestream is active. Compete against 1–4 other creators using free likes.');
    const form=mk('form');form.style.cssText='display:grid;gap:9px;margin-top:10px';
    const title=mk('input','dm-search');title.name='title';title.maxLength=100;title.minLength=3;title.required=true;title.placeholder='Battle title';
    const duration=mk('select','dm-search');duration.name='duration_seconds';
    [['60','1 minute'],['120','2 minutes'],['180','3 minutes'],['300','5 minutes'],['600','10 minutes'],['900','15 minutes'],['1800','30 minutes'],['3600','60 minutes']].forEach(([v,l])=>{const o=mk('option','',l);o.value=v;if(v==='300')o.selected=true;duration.append(o);});
    const submit=mk('button','primary','Create battle lobby');submit.type='submit';submit.disabled=!own;
    form.append(title,mk('label','nook-battle-muted','Battle name'),duration,submit);
    create.append(form);
    const note=mk('div','nook-battle-muted',own?'You are LIVE as '+(own.title||'your stream')+'. Invite up to five other creators who are also live.':'Go to the Live tab and start your livestream first. The battle button unlocks automatically when your stream is live.');
    create.append(note);parent.append(create);
    form.onsubmit=async e=>{
      e.preventDefault();if(!own)return showToast('Start your livestream before creating a battle.');
      submit.disabled=true;submit.textContent='Creating…';
      try{
        const check=await getOwnLive();if(!check||check.id!==own.id)throw new Error('Your livestream is no longer active.');
        const ins=await db.from('nook_live_battles').insert({host_id:currentUser.id,host_stream_id:own.id,title:title.value.trim(),duration_seconds:Number(duration.value),status:'inviting'}).select('id').single();
        if(ins.error)throw ins.error;
        const host=await db.from('nook_live_battle_participants').insert({battle_id:ins.data.id,user_id:currentUser.id,live_stream_id:own.id,invite_status:'accepted',accepted_at:new Date().toISOString()});
        if(host.error){await db.from('nook_live_battles').delete().eq('id',ins.data.id);throw host.error;}
        showToast('Battle lobby created! Invite live creators.');
        await loadNookLiveBattles();
      }catch(err){showToast('Could not create battle: '+(err.message||err));}
      finally{submit.disabled=!own;submit.textContent='Create battle lobby';}
    };
  }
  async function renderBattleCard(parent,battle,allLive){
    const data=await battleRows(battle.id);
    card.dataset.battleId=battle.id;
    const visibleParticipants=battle.status==='live'?data.participants.filter(x=>x.invite_status==='accepted'):data.participants;
    const names=await getProfiles([...data.participants.map(x=>x.user_id),...data.chat.map(x=>x.user_id)]);
    const card=box((battle.status==='live'?'🔴 LIVE · ':'')+battle.title,'Hosted by @'+(names.get(battle.host_id)?.username||'creator')+' · '+(battle.duration_seconds/60)+' minute timer');
    const list=mk('div','nook-battle-grid');
    visibleParticipants.forEach(p=>{
      const person=names.get(p.user_id)||{};
      const score=data.likes.filter(l=>l.creator_id===p.user_id).length;
      const tile=mk('div','nook-battle-card');tile.style.padding='11px';
      tile.append(mk('b','', '@'+(person.username||'creator')),mk('div','nook-battle-score',score.toLocaleString()+' ♥'),mk('div','nook-battle-muted',p.invite_status==='accepted'?'In battle':p.invite_status==='invited'?'Invitation sent':p.invite_status));
      if(battle.status==='live'&&p.user_id!==currentUser.id){
        const already=data.likes.some(l=>l.creator_id===p.user_id&&l.viewer_id===currentUser.id);
        const like=btn(already?'Liked ✓':'♥ Like once','follow',async()=>{
          like.disabled=true;
          const r=await db.from('nook_live_battle_likes').insert({battle_id:battle.id,creator_id:p.user_id,viewer_id:currentUser.id});
          if(r.error){like.disabled=false;showToast(r.error.code==='23505'?'You already liked this creator in this battle.':r.error.message);return;}
          like.textContent='Liked ✓';await refreshBattleCard(battle.id,card,battle);
        });
        like.disabled=already;tile.append(like);
      }
      list.append(tile);
    });
    card.append(list);
    const accepted=data.participants.filter(x=>x.invite_status==='accepted');
    if(battle.status==='inviting'){
      card.append(mk('p','nook-battle-muted',accepted.length+' of 2–6 creators accepted. All creators must still be live to start.'));
      if(battle.host_id===currentUser.id){
        const live=allLive||[];
        const invited=new Set(data.participants.map(x=>x.user_id));
        const inviteBox=mk('div','nook-battle-card');inviteBox.style.marginTop='10px';inviteBox.append(mk('b','','Invite creators who are LIVE'));
        live.filter(s=>s.host_id!==currentUser.id&&!invited.has(s.host_id)).forEach(s=>{
          const row=mk('div','nook-battle-row');const p=mk('span','','@'+(s.username||'creator')+' · '+s.title);const b=btn('Invite','follow',async()=>{
            b.disabled=true;const r=await db.from('nook_live_battle_participants').insert({battle_id:battle.id,user_id:s.host_id,live_stream_id:s.id,invite_status:'invited'});
            if(r.error){b.disabled=false;showToast(r.error.message);return;}showToast('Invitation sent.');await loadNookLiveBattles();
          });row.append(p,b);inviteBox.append(row);
        });
        card.append(inviteBox);
        if(accepted.length>=2){card.append(btn('Start battle now','primary',async()=>{
          const streams=await db.from('live_streams').select('id,host_id,status').in('id',accepted.map(x=>x.live_stream_id));
          if(streams.error)return showToast(streams.error.message);
          if((streams.data||[]).length!==accepted.length||(streams.data||[]).some(x=>x.status!=='live'))return showToast('Every accepted creator must still be LIVE.');
          const now=new Date();const end=new Date(now.getTime()+battle.duration_seconds*1000);
          const r=await db.from('nook_live_battles').update({status:'live',started_at:now.toISOString(),ends_at:end.toISOString()}).eq('id',battle.id).eq('host_id',currentUser.id);
          if(r.error)return showToast(r.error.message);showToast('LIVE Battle started!');await loadNookLiveBattles();
        }) );}
      }else{
        const mine=data.participants.find(x=>x.user_id===currentUser.id);
        if(mine?.invite_status==='invited'){
          const actions=mk('div','nook-battle-actions');
          actions.append(btn('Accept invitation','primary',async()=>{
            const own=await getOwnLive();if(!own||own.id!==mine.live_stream_id)return showToast('You must be LIVE on the invited stream to accept.');
            const r=await db.from('nook_live_battle_participants').update({invite_status:'accepted',accepted_at:new Date().toISOString()}).eq('id',mine.id).eq('user_id',currentUser.id);
            if(r.error)return showToast(r.error.message);showToast('You joined the battle!');await loadNookLiveBattles();
          }),btn('Decline','secondary',async()=>{
            const r=await db.from('nook_live_battle_participants').update({invite_status:'declined'}).eq('id',mine.id).eq('user_id',currentUser.id);
            if(r.error)return showToast(r.error.message);await loadNookLiveBattles();
          }));
          card.append(actions);
        }
      }
    }
    if(battle.status==='live'){
      const timer=mk('div','nook-battle-timer','Time remaining: …');card.append(timer);
      const updateTimer=async()=>{
        const left=Math.max(0,Math.ceil((new Date(battle.ends_at).getTime()-Date.now())/1000));
        timer.textContent='Time remaining: '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
        if(left<=0&&battle.host_id===currentUser.id){clearInterval(battleTimer);await finishBattle(battle);}
      };
      if(battleTimers[battle.id])clearInterval(battleTimers[battle.id]);updateTimer();battleTimers[battle.id]=setInterval(updateTimer,1000);
      card.append(btn('Watch battle streams','primary',()=>watchBattle(battle.id,card)));
      if(battle.host_id===currentUser.id)card.append(btn('End battle early','secondary',()=>finishBattle(battle)));
      const chat=mk('div','nook-battle-chat');data.chat.forEach(m=>{const line=mk('div','nook-battle-chatline');const p=names.get(m.user_id);const b=mk('b','', '@'+(p?.username||'member')+': ');line.append(b,document.createTextNode(m.message));chat.append(line);});
      card.append(mk('b','','Battle chat'),chat);
      const chatForm=mk('form');chatForm.style.cssText='display:flex;gap:7px';
      const input=mk('input','dm-search');input.style.margin='0';input.maxLength=300;input.placeholder='Say something…';
      const send=mk('button','primary','Send');send.type='submit';chatForm.append(input,send);
      chatForm.onsubmit=async e=>{e.preventDefault();const message=input.value.trim();if(!message)return;send.disabled=true;const r=await db.from('nook_live_battle_chat').insert({battle_id:battle.id,user_id:currentUser.id,message});send.disabled=false;if(r.error)return showToast(r.error.message);input.value='';await refreshBattleCard(battle.id,card,battle);};
      card.append(chatForm);
    }
    if(battle.status==='completed'){
      const winner=battle.winner_user_id?names.get(battle.winner_user_id):null;
      card.append(mk('p','nook-battle-muted',winner?'🏆 Winner: @'+(winner.username||'creator'):'Battle ended in a tie.'));
      if(battle.host_id===currentUser.id)card.append(btn('Rematch · create new lobby','primary',async()=>{
        const own=await getOwnLive();if(!own)return showToast('Go LIVE again before starting a rematch.');
        const r=await db.from('nook_live_battles').insert({host_id:currentUser.id,host_stream_id:own.id,title:battle.title+' · Rematch',duration_seconds:battle.duration_seconds,status:'inviting'}).select('id').single();
        if(r.error)return showToast(r.error.message);
        const h=await db.from('nook_live_battle_participants').insert({battle_id:r.data.id,user_id:currentUser.id,live_stream_id:own.id,invite_status:'accepted',accepted_at:new Date().toISOString()});
        if(h.error)return showToast(h.error.message);showToast('Rematch lobby created. Invite everyone again.');await loadNookLiveBattles();
      }));
    }
    parent.append(card);
  }
  async function refreshBattleCard(id,card,battle){
    if(!card?.isConnected)return;
    const data=await battleRows(id);const names=await getProfiles(data.chat.map(x=>x.user_id));
    card.querySelectorAll('.nook-battle-grid .nook-battle-card').forEach((tile,i)=>{const p=(battle.status==='live'?data.participants.filter(x=>x.invite_status==='accepted'):data.participants)[i];if(!p)return;const score=data.likes.filter(x=>x.creator_id===p.user_id).length;const el=tile.querySelector('.nook-battle-score');if(el)el.textContent=score.toLocaleString()+' ♥';});
    const chat=card.querySelector('.nook-battle-chat');if(chat){chat.innerHTML='';data.chat.forEach(m=>{const line=mk('div','nook-battle-chatline');line.append(mk('b','', '@'+(names.get(m.user_id)?.username||'member')+': '),document.createTextNode(m.message));chat.append(line);});chat.scrollTop=chat.scrollHeight;}
  }
  async function refreshBattleCards(){
    const cards=document.querySelectorAll('[data-battle-id]');
    for(const card of cards){const id=card.dataset.battleId;await refreshBattleCard(id,card,{status:card.textContent.includes('LIVE')?'live':'inviting'});}
  }
  async function watchBattle(id,card){
    await stopBattleWatch(true);currentBattleWatch=id;
    const stage=mk('section','nook-battle-card');stage.append(mk('h3','','LIVE battle streams'));
    const grid=mk('div','nook-battle-grid');stage.append(grid);
    const close=btn('Stop watching','secondary',stopBattleWatch);stage.append(close);card.append(stage);
    const p=await db.from('nook_live_battle_participants').select('user_id,live_stream_id,invite_status').eq('battle_id',id).eq('invite_status','accepted');
    if(p.error){grid.textContent=p.error.message;return;}
    const ids=p.data.map(x=>x.user_id);const names=await getProfiles(ids);
    const streams=await db.from('live_streams').select('id,host_id,title,room_name,status').in('id',p.data.map(x=>x.live_stream_id)).eq('status','live');
    if(streams.error){grid.textContent=streams.error.message;return;}
    for(const stream of streams.data||[]){
      const tile=mk('div','nook-battle-card');tile.style.padding='10px';tile.append(mk('b','','@'+(names.get(stream.host_id)?.username||'creator')));
      if(stream.host_id===currentUser.id){tile.append(mk('p','nook-battle-muted','Your camera is already broadcasting in the Live tab.'));grid.append(tile);continue;}
      const video=mk('div','');video.style.cssText='position:relative;min-height:125px;background:#09070d;border-radius:12px;overflow:hidden';tile.append(video);
      const mute=btn('Enable audio','secondary',()=>{});tile.append(mute);grid.append(tile);
      try{
        const token=await db.functions.invoke('nook-live-token',{body:{stream_id:stream.id,role:'viewer'}});
        if(token.error||!token.data?.participant_token)throw new Error(token.data?.error||token.error?.message||'Could not join stream.');
        const LK=await import('https://esm.sh/livekit-client@2.23.0');
        const room=new LK.Room({adaptiveStream:true,dynacast:true});battleRooms.push(room);
        let audioEls=[];
        const attach=track=>{const el=track.attach();if(track.kind==='video'){el.className='nook-battle-video';video.append(el);}else{el.muted=true;el.autoplay=true;audioEls.push(el);tile.append(el);}};
        room.on(LK.RoomEvent.TrackSubscribed,attach);
        room.on(LK.RoomEvent.TrackUnsubscribed,track=>track.detach().forEach(el=>el.remove()));
        await room.connect(token.data.server_url,token.data.participant_token);
        mute.onclick=()=>{const enable=audioEls.some(x=>x.muted);battleRooms.forEach(()=>{});audioEls.forEach(x=>x.muted=!enable);mute.textContent=enable?'Mute audio':'Enable audio';};
      }catch(err){video.textContent='Stream unavailable: '+err.message;video.className='nook-battle-muted';}
    }
  }
  async function loadNookLiveBattles(){
    await stopBattleWatch();
    Object.values(battleTimers).forEach(clearInterval);battleTimers={};
    feed.innerHTML='<div class="profile-panel"><button class="secondary" id="liveBattlesBack">← Back to Studio</button><h2 style="margin-top:14px">🔴 Nook LIVE Battles</h2><p class="nook-battle-muted">Free-for-all battles for 2–5 creators who are already LIVE. Viewers can give each creator one free like per battle. No money or gifts.</p><div id="nookLiveBattleContent" class="nook-battle-wrap">Loading LIVE Battles…</div></div>';
    byId('liveBattlesBack').onclick=loadNookStudio;
    await renderLiveBattleContent();
    battleChannel=db.channel('nook-live-battles-updates').on('postgres_changes',{event:'*',schema:'public',table:'nook_live_battle_likes'},()=>refreshBattleCards()).on('postgres_changes',{event:'*',schema:'public',table:'nook_live_battle_participants'},()=>renderLiveBattleContent()).on('postgres_changes',{event:'*',schema:'public',table:'nook_live_battle_chat'},()=>refreshBattleCards()).on('postgres_changes',{event:'*',schema:'public',table:'nook_live_battles'},()=>renderLiveBattleContent()).subscribe();
  }
  async function renderLiveBattleContent(){
    const root=byId('nookLiveBattleContent');if(!root||battleRefreshBusy)return; battleRefreshBusy=true;
    try{
      root.innerHTML='';
      const own=await getOwnLive();await createBattlePanel(root);
      const invites=await db.from('nook_live_battle_participants').select('id,battle_id,live_stream_id,created_at').eq('user_id',currentUser.id).eq('invite_status','invited').order('created_at',{ascending:false});
      if(invites.error)throw invites.error;
      if(invites.data?.length){
        const section=box('📨 Battle invitations','You must still be LIVE on the invited stream to accept.');
        for(const invite of invites.data){
          const b=await db.from('nook_live_battles').select('*').eq('id',invite.battle_id).maybeSingle();if(!b.data||b.data.status!=='inviting')continue;
          const row=mk('div','nook-battle-row','Invitation: '+b.data.title);
          row.append(btn('Open invitation','follow',async()=>{const all=await db.from('nook_live_battle_participants').select('*').eq('battle_id',invite.battle_id);const profiles=await getProfiles((all.data||[]).map(x=>x.user_id));const live=await db.from('live_streams').select('id,host_id,title').eq('status','live');const fake=mk('div','nook-battle-card');await renderBattleCard(fake,b.data,(live.data||[]).map(x=>({...x,username:profiles.get(x.host_id)?.username})));root.prepend(fake);}));
          section.append(row);
        }
        root.append(section);
      }
      const liveRes=await db.from('live_streams').select('id,host_id,title,status').eq('status','live').order('created_at',{ascending:false}).limit(50);
      const profiles=await getProfiles((liveRes.data||[]).map(x=>x.host_id));
      const live=(liveRes.data||[]).map(x=>({...x,username:profiles.get(x.host_id)?.username||'creator'}));
      const battles=await db.from('nook_live_battles').select('*').in('status',['inviting','live','completed']).order('created_at',{ascending:false}).limit(40);
      if(battles.error)throw battles.error;
      const mine=(battles.data||[]).filter(b=>b.host_id===currentUser.id);
      const joined=await db.from('nook_live_battle_participants').select('battle_id,user_id,invite_status').eq('user_id',currentUser.id).in('battle_id',(battles.data||[]).map(b=>b.id));
      const myIds=new Set((joined.data||[]).filter(x=>x.invite_status!=='declined').map(x=>x.battle_id));
      const relevant=(battles.data||[]).filter(b=>b.host_id===currentUser.id||myIds.has(b.id)||b.status==='live'||b.status==='completed').slice(0,20);
      const section=box('⚔️ Battles','Live battles are shown first. Completed battles stay in your history.');
      for(const b of relevant){await renderBattleCard(section,b,live);}
      if(!relevant.length)section.append(mk('p','nook-battle-muted','No battles yet. Start your livestream to create one.'));
      root.append(section);
      const top=await db.from('nook_live_battle_likes').select('creator_id').limit(5000);
      if(!top.error){
        const counts={};(top.data||[]).forEach(x=>counts[x.creator_id]=(counts[x.creator_id]||0)+1);
        const leaders=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10);
        const people=await getProfiles(leaders.map(x=>x[0]));
        const board=box('🏆 LIVE Battle leaderboard','Total free likes received across battles.');
        leaders.forEach(([id,n],i)=>board.append(mk('div','nook-battle-row',(i+1)+'. @'+(people.get(id)?.username||'creator')+' — '+n+' likes')));
        if(!leaders.length)board.append(mk('p','nook-battle-muted','No battle likes yet.'));
        root.append(board);
      }
      if(own)root.prepend(mk('p','nook-battle-muted','Your livestream is active. You can create a battle now.'));
    }catch(err){root.append(mk('p','nook-battle-muted','Could not load battles: '+(err.message||err)));}
    finally{battleRefreshBusy=false;}
  }
  async function refreshCurrentBattle(){
    if(!currentBattleWatch)return;
    const id=currentBattleWatch;
    const root=byId('nookLiveBattleContent');if(root)await renderLiveBattleContent();
  }
  const originalLoadLive=loadLive;
  loadLive=async function(){
    await stopBattleWatch();
    await originalLoadLive();
    const panel=box('🔴 Nook LIVE Battles','Compete with 2–5 creators while everyone is LIVE. Free likes decide the winner.');
    const open=btn('Open LIVE Battles','primary',loadNookLiveBattles);panel.append(open);feed.append(panel);
  };
  loadNookBattles=loadNookLiveBattles;
  window.addEventListener('beforeunload',()=>{battleRooms.forEach(r=>r.disconnect());Object.values(battleTimers).forEach(clearInterval);});
})();
