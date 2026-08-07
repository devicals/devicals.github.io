window.showHiddenPages=localStorage.getItem('showHiddenPages')!=='0';

const NAV=[
{t:'f',n:'Index',c:[
  {t:'p',n:'Home'},
  {t:'p',n:'Blogs'},
  {t:'f',n:'Community',c:[
    {t:'p',n:'Chits & Chats'},
    {t:'p',n:'Gallery'}
  ]}
]},
{t:'f',n:'Content',c:[
  {t:'p',n:'Projects'},
  {t:'p',n:'Downloads'},
  {t:'f',n:'Writing',c:[
    {t:'f',n:'Books',collapsed:1,c:[
      {t:'p',n:'Obliteration',admin:1},
      {t:'f',n:'Halloween Specials',c:[
        {t:'f',n:"O' Mother of Mine",c:[
          {t:'p',n:'The Lamb of Blood'},
          {t:'p',n:'The Shepherd of Filth'},
          {t:'p',n:'The Slaughtered Lamb'}
        ]}
      ]}
    ]},
    {t:'f',n:'Poems',collapsed:1,c:[
      {t:'f',n:'first',c:[
        {t:'p',n:'I "the song bird"'},
        {t:'p',n:'II "waking"'},
        {t:'p',n:'III "loss"'},
        {t:'p',n:'IV " "'},
        {t:'p',n:'V "warm"'},
        {t:'p',n:'VI "stay."'},
        {t:'p',n:'VII "river"'},
        {t:'p',n:'IIX "again"'},
        {t:'p',n:'IX "the aching grew worse"'},
        {t:'p',n:'X "bridge..."'}
      ]}
    ]}
  ]}
]},
{t:'f',n:'About Me',c:[
  {t:'p',n:'Games I <3'},
  {t:'p',n:'Spotify'}
]},
{t:'f',n:'Other Stuff',c:[
  {t:'f',n:'Tier List Maker',c:[
    {t:'p',n:'ZATOcord Tierlist'}
  ]},
  {t:'p',n:'World Clock Viewer'},
  {t:'p',n:'Code Translator'}
]},
{t:'f',n:'Archived Pages',admin:1,c:[
  {t:'p',n:'Obliteration'},
  {t:'p',n:'Oricade Songs'},
  {t:'p',n:'Function Generator'}
]}
];

function slug(s){
  return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-+|-+$)/g,'');
}

function buildTree(nodes,base,admin){
  const ul=document.createElement('ul');
  ul.className='nav-list';
  nodes.forEach(node=>{
    if(node.admin&&!admin)return;
    const path=base+'/'+slug(node.n);
    const li=document.createElement('li');
    li.className='nav-item';
    li.dataset.path=path;
    if(node.t==='f'){
      const row=document.createElement('div');
      row.className='nav-folder'+(node.admin?' nav-admin':'');
      const caret=document.createElement('span');
      caret.className='nav-caret';
      const label=document.createElement('span');
      label.className='nav-label';
      label.textContent=node.n;
      row.append(caret,label);
      li.appendChild(row);
      const childUl=buildTree(node.c,path,admin);
      childUl.classList.add('nav-children');
      li.appendChild(childUl);
      const open=!node.collapsed;
      if(open)li.classList.add('nav-open');
      caret.textContent=open?'\u25BE':'\u25B8';
      row.addEventListener('click',()=>{
        li.classList.toggle('nav-open');
        caret.textContent=li.classList.contains('nav-open')?'\u25BE':'\u25B8';
      });
    }else{
      const a=document.createElement('a');
      a.href='#'+path;
      a.className='nav-page'+(node.admin?' nav-admin':'');
      a.textContent=node.n;
      li.appendChild(a);
    }
    ul.appendChild(li);
  });
  return ul;
}

function renderNav(){
  const root=document.getElementById('nav-tree');
  root.innerHTML='';
  const admin=window.isAdmin&&window.showHiddenPages!==false;
  root.appendChild(buildTree(NAV,'',admin));
}

function applyNavOverride(arr){
  NAV.length=0;
  arr.forEach(n=>NAV.push(n));
  renderNav();
  route();
}

