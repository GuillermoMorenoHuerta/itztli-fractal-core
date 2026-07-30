// itzli-auth.js - Módulo de autenticación ITZTLI
(function() {
    'use strict';

    const CONFIG = {
        SUPABASE_URL: 'https://rpoqukrcvkcmaqsajchk.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwb3F1a3JjdmtjbWFxc2FqY2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NjUwODIsImV4cCI6MjA1ODQ0MTA4Mn0.Xy7z9A1bC3dE5fG7hJ9kL1mN3pQ5rS7vW3tY6uA4bC1dE',
        PRODUCTS: {
            premium: {
                name: 'Premium',
                price: 29.99,
                file: 'itzli-premium.html',
                features: ['Acceso completo', 'Soporte prioritario']
            },
            platinum: {
                name: 'Platinum',
                price: 49.99,
                file: 'itzli-platinum.html',
                features: ['Todo Premium', 'API acceso', 'Soporte 24/7']
            }
        },
        REDIRECT_AFTER_LOGIN: 'itzli-demo.html'
    };

    let supabase = null;
    let currentUser = null;
    let userData = null;

    function init() {
        try {
            supabase = window.supabase.createClient(
                CONFIG.SUPABASE_URL,
                CONFIG.SUPABASE_ANON_KEY
            );
            console.log('✅ ITZTLI Auth inicializado correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar Supabase:', error);
            return false;
        }
    }

    async function login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.error('Error de login:', error);
                return { success: false, error: error.message };
            }

            if (data.user) {
                currentUser = data.user;
                await loadUserData(data.user.id);
                return { success: true, user: data.user };
            }

            return { success: false, error: 'Credenciales inválidas' };
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, error: error.message };
        }
    }

    async function register(email, password, vin, plan) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        username: document.getElementById('regUsername')?.value || 'Usuario',
                        vin: vin,
                        plan: plan
                    }
                }
            });

            if (error) {
                console.error('Error de registro:', error);
                return { success: false, error: error.message };
            }

            if (data.user) {
                currentUser = data.user;
                const userProfile = {
                    id: data.user.id,
                    email: email,
                    username: document.getElementById('regUsername')?.value || 'Usuario',
                    vin: vin,
                    plan: plan,
                    registeredAt: new Date().toISOString()
                };
                
                localStorage.setItem('itzli_user_data', JSON.stringify(userProfile));
                userData = userProfile;

                const redirectUrl = CONFIG.PRODUCTS[plan]?.file || 'itzli-demo.html';
                
                return { 
                    success: true, 
                    redirecting: true,
                    redirectUrl: redirectUrl,
                    user: data.user 
                };
            }

            return { success: false, error: 'Error al crear la cuenta' };
        } catch (error) {
            console.error('Error en registro:', error);
            return { success: false, error: error.message };
        }
    }

    async function demoLogin(role) {
        try {
            const demoUser = {
                id: 'demo-' + Date.now(),
                email: 'demo@itzli.com',
                username: 'Demo User',
                plan: 'premium',
                role: role || 'demo',
                isDemo: true
            };
            
            localStorage.setItem('itzli_user_data', JSON.stringify(demoUser));
            localStorage.setItem('itzli_demo_mode', 'true');
            userData = demoUser;
            currentUser = demoUser;
            
            window.location.href = CONFIG.REDIRECT_AFTER_LOGIN;
            return { success: true, user: demoUser };
        } catch (error) {
            console.error('Error en demo login:', error);
            return { success: false, error: error.message };
        }
    }

    async function logout() {
        try {
            localStorage.removeItem('itzli_user_data');
            localStorage.removeItem('itzli_demo_mode');
            userData = null;
            currentUser = null;
            
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            window.location.href = 'login.html';
            return { success: true };
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            return { success: false, error: error.message };
        }
    }

    async function loadUserData(userId) {
        try {
            const stored = localStorage.getItem('itzli_user_data');
            if (stored) {
                userData = JSON.parse(stored);
                return userData;
            }
            const profile = {
                id: userId,
                email: currentUser?.email || '',
                username: 'Usuario',
                plan: 'premium',
                registeredAt: new Date().toISOString()
            };
            localStorage.setItem('itzli_user_data', JSON.stringify(profile));
            userData = profile;
            return profile;
        } catch (error) {
            console.error('Error cargando datos de usuario:', error);
            return null;
        }
    }

    async function checkSession() {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
                console.error('Error verificando sesión:', error);
                return false;
            }
            if (data?.session?.user) {
                currentUser = data.session.user;
                await loadUserData(currentUser.id);
                return true;
            }
            const demoMode = localStorage.getItem('itzli_demo_mode');
            if (demoMode === 'true') {
                const stored = localStorage.getItem('itzli_user_data');
                if (stored) {
                    userData = JSON.parse(stored);
                    currentUser = userData;
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error en checkSession:', error);
            return false;
        }
    }

    function getUserData() {
        return userData;
    }

    function getCurrentUser() {
        return currentUser;
    }

    function isDemoMode() {
        return localStorage.getItem('itzli_demo_mode') === 'true';
    }

    window.ITZTLI = {
        CONFIG: CONFIG,
        init: init,
        login: login,
        register: register,
        demoLogin: demoLogin,
        logout: logout,
        checkSession: checkSession,
        getUserData: getUserData,
        getCurrentUser: getCurrentUser,
        isDemoMode: isDemoMode
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(() => {
            if (typeof supabase === 'undefined' && window.supabase) {
                init();
            }
        }, 100);
    }
})();