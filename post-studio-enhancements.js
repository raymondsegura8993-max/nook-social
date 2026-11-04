(()=>{'use strict';
const $=id=>document.getElementById(id),modal=$('modal'),title=$('postTitle'),desc=$('postDescription'),body=$('postText');
if(!modal||!title||!desc||!body||$('nookAdvancedStudio'))return;
const style=document.createElement('style');style.textContent=`
.nook-enhance{margin:16px 0;padding:18px;border:1px solid #40344f;border-radius:16px;background:linear-gradient(145deg,#1b1625,#15111d);color:#eee}
.nook-enhance button,.nook-enhance select,.nook-enhance input{font:inherit}
.nook-enhance button{border:1px solid #51435f;border-radius:9px;padding:9px 12px;background:#282033;color:#f5efff;cursor:pointer;transition:background .15s,border-color .15s}
.nook-enhance button:hover{border-color:#a66bff;background:#38294b}
.nook-enhance select,.nook-enhance input[type=text],.nook-enhance input[type=color]{background:#211a2c;color:#fff;border:1px solid #51435f;border-radius:9px;padding:9px;max-width:100%;min-height:38px}
.nook-enhance-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:11px;align-items:end;margin-top:12px}
.nook-enhance small{color:#b7a9c6;line-height:1.5}.nook-advanced-panel[hidden]{display:none!important}
.nook-enhance label{display:grid;gap:6px;font-size:12px;font-weight:650;color:#cfc2dc;min-width:0}
.nook-enhance .nook-tool-section{margin-top:14px;padding:15px;border:1px solid #382d46;border-radius:13px;background:#191421}
.nook-enhance .nook-tool-section:first-child{margin-top:14px}
.nook-enhance .nook-tool-title{font-size:13px;font-weight:800;color:#f2eaff;letter-spacing:.15px}
.nook-enhance .nook-tool-description{display:block;margin-top:3px;font-size:11px;color:#a99bb9}
.nook-enhance .nook-tool-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.nook-enhance .nook-tool-actions button{min-height:37px}
.nook-enhance .nook-sticker-tray{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
.nook-enhance .nook-sticker-tray button{font-size:20px;padding:5px 10px;min-width:42px}
.nook-preview-card.preview-mobile{max-width:360px;margin:auto}
.nook-photo-tools{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px;margin-top:12px}
.nook-photo-tools input{width:100%}.nook-auto-state{font-size:11px;color:#bba9ce}
@media(max-width:520px){.nook-enhance{padding:13px}.nook-enhance .nook-tool-section{padding:12px}.nook-enhance-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.nook-enhance label{font-size:11px}}
`;document.head.appendChild(style);document.head.appendChild(style);
const panel=document.createElement('section');panel.id='nookAdvancedStudio';panel.className='nook-enhance';panel.innerHTML=`
<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
 <div><b style="font-size:15px">✨ Advanced editor</b><div><small>Optional tools to personalize your post.</small></div></div>
 <button type="button" id="nookAdvancedToggle">Show tools</button>
</div>
<div id="nookAdvancedPanel" class="nook-advanced-panel" hidden>
 <section class="nook-tool-section">
  <div class="nook-tool-title">Text appearance</div><small class="nook-tool-description">Choose how selected text looks.</small>
  <div class="nook-enhance-grid">
   <label>Font<select id="nookFont"><option value="system">System</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></label>
   <label>Text size<select id="nookSize"><option value="small">Small</option><option value="normal" selected>Normal</option><option value="large">Large</option><option value="huge">Extra large</option></select></label>
   <label>Text color<input id="nookColor" type="color" value="#ffffff"></label>
   <label>Highlight color<input id="nookHighlight" type="color" value="#8b5cf6"></label>
   <label>Alignment<select id="nookAlign"><option>left</option><option>center</option><option>right</option></select></label>
  </div>
  <div class="nook-tool-actions"><button type="button" id="nookApplyStyle">Apply to selected text</button><button type="button" id="nookSpell">Spellcheck: on</button><button type="button" id="nookQuote">Add quote marks</button><button type="button" id="nookDivider">Insert divider</button></div>
 </section>
 <section class="nook-tool-section">
  <div class="nook-tool-title">Post layout</div><small class="nook-tool-description">Start with a template or organize your writing.</small>
  <div class="nook-enhance-grid">
   <label>Template<select id="nookTemplate"><option value="">Choose a template…</option><option value="gaming">Gaming update</option><option value="announcement">Announcement</option><option value="question">Community question</option><option value="creator">Creator update</option><option value="review">Game review</option></select></label>
   <label>Preview size<select id="nookPreviewMode"><option value="desktop">Desktop preview</option><option value="mobile">Mobile preview</option></select></label>
  </div>
  <div class="nook-tool-actions"><button type="button" id="nookUseTemplate">Use template</button><button type="button" id="nookAddBlock">Add section</button><button type="button" id="nookMoveUp">Move line ↑</button><button type="button" id="nookMoveDown">Move line ↓</button><button type="button" id="nookRemoveBlock">Remove last line</button></div>
 </section>
 <section class="nook-tool-section">
  <div class="nook-tool-title">Stickers &amp; reactions</div><small class="nook-tool-description">Add a little personality to your post.</small>
  <div class="nook-sticker-tray" id="nookStickers"></div>
 </section>
 <section class="nook-tool-section">
  <div class="nook-tool-title">Accessibility &amp; autosave</div><small class="nook-tool-description">Describe your image and keep a draft on this device.</small>
  <div class="nook-enhance-grid"><label>Image description<input type="text" id="nookAltText" maxlength="250" placeholder="Briefly describe your image"></label><span id="nookAutoState" class="nook-auto-state">Autosave on this device</span></div>
 </section>
 <section class="nook-tool-section" id="nookPhotoPanel" hidden>
  <div class="nook-tool-title">Photo editor</div><small class="nook-tool-description">Adjust your selected image before publishing.</small>
  <div class="nook-photo-tools">
   <label>Brightness<input id="nookBright" type="range" min="50" max="150" value="100"></label>
   <label>Contrast<input id="nookContrast" type="range" min="50" max="150" value="100"></label>
   <label>Saturation<input id="nookSaturation" type="range" min="0" max="200" value="100"></label>
   <label>Zoom / crop<input id="nookZoom" type="range" min="100" max="180" value="100"></label>
   <label>Rotate<select id="nookRotate"><option value="0">Original</option><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></label>
   <label>Filter<select id="nookFilter"><option value="none">Original</option><option value="sepia">Sepia</option><option value="gray">Black &amp; white</option><option value="warm">Warm</option><option value="cool">Cool</option><option value="vivid">Vivid</option></select></label>
  </div>
  <div class="nook-tool-actions"><button type="button" id="nookPhotoReset">Reset photo</button><button type="button" id="nookPhotoApply">Apply photo edits</button></div>
  <small>Applying edits creates a new image. Animated GIFs become a still image.</small>
 </section>
</div>`;const marker=$('mentionSuggestions')||$('mediaFile');marker.parentNode.insertBefore(panel,marker);
const advanced=$('nookAdvancedPanel'),toggle=$('nookAdvancedToggle');
toggle.onclick=()=>{advanced.hidden=!advanced.hidden;toggle.textContent=advanced.hidden?'Show advanced tools':'Hide advanced tools';};
const templates={
gaming:['Gaming update','Share what is happening in your game.','🎮 Game:\n🏆 Rank / progress:\n✨ What happened:\n💬 What do you think?'],
announcement:['Big announcement','Let the Nook community know what is new.','📢 Announcement:\n\n📅 Date / details:\n\n💜 More information:'],
question:['Question for the community','Start a conversation with other Nook members.','❓ My question:\n\n🤔 My thoughts:\n\n👇 What would you do?'],
creator:['Creator update','Keep your followers updated on your content.','🎬 What I am working on:\n\n📅 Next upload / stream:\n\n💜 Thanks for the support!'],
review:['Game review','Share your honest thoughts about a game.','🎮 Game title:\n⭐ Rating:\n👍 What I liked:\n👎 What could improve:\n💬 Would you recommend it?']
};
$('nookUseTemplate').onclick=()=>{const t=templates[$('nookTemplate').value];if(!t)return;title.value=t[0];desc.value=t[1];body.value=t[2];[title,desc,body].forEach(x=>x.dispatchEvent(new Event('input',{bubbles:true})));};
function wrap(before,after){body.focus();const a=body.selectionStart,b=body.selectionEnd,txt=body.value.slice(a,b);if(!txt){window.showToast?.('Select some text first.');return;}body.setRangeText(before+txt+after,a,b,'select');body.dispatchEvent(new Event('input',{bubbles:true}));}
$('nookApplyStyle').onclick=()=>wrap('[style font='+$('nookFont').value+' size='+$('nookSize').value+' color='+$('nookColor').value+' highlight='+$('nookHighlight').value+' align='+$('nookAlign').value+']','[/style]');
$('nookQuote').onclick=()=>wrap('“','”');
$('nookDivider').onclick=()=>{body.setRangeText('\n\n────────────\n\n',body.selectionStart,body.selectionEnd,'end');body.dispatchEvent(new Event('input',{bubbles:true}));};
$('nookSpell').onclick=()=>{body.spellcheck=!body.spellcheck;$('nookSpell').textContent='Spellcheck: '+(body.spellcheck?'on':'off');};
$('nookPreviewMode').onchange=()=>{$('postPreviewBody').parentElement.classList.toggle('preview-mobile',$('nookPreviewMode').value==='mobile');};
$('nookStickers').innerHTML=['✨','🔥','🎮','🏆','💜','😂','❤️','⭐','🚀','🎉','👀','💯','👏','🫶','😎','💡'].map((v,i)=>'<button type="button" aria-label="Insert sticker '+i+'">'+v+'</button>').join('');
$('nookStickers').querySelectorAll('button').forEach(b=>b.onclick=()=>{body.focus();body.setRangeText(b.textContent+' ',body.selectionStart,body.selectionEnd,'end');body.dispatchEvent(new Event('input',{bubbles:true}));});
$('nookAddBlock').onclick=()=>{body.setRangeText('\n\n[New section]\n',body.selectionStart,body.selectionEnd,'end');body.dispatchEvent(new Event('input',{bubbles:true}));};
function moveLine(d){const lines=body.value.split('\n'),i=body.value.slice(0,body.selectionStart).split('\n').length-1,j=i+d;if(j<0||j>=lines.length)return;[lines[i],lines[j]]=[lines[j],lines[i]];body.value=lines.join('\n');body.dispatchEvent(new Event('input',{bubbles:true}));}
$('nookMoveUp').onclick=()=>moveLine(-1);$('nookMoveDown').onclick=()=>moveLine(1);
$('nookRemoveBlock').onclick=()=>{const a=body.value.split('\n');a.pop();body.value=a.join('\n');body.dispatchEvent(new Event('input',{bubbles:true}));};
const key='nook-studio-autosave-v2';let timer,restoring=false;
function save(){if(restoring)return;try{localStorage.setItem(key,JSON.stringify({title:title.value,desc:desc.value,body:body.value,at:Date.now()}));$('nookAutoState').textContent='Autosaved on this device · '+new Date().toLocaleTimeString();}catch(e){$('nookAutoState').textContent='Browser autosave unavailable';}}
function schedule(){clearTimeout(timer);timer=setTimeout(save,500);}
[title,desc,body].forEach(x=>x.addEventListener('input',schedule));
function restore(){try{const d=JSON.parse(localStorage.getItem(key)||'null');if(d&&!title.value&&!desc.value&&!body.value){restoring=true;title.value=d.title||'';desc.value=d.desc||'';body.value=d.body||'';restoring=false;[title,desc,body].forEach(x=>x.dispatchEvent(new Event('input',{bubbles:true})));$('nookAutoState').textContent='Restored autosaved draft from this device';}}catch(e){}}
restore();new MutationObserver(()=>{if(modal.classList.contains('show'))restore();}).observe(modal,{attributes:true,attributeFilter:['class']});
const photo=$('nookPhotoPanel'),img=$('composerImagePreview'),fileInput=$('mediaFile');
function photoReady(){const f=window.nookSelectedMediaFile;photo.hidden=!(f&&f.type&&f.type.startsWith('image/'));}
const filt={none:'none',sepia:'sepia(1)',gray:'grayscale(1)',warm:'sepia(.25) saturate(1.3)',cool:'hue-rotate(15deg) saturate(1.1)',vivid:'saturate(1.6) contrast(1.1)'};
function previewPhoto(){if(photo.hidden)return;img.style.filter='brightness('+$('nookBright').value+'%) contrast('+$('nookContrast').value+'%) saturate('+$('nookSaturation').value+'%) '+filt[$('nookFilter').value];img.style.transform='rotate('+$('nookRotate').value+'deg) scale('+(Number($('nookZoom').value)/100)+')';}
['nookBright','nookContrast','nookSaturation','nookZoom','nookRotate','nookFilter'].forEach(id=>$(id).addEventListener('input',previewPhoto));
$('nookPhotoReset').onclick=()=>{[['nookBright',100],['nookContrast',100],['nookSaturation',100],['nookZoom',100],['nookRotate',0],['nookFilter','none']].forEach(([id,v])=>$(id).value=v);previewPhoto();};
$('nookPhotoApply').onclick=async()=>{const f=window.nookSelectedMediaFile;if(!f||!f.type.startsWith('image/'))return;const url=URL.createObjectURL(f);try{const im=new Image();im.src=url;await im.decode();const a=Number($('nookRotate').value),swap=a===90||a===270,z=Number($('nookZoom').value)/100,c=document.createElement('canvas'),ctx=c.getContext('2d');c.width=swap?im.naturalHeight:im.naturalWidth;c.height=swap?im.naturalWidth:im.naturalHeight;ctx.translate(c.width/2,c.height/2);ctx.rotate(a*Math.PI/180);ctx.scale(z,z);ctx.filter='brightness('+$('nookBright').value+'%) contrast('+$('nookContrast').value+'%) saturate('+$('nookSaturation').value+'%) '+filt[$('nookFilter').value];ctx.drawImage(im,-im.naturalWidth/2,-im.naturalHeight/2);const blob=await new Promise(ok=>c.toBlob(ok,'image/jpeg',.92));if(!blob)throw Error('Export failed');const edited=new File([blob],'nook-edited-photo.jpg',{type:'image/jpeg'});window.nookSelectedMediaFile=edited;const dt=new DataTransfer();dt.items.add(edited);fileInput.files=dt.files;img.src=URL.createObjectURL(edited);img.style.filter='none';img.style.transform='none';$('mediaChoice').textContent='Edited photo ready to post ('+(edited.size/1048576).toFixed(1)+' MB).';window.showToast?.('Photo edits applied.');}catch(e){window.showToast?.('Could not edit this image in this browser.');}finally{URL.revokeObjectURL(url);}};
$('nookAltText').oninput=()=>{if(img)img.alt=$('nookAltText').value||'Selected image preview';};
new MutationObserver(photoReady).observe($('composerMediaPreview'),{attributes:true,attributeFilter:['hidden']});
const publish=$('publish');publish?.addEventListener('click',()=>setTimeout(()=>{if(!modal.classList.contains('show'))try{localStorage.removeItem(key);}catch(e){}},800));
photoReady();
})();