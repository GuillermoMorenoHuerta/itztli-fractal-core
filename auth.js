// auth.js — verificación de sesión en Supabase
const SUPABASE_URL = 'https://rpoqukrcvkcmaqsajchk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eamhRTq61t3fVIMSUcRYwQ_-VLGFGJ5';
const supabaseAuth = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Verifica que haya sesión. Si adminOnly = true, solo deja pasar admins.
async function requireAuth(adminOnly = false) {
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  if (adminOnly) {
    const { data: userData, error } = await supabaseAuth
      .from('usuarios')
      .select('role')
      .eq('id', session.user.id)
      .single();
    if (error || userData?.role !== 'admin') {
      alert('Acceso denegado. Solo administradores.');
      window.location.href = 'login.html';
      return null;
    }
  }
  return session.user;
}

// Verifica que la sesión exista y que el plan del usuario sea el requerido (o admin).
async function requirePlan(requiredPlan) {
  const user = await requireAuth();
  if (!user) return null;
  const { data: userData } = await supabaseAuth
    .from('usuarios')
    .select('plan, role')
    .eq('id', user.id)
    .single();
  // Admin siempre puede acceder
  if (userData?.role === 'admin') return user;
  if (userData?.plan !== requiredPlan) {
    alert(`Esta página es exclusiva del plan ${requiredPlan}. Serás redirigido a tu plan actual.`);
    const redirectMap = { free: 'demo-registro.html', premium: 'itzli-premium.html', platinum: 'itzli-platinum.html' };
    window.location.href = redirectMap[userData?.plan] || 'login.html';
    return null;
  }
  return user;
}