async function loadNavOverride(){
  try{
    const raw=localStorage.getItem('navOverride');
    if(raw)applyNavOverride(JSON.parse(raw));
  }catch(e){}
  if(window.sb){
    try{
      const {data}=await window.sb.from('site_content').select('data').eq('key','nav_structure').single();
      if(data&&data.data)applyNavOverride(data.data);
    }catch(e){}
  }
}

function findNode(path){
  const parts=path.split('/').filter(Boolean);
  let nodes=NAV,node=null,chain=[];
  for(const part of parts){
    node=nodes.find(n=>slug(n.n)===part);
    if(!node)return null;
    chain.push(node);
    nodes=node.c||[];
  }
  return {node,chain};
}

function demoContent(){
  const frag=document.createDocumentFragment();
  const h2a=document.createElement('h2');
  h2a.textContent='About';
  const pa=document.createElement('p');
  pa.textContent='Welcome to the site. This section is a placeholder demonstrating the table of contents.';
  const h2b=document.createElement('h2');
  h2b.textContent='Recent';
  const h3a=document.createElement('h3');
  h3a.textContent='Updates';
  const pb=document.createElement('p');
  pb.textContent='Nothing new yet.';
  frag.append(h2a,pa,h2b,h3a,pb);
  return frag;
}

function renderContent(chain){
  const container=document.getElementById('page-content');
  container.innerHTML='';
  const node=chain[chain.length-1];
  const h1=document.createElement('h1');
  h1.textContent=node.n;
  container.appendChild(h1);
  if(chain.length===2&&slug(chain[0].n)==='index'&&slug(chain[1].n)==='home'){
    container.appendChild(demoContent());
  }else{
    const p=document.createElement('p');
    p.className='placeholder-text';
    p.textContent='Content for this page has not been added yet.';
    container.appendChild(p);
  }
  document.title=node.n;
}

function buildTOC(){
  const toc=document.getElementById('toc-list');
  toc.innerHTML='';
  const heads=document.querySelectorAll('#page-content h1,#page-content h2,#page-content h3');
  heads.forEach((h,i)=>{
    if(!h.id)h.id='h-'+i+'-'+slug(h.textContent);
    const a=document.createElement('a');
    a.href='#';
    a.className='toc-item toc-'+h.tagName.toLowerCase();
    a.textContent=h.textContent;
    a.addEventListener('click',e=>{
      e.preventDefault();
      h.scrollIntoView({behavior:'smooth',block:'start'});
    });
    toc.appendChild(a);
  });
}

function expandTo(path,scroll){
  const parts=path.split('/').filter(Boolean);
  let acc='';
  parts.forEach(p=>{
    acc+='/'+p;
    const li=document.querySelector('#nav-tree li[data-path="'+CSS.escape(acc)+'"]');
    if(li){
      li.classList.add('nav-open');
      const caret=li.querySelector(':scope>.nav-folder .nav-caret');
      if(caret)caret.textContent='\u25BE';
      if(scroll)li.scrollIntoView({block:'center'});
    }
  });
}

function highlightActive(path){
  document.querySelectorAll('#nav-tree a.nav-page').forEach(a=>{
    a.classList.toggle('active',a.getAttribute('href')==='#'+path);
  });
}

function renderBreadcrumb(chain){
  const el=document.getElementById('breadcrumb');
  el.innerHTML='';
  let acc='';
  chain.forEach((node,i)=>{
    acc+='/'+slug(node.n);
    const path=acc;
    const last=i===chain.length-1;
    const item=document.createElement(last?'span':'button');
    item.className='crumb'+(last?' crumb-active':'');
    item.textContent=node.n;
    if(!last){
      item.addEventListener('click',()=>expandTo(path,true));
    }
    el.appendChild(item);
    if(!last){
      const sep=document.createElement('span');
      sep.className='crumb-sep';
      sep.textContent='\u203A';
      el.appendChild(sep);
    }
  });
}

function route(){
  let path=decodeURIComponent(location.hash.slice(1));
  if(path==='/admin'&&window.isAdmin&&window.renderAdminDashboard){
    const el=document.getElementById('breadcrumb');
    el.innerHTML='';
    const span=document.createElement('span');
    span.className='crumb crumb-active';
    span.textContent='Admin Dashboard';
    el.appendChild(span);
    window.renderAdminDashboard();
    document.getElementById('toc-list').innerHTML='';
    highlightActive('');
    return;
  }
  let found=path?findNode(path):null;
  if(!found||found.node.t!=='p'||(found.node.admin&&!window.isAdmin)){
    path='/index/home';
    found=findNode(path);
  }
  renderContent(found.chain);
  renderBreadcrumb(found.chain);
  buildTOC();
  highlightActive(path);
  expandTo(path,false);
}

