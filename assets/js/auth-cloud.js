

async function getSession(){
  const { data, error } = await sb.auth.getSession();
  if(error){ console.error(error); return null; }
  return data.session;
}


async function requireAuthCloud(){
  const session = await getSession();
  if(!session){
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

async function signIn(email, password){
  return await sb.auth.signInWithPassword({ email, password });
}

async function signOutCloud(){
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

function userInitials(name){
  const parts = String(name).trim().split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] || 'U') + (parts[1]?.[0] || '')).toUpperCase();
}
