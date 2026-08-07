function createSection(title){
  const section=document.createElement('div');
  section.className='admin-section';
  const h2=document.createElement('h2');
  h2.textContent=title;
  const body=document.createElement('div');
  body.className='admin-section-body';
  section.append(h2,body);
  return{section,body};
}

async function fetchAnnouncements(){
  if(!window.sb)return[];
  const{data}=await window.sb.from('site_content').select('data').eq('key','announcements').single();
  return(data&&data.data)||[];
}

async function saveAnnouncements(list){
  if(!window.sb)return;
  await window.sb.from('site_content').update({data:list}).eq('key','announcements');
}

async function mountAnnouncements(parent){
  const{section,body}=createSection('Announcements');
  parent.appendChild(section);
  await reloadAnnouncements(body);
}

async function reloadAnnouncements(body){
  body.innerHTML='Loading...';
  const list=await fetchAnnouncements();
  body.innerHTML='';
  const form=document.createElement('div');
  form.className='admin-row';
  const input=document.createElement('textarea');
  input.className='settings-textarea';
  input.placeholder='New announcement...';
  const addBtn=document.createElement('button');
  addBtn.className='popup-btn';
  addBtn.textContent='Post';
  addBtn.addEventListener('click',async()=>{
    if(!input.value.trim())return;
    const updated=[...list,{id:crypto.randomUUID(),text:input.value.trim(),createdAt:Date.now()}];
    await saveAnnouncements(updated);
    reloadAnnouncements(body);
  });
  form.append(input,addBtn);
  body.appendChild(form);
  const listWrap=document.createElement('div');
  listWrap.className='admin-list';
  list.slice().reverse().forEach(item=>{
    const row=document.createElement('div');
    row.className='admin-item';
    const text=document.createElement('div');
    text.className='admin-item-text';
    text.textContent=item.text;
    const editBtn=document.createElement('button');
    editBtn.className='popup-btn-secondary';
    editBtn.textContent='Edit';
    const delBtn=document.createElement('button');
    delBtn.className='popup-btn-secondary';
    delBtn.textContent='Delete';
    editBtn.addEventListener('click',()=>{
      row.innerHTML='';
      const area=document.createElement('textarea');
      area.className='settings-textarea';
      area.value=item.text;
      const saveBtn=document.createElement('button');
      saveBtn.className='popup-btn';
      saveBtn.textContent='Save';
      saveBtn.addEventListener('click',async()=>{
        const updated=list.map(a=>a.id===item.id?{...a,text:area.value}:a);
        await saveAnnouncements(updated);
        reloadAnnouncements(body);
      });
      row.append(area,saveBtn);
    });
    delBtn.addEventListener('click',async()=>{
      if(!confirm('Delete this announcement?'))return;
      const updated=list.filter(a=>a.id!==item.id);
      await saveAnnouncements(updated);
      reloadAnnouncements(body);
    });
    row.append(text,editBtn,delBtn);
    listWrap.appendChild(row);
  });
  body.appendChild(listWrap);
}

async function fetchUsers(){
  if(!window.sb)return[];
  const{data,error}=await window.sb.rpc('admin_get_users');
  if(error)return[];
  return data||[];
}

async function manageUser(id,action){
  if(!window.sb)return;
  await window.sb.rpc('admin_manage_user',{target_id:id,action});
}

async function mountUsers(parent){
  const{section,body}=createSection('User Management');
  parent.appendChild(section);
  await reloadUsers(body);
}

async function reloadUsers(body){
  body.innerHTML='Loading...';
  const users=await fetchUsers();
  body.innerHTML='';
  const active=users.filter(u=>!u.banned);
  const banned=users.filter(u=>u.banned);
  body.appendChild(buildUserList(active,body));
  if(banned.length){
    const bannedTitle=document.createElement('div');
    bannedTitle.className='admin-subtitle';
    bannedTitle.textContent='Banned';
    body.appendChild(bannedTitle);
    body.appendChild(buildUserList(banned,body));
  }
}

