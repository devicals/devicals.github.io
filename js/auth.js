const SUPABASE_URL="";
const SUPABASE_ANON_KEY="";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
window.sb=sb;
window.isAdmin=false;
window.currentUser=null;

function updateProfileButton(){
  const btn=document.getElementById('profile-icon-btn');
  btn.innerHTML='';
  if(window.currentUser){
    const name=document.createElement('span');
    name.className='profile-name';
    name.textContent=window.currentUser.displayName||window.currentUser.email;
    const uid=document.createElement('span');
    uid.className='profile-uid';
    uid.textContent=window.currentUser.id.slice(0,8);
    btn.append(name,uid);
  }else{
    const icon=document.createElement('span');
    icon.className='profile-icon-glyph';
    icon.textContent='\u263A';
    btn.appendChild(icon);
  }
}

function toggleProfilePopup(){
  const pop=document.getElementById('profile-popup');
  if(pop.classList.contains('open')){
    pop.classList.remove('open');
    return;
  }
  pop.innerHTML='';
  if(window.currentUser){
    const name=document.createElement('div');
    name.className='popup-title';
    name.textContent=window.currentUser.displayName||window.currentUser.email;
    const uid=document.createElement('div');
    uid.className='popup-muted';
    uid.textContent='ID: '+window.currentUser.id;
    const logout=document.createElement('button');
    logout.className='popup-btn';
    logout.textContent='Logout';
    logout.addEventListener('click',()=>{sb.auth.signOut();pop.classList.remove('open');});
    pop.append(name,uid,logout);
  }else{
    const email=document.createElement('input');
    email.type='email';
    email.placeholder='Email';
    email.className='popup-input';
    const pass=document.createElement('input');
    pass.type='password';
    pass.placeholder='Password';
    pass.className='popup-input';
    const loginBtn=document.createElement('button');
    loginBtn.className='popup-btn';
    loginBtn.textContent='Login';
    loginBtn.addEventListener('click',async()=>{
      const {error}=await sb.auth.signInWithPassword({email:email.value,password:pass.value});
      if(error)alert(error.message);else pop.classList.remove('open');
    });
    const signupBtn=document.createElement('button');
    signupBtn.className='popup-btn-secondary';
    signupBtn.textContent='Sign Up';
    signupBtn.addEventListener('click',async()=>{
      const {error}=await sb.auth.signUp({email:email.value,password:pass.value});
      if(error)alert(error.message);else alert('Check your email to confirm.');
    });
    pop.append(email,pass,loginBtn,signupBtn);
  }
  pop.classList.add('open');
}
window.toggleProfilePopup=toggleProfilePopup;

async function applySession(session){
  window.currentUser=session?session.user:null;
  window.isAdmin=false;
  if(session){
    const {data}=await sb.from('profiles').select('username,is_admin').eq('id',session.user.id).single();
    if(data){
      window.currentUser.displayName=data.username||session.user.email;
      window.isAdmin=!!data.is_admin;
    }
  }
  updateProfileButton();
  document.getElementById('profile-popup').classList.remove('open');
  document.dispatchEvent(new CustomEvent('authchange'));
}

async function initAuth(){
  const {data:{session}}=await sb.auth.getSession();
  await applySession(session);
  sb.auth.onAuthStateChange((_e,session)=>{applySession(session);});
}
window.initAuth=initAuth;