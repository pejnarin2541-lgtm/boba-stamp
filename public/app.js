const $ = selector => document.querySelector(selector);
const state = { role:'customer', session:null, shops:[], member:null, merchant:null, admin:null, purpose:'register', challenge:null, qrUntil:0, scanner:null };
function node(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x;}
function clear(x){x.replaceChildren();}
function notice(target,message){target.textContent=message||'';target.hidden=!message;}
let toastTimer;
function toast(message){const box=$('#toast');box.textContent=message;box.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.hidden=true,4200);}
async function request(url,method='GET',body){
  const res=await fetch(url,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,credentials:'same-origin'});
  const data=await res.json().catch(()=>({error:'ระบบตอบกลับไม่สมบูรณ์'}));
  if(!res.ok)throw new Error(data.error||'เชื่อมต่อไม่สำเร็จ');
  return data;
}
async function action(fn){try{await fn();}catch(e){toast(e.message||'เกิดข้อผิดพลาด');}}
function role(name){
  state.role=name;
  for(const section of document.querySelectorAll('.role-view'))section.hidden=section.id!==name+'-view';
  for(const button of document.querySelectorAll('.role-nav button'))button.classList.toggle('selected',button.dataset.role===name);
  $('#logout').hidden=!state.session;
  const suffix={customer:'บัตรสะสมแต้ม',merchant:'สำหรับร้านค้า',admin:'ผู้ดูแล'}[name];
  document.title='Boba Stamp — '+suffix;
  history.replaceState(null,'',name==='customer'?'/':'/#'+name);
}
function sessionPanels(){
  $('#customer-auth').hidden=state.session==='member';
  $('#member-space').hidden=state.session!=='member';
  $('#merchant-auth').hidden=state.session==='merchant';
  $('#merchant-space').hidden=state.session!=='merchant';
  $('#admin-auth').hidden=state.session==='admin';
  $('#admin-space').hidden=state.session!=='admin';
  $('#logout').hidden=!state.session;
}
function setPurpose(purpose){
  state.purpose=purpose;state.challenge=null;
  $('#choose-register').classList.toggle('selected',purpose==='register');
  $('#choose-login').classList.toggle('selected',purpose==='login');
  $('#name-field').hidden=purpose!=='register';
  $('#email-field').hidden=purpose!=='register';
  $('#customer-form').elements.name.required=purpose==='register';
  $('#customer-form').elements.email.required=purpose==='register';
  $('#customer-form-title').textContent=purpose==='register'?'สมัครสมาชิก':'เข้าสู่ระบบ';
  $('#send-code').textContent=purpose==='register'?'ส่งรหัสยืนยัน':'รับรหัสเข้าบัตร';
  $('#customer-form-fields').hidden=false;$('#verify-form').hidden=true;
  notice($('#customer-message'),'');
}
function fillShops(){
  const select=$('#customer-shop');clear(select);
  if(!state.shops.length){const o=node('option','', 'ยังไม่มีร้านที่เปิดรับสมาชิก');o.value='';select.append(o);return;}
  for(const s of state.shops){const o=node('option','',s.name+(s.branch&&s.branch!=='-'?' · '+s.branch:''));o.value=s.id;select.append(o);}
}
function formatDate(value){const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'});}
function renderEvents(target,events){
  clear(target);
  if(!events.length){target.append(node('p','empty','ยังไม่มีกิจกรรม'));return;}
  for(const item of events){
    const row=node('div','event-row'),badge=node('span','event-icon '+item.kind,item.kind==='stamp'?'+':'★');
    const text=node('div');text.append(node('strong','',item.kind==='stamp'?'ได้รับ 1 แต้ม':'แลกรางวัล'));
    text.append(node('small','',item.note||item.member_name||formatDate(item.created_at)));
    const right=node('div','event-right');right.append(node('strong','',item.points>0?'+1':'−10'));right.append(node('small','',formatDate(item.created_at)));
    row.append(badge,text,right);target.append(row);
  }
}
async function loadMember(){
  state.member=await request('/api/member');const {member:m,shop:s,events}=state.member;
  $('#member-greeting').textContent='สวัสดี '+m.name;
  $('#member-shop-name').textContent=s.name+(s.branch&&s.branch!=='-'?' · '+s.branch:'');
  $('#member-code').textContent=m.id;$('#member-card-title').textContent=s.card_title;
  $('#member-card-note').textContent=s.card_note;$('#member-points').textContent=m.stamps;
  $('#member-reward').textContent=m.stamps>=10?'ครบแล้ว แจ้งร้านเพื่อแลกรางวัล':s.reward_text;
  $('.loyalty-card').style.setProperty('--card-accent',s.theme_primary);
  const stamps=$('#stamp-grid');clear(stamps);
  for(let i=0;i<10;i++)stamps.append(node('span','stamp '+(i<m.stamps?'filled':''),i<m.stamps?'●':String(i+1)));
  renderEvents($('#member-events'),events);
}
function stat(label,value){const card=node('article','stat');card.append(node('strong','',value),node('span','',label));return card;}
function memberTile(m,admin=false){
  const row=node('article','member-item'),avatar=node('span','avatar',m.name.slice(0,1)),info=node('div','member-info');
  info.append(node('strong','',m.name),node('small','',m.id+' · '+m.phone));
  const points=node('div','tile-points');points.append(node('strong','',m.stamps),node('small','','แต้ม'));
  row.append(avatar,info,points);
  if(admin){const b=node('button','button tiny '+(m.status==='active'?'ghost-danger':'secondary'),m.status==='active'?'ระงับ':'เปิดใช้');b.type='button';b.addEventListener('click',()=>action(async()=>{await request('/api/admin/members/'+encodeURIComponent(m.id),'PATCH',{status:m.status==='active'?'banned':'active'});await loadAdmin();toast('เปลี่ยนสถานะสมาชิกแล้ว');}));
    const remove=node('button','button tiny ghost-danger','ลบ');remove.type='button';remove.addEventListener('click',()=>action(async()=>{if(!confirm('ลบสมาชิก '+m.name+' ถาวร?'))return;await request('/api/admin/members/'+encodeURIComponent(m.id),'DELETE');await loadAdmin();toast('ลบสมาชิกแล้ว');}));row.append(b,remove);}
  else{const actions=node('div','tile-actions'),add=node('button','button tiny primary','+1 แต้ม'),redeem=node('button','button tiny secondary','แลกรางวัล');add.type=redeem.type='button';add.disabled=m.status!=='active'||m.stamps>=10;redeem.disabled=m.status!=='active'||m.stamps<10;
    add.addEventListener('click',()=>action(async()=>{await request('/api/merchant/stamp','POST',{memberId:m.id});await loadMerchant();toast('เพิ่ม 1 แต้มให้ '+m.name+' แล้ว');}));
    redeem.addEventListener('click',()=>action(async()=>{if(!confirm('ยืนยันแลกรางวัลของ '+m.name+' ใช้ 10 แต้ม?'))return;await request('/api/merchant/redeem','POST',{memberId:m.id});await loadMerchant();toast('แลกรางวัลสำเร็จ');}));
    actions.append(add,redeem);row.append(actions);}
  return row;
}
function renderMerchantMembers(query=''){
  const target=$('#merchant-member-list');clear(target);
  const list=state.merchant.members.filter(m=>(m.name+' '+m.phone+' '+m.id).toLowerCase().includes(query.toLowerCase()));
  if(!list.length){target.append(node('p','empty','ไม่พบสมาชิกในร้านนี้'));return;}
  for(const m of list)target.append(memberTile(m));
}
async function loadMerchant(){
  state.merchant=await request('/api/merchant');const {shop:s,members,events}=state.merchant;
  $('#merchant-title').textContent=s.name;
  const stats=$('#merchant-stats');clear(stats);
  stats.append(stat('สมาชิก',members.length),stat('แต้มคงเหลือ',members.reduce((n,m)=>n+m.stamps,0)),stat('พร้อมแลกรางวัล',members.filter(m=>m.stamps>=10&&m.status==='active').length));
  renderMerchantMembers($('#member-query').value.trim());
  renderEvents($('#merchant-events'),events);
  const form=$('#theme-form');form.elements.primary.value=s.theme_primary;form.elements.title.value=s.card_title;form.elements.note.value=s.card_note;form.elements.reward.value=s.reward_text;form.elements.prefix.value=s.member_prefix.replace(/-$/,'');
}
function statusLabel(status){return({active:'เปิดใช้งาน',pending:'รออนุมัติ',banned:'ระงับ'})[status]||status;}
function renderShops(query=''){
  const target=$('#admin-shop-list');clear(target);
  const list=state.admin.shops.filter(s=>(s.name+' '+s.phone+' '+s.owner).toLowerCase().includes(query.toLowerCase()));
  if(!list.length){target.append(node('p','empty','ไม่พบร้านค้า'));return;}
  for(const s of list){const row=node('article','shop-item'),info=node('div','shop-info');info.append(node('strong','',s.name),node('small','',(s.branch&&s.branch!=='-'?s.branch+' · ':'')+s.owner+' · '+s.phone));
    const counts=node('span','shop-count',s.member_count+' สมาชิก · '+s.stamp_count+' แต้ม');
    const badge=node('span','status '+s.status,statusLabel(s.status));
    const edit=node('button','button tiny secondary','จัดการ');edit.type='button';edit.addEventListener('click',()=>editShop(s));
    row.append(info,counts,badge,edit);target.append(row);}
}
async function loadAdmin(){
  state.admin=await request('/api/admin');
  const shops=state.admin.shops,members=state.admin.members,stats=$('#admin-stats');clear(stats);
  stats.append(stat('ร้านทั้งหมด',shops.length),stat('ร้านที่เปิดใช้',shops.filter(s=>s.status==='active').length),stat('สมาชิกทั้งหมด',members.length),stat('แต้มคงเหลือ',members.reduce((n,m)=>n+m.stamps,0)));
  renderShops($('#shop-filter').value.trim());
  const target=$('#admin-member-list');clear(target);
  if(!members.length)target.append(node('p','empty','ยังไม่มีสมาชิก'));
  for(const m of members)target.append(memberTile(m,true));
}
function editShop(s){
  const form=$('#shop-form');form.reset();form.elements.id.value=s?.id||'';
  form.elements.name.value=s?.name||'';form.elements.branch.value=s?.branch||'';form.elements.owner.value=s?.owner||'';form.elements.phone.value=s?.phone||'';form.elements.plan.value=s?.plan||'Trial';form.elements.status.value=s?.status||'pending';form.elements.prefix.value=s?.member_prefix?.replace(/-$/,'')||'BOBA';
  form.elements.pin.placeholder=s?'เว้นว่างเพื่อใช้รหัสเดิม':'ตั้ง PIN 4–12 หลัก';
  form.elements.pin.required=!s;$('#edit-eyebrow').textContent=s?'แก้ไขร้าน':'ร้านใหม่';$('#edit-title').textContent=s?s.name:'เพิ่มร้านค้า';
  $('#delete-shop').hidden=!s||s.member_count>0;$('#edit-dialog').showModal();
}
async function refresh(){
  const session=await request('/api/session');state.session=session.role;sessionPanels();
  if(session.role==='member'){role('customer');await loadMember();}
  else if(session.role==='merchant'){role('merchant');await loadMerchant();}
  else if(session.role==='admin'){role('admin');await loadAdmin();}
  else role(location.hash==='#merchant'?'merchant':location.hash==='#admin'?'admin':'customer');
}
for(const b of document.querySelectorAll('.role-nav button'))b.addEventListener('click',()=>role(b.dataset.role));
$('#choose-register').addEventListener('click',()=>setPurpose('register'));
$('#choose-login').addEventListener('click',()=>setPurpose('login'));
$('#back-to-form').addEventListener('click',()=>setPurpose(state.purpose));
$('#customer-form').addEventListener('submit',e=>{e.preventDefault();action(async()=>{
  notice($('#customer-message'),'');const f=e.currentTarget.elements;
  const input={purpose:state.purpose,shopId:f.shopId.value,name:f.name.value,phone:f.phone.value,email:f.email.value};
  const result=await request('/api/customer/request-code','POST',input);state.challenge=result.challengeId;
  $('#customer-form-fields').hidden=true;$('#verify-form').hidden=false;
  $('#code-sent-line').textContent='ส่งรหัสไปที่ '+result.email+' แล้ว · ใช้ได้ 5 นาที';
  $('#dev-code').hidden=!result.devCode;$('#dev-code').textContent=result.devCode?'รหัสทดสอบในเครื่อง: '+result.devCode:'';
  $('#verify-form').elements.code.focus();
});});
$('#verify-form').addEventListener('submit',e=>{e.preventDefault();action(async()=>{await request('/api/customer/verify','POST',{challengeId:state.challenge,code:e.currentTarget.elements.code.value});state.session='member';sessionPanels();await loadMember();toast('เข้าสู่บัตรสมาชิกแล้ว');});});
$('#merchant-login').addEventListener('submit',e=>{e.preventDefault();action(async()=>{const f=e.currentTarget.elements;await request('/api/merchant/login','POST',{phone:f.phone.value,pin:f.pin.value});state.session='merchant';sessionPanels();await loadMerchant();toast('เข้าสู่ระบบร้านแล้ว');});});
$('#admin-login').addEventListener('submit',e=>{e.preventDefault();action(async()=>{await request('/api/admin/login','POST',{pin:e.currentTarget.elements.pin.value});state.session='admin';sessionPanels();await loadAdmin();toast('เข้าสู่ระบบผู้ดูแลแล้ว');});});
$('#logout').addEventListener('click',()=>action(async()=>{await request('/api/logout','POST');state.session=null;sessionPanels();toast('ออกจากระบบแล้ว');}));
$('#member-search').addEventListener('submit',e=>{e.preventDefault();renderMerchantMembers($('#member-query').value.trim());});
$('#member-query').addEventListener('input',()=>renderMerchantMembers($('#member-query').value.trim()));
$('#theme-form').addEventListener('submit',e=>{e.preventDefault();action(async()=>{const f=e.currentTarget.elements;await request('/api/merchant/theme','PATCH',{primary:f.primary.value,title:f.title.value,note:f.note.value,reward:f.reward.value,prefix:f.prefix.value});await loadMerchant();toast('บันทึกหน้าบัตรแล้ว');});});
$('#shop-filter').addEventListener('input',()=>renderShops($('#shop-filter').value.trim()));
$('#add-shop-open').addEventListener('click',()=>editShop(null));
$('#shop-form').addEventListener('submit',e=>{e.preventDefault();action(async()=>{const f=e.currentTarget.elements,id=f.id.value,body={name:f.name.value,branch:f.branch.value,owner:f.owner.value,phone:f.phone.value,plan:f.plan.value,status:f.status.value,prefix:f.prefix.value};if(f.pin.value)body.pin=f.pin.value;if(id)await request('/api/admin/shops/'+encodeURIComponent(id),'PATCH',body);else await request('/api/admin/shops','POST',body);$('#edit-dialog').close();await loadAdmin();toast('บันทึกร้านแล้ว');});});
$('#delete-shop').addEventListener('click',()=>action(async()=>{const id=$('#shop-form').elements.id.value;if(!confirm('ลบร้านนี้ถาวร?'))return;await request('/api/admin/shops/'+encodeURIComponent(id),'DELETE');$('#edit-dialog').close();await loadAdmin();toast('ลบร้านแล้ว');}));
$('#show-qr').addEventListener('click',()=>action(async()=>{await newQr();$('#qr-dialog').showModal();}));
$('#qr-refresh').addEventListener('click',()=>action(newQr));
async function newQr(){const result=await request('/api/member/qr','POST'),box=$('#qr-image');clear(box);const content=state.member.member.id+'|'+result.token;state.qrUntil=Date.now()+result.expiresIn*1000;
  if(window.QRCode)new QRCode(box,{text:content,width:220,height:220,colorDark:'#1d3632',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
  else box.append(node('code','qr-fallback',content));
  $('#qr-timer').textContent='เหลือเวลา '+result.expiresIn+' วินาที';
}
setInterval(()=>{if(!$('#qr-dialog').open)return;const left=Math.max(0,Math.ceil((state.qrUntil-Date.now())/1000));$('#qr-timer').textContent=left?'เหลือเวลา '+left+' วินาที':'QR หมดอายุแล้ว กดสร้างใหม่';},1000);
async function stopScanner(){const s=state.scanner;if(s){s.getTracks().forEach(t=>t.stop());state.scanner=null;}}
$('#scan-dialog').addEventListener('close',stopScanner);
$('#scan-open').addEventListener('click',()=>action(async()=>{if(!('BarcodeDetector' in window)||!navigator.mediaDevices?.getUserMedia)throw new Error('เบราว์เซอร์นี้ยังสแกน QR ไม่ได้ กรุณาค้นหาสมาชิกด้วยเบอร์');const detector=new BarcodeDetector({formats:['qr_code']});$('#scan-dialog').showModal();state.scanner=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});const video=$('#scanner-video');video.srcObject=state.scanner;await video.play();$('#scan-status').textContent='วาง QR ของลูกค้าในกรอบกล้อง';while(state.scanner&&$('#scan-dialog').open){const codes=await detector.detect(video);if(codes.length){const [id,token]=codes[0].rawValue.split('|');await request('/api/merchant/stamp','POST',{memberId:id,qrToken:token});$('#scan-dialog').close();await loadMerchant();toast('สแกนและเพิ่ม 1 แต้มสำเร็จ');break;}await new Promise(r=>setTimeout(r,250));}}));
action(async()=>{const s=await request('/api/shops');state.shops=s.shops;fillShops();setPurpose('register');await refresh();});