function buildUserList(users,body){
  const wrap=document.createElement('div');
  wrap.className='admin-list'+(users.length&&users[0].banned?' admin-list-banned':'');
  users.forEach(u=>{
    const row=document.createElement('div');
    row.className='admin-item';
    const info=document.createElement('div');
    info.className='admin-item-text';
    const name=document.createElement('div');
    name.textContent=u.username||u.email;
    const id=document.createElement('div');
    id.className='popup-muted';
    id.textContent=u.id;
    info.append(name,id);
    const adminBtn=document.createElement('button');
    adminBtn.className='popup-btn-secondary';
    adminBtn.textContent=u.is_admin?'Remove Admin':'Make Admin';
    adminBtn.addEventListener('click',async()=>{
      await manageUser(u.id,u.is_admin?'unset_admin':'set_admin');
      reloadUsers(body);
    });
    const banBtn=document.createElement('button');
    banBtn.className='popup-btn-secondary';
    banBtn.textContent=u.banned?'Unban':'Ban';
    banBtn.addEventListener('click',async()=>{
      await manageUser(u.id,u.banned?'unban':'ban');
      reloadUsers(body);
    });
    const resetBtn=document.createElement('button');
    resetBtn.className='popup-btn-secondary';
    resetBtn.textContent='Reset Password';
    resetBtn.addEventListener('click',async()=>{
      if(!confirm('Force this user to set a new password on next login?'))return;
      await manageUser(u.id,'reset_password');
      alert('Password reset. User must set a new password on next login.');
    });
    const delBtn=document.createElement('button');
    delBtn.className='popup-btn-secondary';
    delBtn.textContent='Delete';
    delBtn.addEventListener('click',async()=>{
      if(!confirm('Permanently delete this account?'))return;
      await manageUser(u.id,'delete');
      reloadUsers(body);
    });
    row.append(info,adminBtn,banBtn,resetBtn,delBtn);
    wrap.appendChild(row);
  });
  return wrap;
}

function flattenFolders(nodes,base,label,out){
  nodes.forEach(node=>{
    if(node.t==='f'){
      const path=base+'/'+slug(node.n);
      out.push({path,label:label+node.n});
      flattenFolders(node.c,path,label+node.n+' / ',out);
    }
  });
}

function findChildrenArray(path){
  if(path==='')return NAV;
  const found=findNode(path);
  return found?found.node.c:null;
}

async function persistNav(){
  localStorage.setItem('navOverride',JSON.stringify(NAV));
  if(window.sb){
    try{await window.sb.from('site_content').upsert({key:'nav_structure',data:NAV});}catch(e){}
  }
  renderNav();
  if(window.rebuildGraph)window.rebuildGraph();
}

function renderManagerLevel(nodes,base,container,depth,onChange){
  const list=document.createElement('div');
  list.className='admin-tree-level';
  nodes.forEach((node,index)=>{
    const path=base+'/'+slug(node.n);
    const row=document.createElement('div');
    row.className='admin-tree-row';
    row.style.paddingLeft=(depth*16)+'px';
    row.draggable=true;
    const icon=document.createElement('span');
    icon.textContent=node.t==='f'?'\u{1F4C1}':'\u{1F4C4}';
    const label=document.createElement('span');
    label.textContent=node.n+(node.admin?' (admin)':'');
    row.append(icon,label);
    row.addEventListener('dragstart',e=>{
      e.dataTransfer.setData('text/plain',String(index));
      row.classList.add('dragging');
    });
    row.addEventListener('dragend',()=>row.classList.remove('dragging'));
    row.addEventListener('dragover',e=>e.preventDefault());
    row.addEventListener('drop',e=>{
      e.preventDefault();
      const from=Number(e.dataTransfer.getData('text/plain'));
      const to=index;
      if(from===to)return;
      const item=nodes.splice(from,1)[0];
      nodes.splice(to,0,item);
      persistNav();
      onChange();
    });
    list.appendChild(row);
    if(node.t==='f'){
      renderManagerLevel(node.c,path,list,depth+1,onChange);
    }
  });
  container.appendChild(list);
}