function applyCustomCSS(css){
  let style=document.getElementById('custom-css-style');
  if(!style){
    style=document.createElement('style');
    style.id='custom-css-style';
    document.head.appendChild(style);
  }
  style.textContent=css;
}

function currentSettings(){
  return{
    mode:document.documentElement.classList.contains('light')?'light':'dark',
    theme:'primary',
    customCSS:document.getElementById('custom-css-input')?document.getElementById('custom-css-input').value:''
  };
}

async function persistSettings(){
  const s=currentSettings();
  localStorage.setItem('siteSettings',JSON.stringify(s));
  if(window.currentUser&&window.sb){
    await window.sb.from('profiles').update({settings:s}).eq('id',window.currentUser.id);
  }
}

async function loadSettings(){
  let s=null;
  if(window.currentUser&&window.sb){
    const {data}=await window.sb.from('profiles').select('settings').eq('id',window.currentUser.id).single();
    if(data&&data.settings)s=data.settings;
  }
  if(!s){
    const raw=localStorage.getItem('siteSettings');
    if(raw)s=JSON.parse(raw);
  }
  if(s){
    document.documentElement.classList.toggle('light',s.mode==='light');
    const modeBtn=document.getElementById('mode-toggle-btn');
    if(modeBtn)modeBtn.textContent=s.mode==='light'?'Light':'Dark';
    const cssArea=document.getElementById('custom-css-input');
    if(cssArea)cssArea.value=s.customCSS||'';
    applyCustomCSS(s.customCSS||'');
  }
}

function toggleSettingsPopup(){
  document.getElementById('settings-popup').classList.toggle('open');
}

function initSettingsPopup(){
  const pop=document.getElementById('settings-popup');
  pop.innerHTML='';
  const modeRow=document.createElement('div');
  modeRow.className='settings-row';
  const modeLabel=document.createElement('span');
  modeLabel.textContent='Appearance';
  const modeBtn=document.createElement('button');
  modeBtn.id='mode-toggle-btn';
  modeBtn.className='popup-btn-secondary';
  modeBtn.textContent='Dark';
  modeRow.append(modeLabel,modeBtn);

  const themeRow=document.createElement('div');
  themeRow.className='settings-row';
  const themeLabel=document.createElement('span');
  themeLabel.textContent='Theme';
  const themeSelect=document.createElement('select');
  themeSelect.id='theme-select';
  themeSelect.className='popup-input';
  const opt=document.createElement('option');
  opt.value='primary';
  opt.textContent='Primary';
  themeSelect.appendChild(opt);
  themeRow.append(themeLabel,themeSelect);

  const cssLabel=document.createElement('div');
  cssLabel.className='settings-row';
  cssLabel.textContent='Custom CSS';
  const cssArea=document.createElement('textarea');
  cssArea.id='custom-css-input';
  cssArea.className='settings-textarea';

  const saveBtn=document.createElement('button');
  saveBtn.className='popup-btn';
  saveBtn.textContent='Save';

  pop.append(modeRow,themeRow,cssLabel,cssArea,saveBtn);

  modeBtn.addEventListener('click',()=>{
    const light=document.documentElement.classList.toggle('light');
    modeBtn.textContent=light?'Light':'Dark';
    persistSettings();
  });
  saveBtn.addEventListener('click',()=>{
    applyCustomCSS(cssArea.value);
    persistSettings();
  });
}

function init(){
  renderNav();
  route();
  window.addEventListener('hashchange',route);
  document.addEventListener('authchange',()=>{
    renderNav();
    route();
    loadSettings();
  });
  document.getElementById('profile-icon-btn').addEventListener('click',()=>window.toggleProfilePopup());
  document.getElementById('settings-icon-btn').addEventListener('click',toggleSettingsPopup);
  initSettingsPopup();
  loadSettings();
  loadNavOverride();
}

document.addEventListener('DOMContentLoaded',()=>{
  init();
  if(window.initAuth)window.initAuth();
});