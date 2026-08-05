// auth.js - ITZTLI FRACTAL CORE
const SUPABASE_URL = 'https://rpoqukrcvkcmaqsajchk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eamhRTq61t3fVIMSUcRYwQ_-VLGFGJ5';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Verificar autenticación y plan específico
async function requirePlan(requiredPlan) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = 'login.html';
        return null;
    }

    // Obtener el plan del usuario
    const { data: userData, error: fetchError } = await supabase
        .from('usuarios')
        .select('plan, role')
        .eq('id', user.id)
        .single();

    if (fetchError || !userData) {
        // Si no tiene perfil, redirigir a login
        window.location.href = 'login.html';
        return null;
    }

    // Si es admin, permitir acceso a todo
    if (userData.role === 'admin') {
        return user;
    }

    // Si el plan no coincide con el requerido, redirigir a su plan correspondiente
    if (userData.plan !== requiredPlan) {
        const redirectMap = {
            'demo': 'demo-registro.html',
            'premium': 'itzli-premium.html',
            'platinum': 'itzli-platinum.html'
        };
        const redirectUrl = redirectMap[userData.plan] || 'login.html';
        window.location.href = redirectUrl;
        return null;
    }

    return user;
}

// Verificar autenticación (para páginas con cualquier plan)
async function requireAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = 'login.html';
        return null;
    }
    return user;
}

// Obtener el plan del usuario
async function getUserPlan(userId) {
    const { data, error } = await supabase
        .from('usuarios')
        .select('plan')
        .eq('id', userId)
        .single();
    if (error) return 'demo';
    return data?.plan || 'demo';
}

// Cerrar sesión
async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}

// Exportar para usar en otras páginas
window.requirePlan = requirePlan;
window.requireAuth = requireAuth;
window.getUserPlan = getUserPlan;
window.cerrarSesion = cerrarSesion;
window.supabase = supabase;

console.log('🔐 auth.js cargado correctamente');