function renderPageManager(body){
  body.innerHTML='';
  const tree=document.createElement('div');
  tree.className='admin-tree';
  body.appendChild(tree);
  renderManagerLevel(NAV,'',tree,0,()=>renderPageManager(body));

  const form=document.createElement('div');
  form.className='admin-row admin-create-row';
  const select=document.createElement('select');
  select.className='popup-input';
  const rootOpt=document.createElement('option');
  rootOpt.value='';
  rootOpt.textContent='(root)';
  select.appendChild(rootOpt);
  const folders=[];
  flattenFolders(NAV,'','',folders);
  folders.forEach(f=>{
    const opt=document.createElement('option');
    opt.value=f.path;
    opt.textContent=f.label;
    select.appendChild(opt);
  });
  const nameInput=document.createElement('input');
  nameInput.type='text';
  nameInput.placeholder='New page name';
  nameInput.className='popup-input';
  const adminLabel=document.createElement('label');
  adminLabel.className='admin-check-label';
  const adminCheck=document.createElement('input');
  adminCheck.type='checkbox';
  adminLabel.append(adminCheck,document.createTextNode('Admin only'));
  const createBtn=document.createElement('button');
  createBtn.className='popup-btn';
  createBtn.textContent='Create Page';
  createBtn.addEventListener('click',()=>{
    if(!nameInput.value.trim())return;
    const children=findChildrenArray(select.value);
    if(!children)return;
    const node={t:'p',n:nameInput.value.trim()};
    if(adminCheck.checked)node.admin=1;
    children.push(node);
    nameInput.value='';
    persistNav();
    renderPageManager(body);
  });
  form.append(select,nameInput,adminLabel,createBtn);
  body.appendChild(form);
}

async function mountPageManager(parent){
  const{section,body}=createSection('Page Manager');
  parent.appendChild(section);
  renderPageManager(body);
}

function renderAdminDashboard(){
  const container=document.getElementById('page-content');
  container.innerHTML='';
  const h1=document.createElement('h1');
  h1.textContent='Admin Dashboard';
  container.appendChild(h1);
  const toggleRow=document.createElement('div');
  toggleRow.className='admin-row';
  const label=document.createElement('span');
  label.textContent='Show hidden pages in navigation';
  const toggle=document.createElement('input');
  toggle.type='checkbox';
  toggle.checked=window.showHiddenPages!==false;
  toggle.addEventListener('change',()=>{
    window.showHiddenPages=toggle.checked;
    localStorage.setItem('showHiddenPages',toggle.checked?'1':'0');
    renderNav();
    if(window.rebuildGraph)window.rebuildGraph();
  });
  toggleRow.append(label,toggle);
  container.appendChild(toggleRow);
  mountAnnouncements(container);
  mountUsers(container);
  mountPageManager(container);
}
window.renderAdminDashboard=renderAdminDashboard;

function refreshAdminEntry(){
  const pop=document.getElementById('settings-popup');
  if(!pop)return;
  let btn=document.getElementById('admin-dashboard-btn');
  if(window.isAdmin){
    if(!btn){
      btn=document.createElement('button');
      btn.id='admin-dashboard-btn';
      btn.className='popup-btn-secondary';
      btn.textContent='Admin Dashboard >';
      btn.addEventListener('click',()=>{
        location.hash='#/admin';
        pop.classList.remove('open');
      });
      pop.appendChild(btn);
    }
  }else if(btn){
    btn.remove();
  }
}
document.addEventListener('authchange',refreshAdminEntry);
document.addEventListener('DOMContentLoaded',refreshAdminEntry);