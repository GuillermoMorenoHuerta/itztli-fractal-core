// auth-guard.js – Centraliza verificación de sesión y plan
(async function() {
  // ═══ CONFIGURACIÓN ═══
  const SUPABASE_URL = 'https://rpoqukrcvkcmaqsajchk.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_eamhRTq61t3fVIMSUcRYwQ_-VLGFGJ5';
  const LOGIN_PAGE = 'login.html';                 // sin parámetros
  const PLANS = ['demo', 'premium', 'platinum'];
  // Mapeo de plan -> página de dashboard
  const DASHBOARD_PAGES = {
    demo: 'bienvenida-demo.html',          // ajusta a tu ruta real
    premium: 'itzli-premium.html',
    platinum: 'itzli-platinum.html'
  };

  // ═══ INICIALIZAR SUPABASE ═══
  if (!window.supabase) {
    console.error('Supabase no cargado');
    window.location.href = LOGIN_PAGE;
    return;
  }
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // ═══ OBTENER EL PLAN ESPERADO DE ESTA PÁGINA ═══
  const urlParams = new URLSearchParams(window.location.search);
  // El plan se puede pasar como parámetro ?plan= o deducirlo del nombre del archivo
  let expectedPlan = urlParams.get('plan');
  if (!expectedPlan) {
    // Intenta extraerlo del nombre de la página (ej: itzli-premium.html → premium)
    const path = window.location.pathname.split('/').pop();
    const match = path.match(/itzli-(demo|premium|platinum)/i) || path.match(/bienvenida-(demo|premium|platinum)/i);
    if (match) expectedPlan = match[1].toLowerCase();
  }
  if (!expectedPlan || !PLANS.includes(expectedPlan)) {
    // Plan no reconocido → ir a login sin plan (se elegirá allí)
    window.location.href = LOGIN_PAGE;
    return;
  }

  // ═══ VERIFICAR SESIÓN ═══
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      // No autenticado → redirigir a login con el plan que se esperaba
      window.location.href = `${LOGIN_PAGE}?plan=${expectedPlan}`;
      return;
    }

    // ═══ OBTENER PLAN REAL DEL USUARIO DESDE LA TABLA ═══
    // NOTA: Asegúrate de tener una tabla 'usuarios' con columnas id (UUID) y plan (texto)
    const { data: profile, error: profileError } = await supabase
      .from('usuarios')
      .select('plan')
      .eq('id', user.id)
      .single();

    // Si no existe registro en 'usuarios', podemos usar los metadatos (user.user_metadata.plan)
    let realPlan = profile?.plan || user.user_metadata?.plan;
    if (!realPlan) {
      // Plan no definido → forzar a demo y redirigir a su dashboard
      realPlan = 'demo';
      await supabase.from('usuarios').upsert({ id: user.id, email: user.email, plan: 'demo', updated_at: new Date().toISOString() });
    }

    // ═══ COMPROBAR COINCIDENCIA DEL PLAN ═══
    if (realPlan !== expectedPlan) {
      // Redirigir al dashboard correcto según el plan real
      const redirectTo = DASHBOARD_PAGES[realPlan] || DASHBOARD_PAGES.demo;
      window.location.href = redirectTo;
      return;
    }

    // ═══ SESIÓN VÁLIDA Y PLAN CORRECTO ═══
    // Exponer objeto de sesión si es necesario
    window.__ITZLI_SESSION = { user, supabase, plan: realPlan };
    console.log('Auth guard OK – plan:', realPlan);

    // Si todo está bien, el código del dashboard puede seguir.
  } catch (err) {
    console.error('Error en auth-guard:', err);
    window.location.href = LOGIN_PAGE;
  }
})();