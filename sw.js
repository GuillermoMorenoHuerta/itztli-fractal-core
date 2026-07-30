// ITZTLI FRACTAL CORE - Service Worker v1.0
// Seguridad cuántica para aplicaciones web progresivas

const CACHE_NAME = 'itzli-fractal-core-v1.0.0';
const STATIC_ASSETS = [
    '/',
    '/login.html',
    '/index.html',
    '/itzli-demo.html',
    '/itzli-premium.html',
    '/itzli-platinum.html',
    '/productos.html',
    '/desarrolladores.html',
    '/desafio.html',
    '/checkout.html',
    '/itzli-auth.js',
    '/manifest.json',
    '/assets/favicon.ico',
    '/imagenes/frontal.jpg',
    '/imagenes/reversa.jpg',
    '/imagenes/interior.jpg',
    '/imagenes/cuantica.png',
    '/imagenes/infografia-auto.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
    console.log('🌀 ITZTLI SW: Instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('🌀 ITZTLI SW: Cacheando archivos estáticos');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('🌀 ITZTLI SW: Instalación completada');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('🌀 ITZTLI SW: Error en instalación:', error);
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
    console.log('🌀 ITZTLI SW: Activando...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('🌀 ITZTLI SW: Eliminando cache antiguo:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('🌀 ITZTLI SW: Activación completada');
                return self.clients.claim();
            })
    );
});

// Estrategia de cache: Network First con fallback a cache
self.addEventListener('fetch', (event) => {
    // No interceptar peticiones a Supabase o Stripe
    if (event.request.url.includes('supabase.co') || 
        event.request.url.includes('stripe.com') ||
        event.request.url.includes('js.stripe.com')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Si la respuesta es válida, guardarla en cache
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                }
                return response;
            })
            .catch(() => {
                // Si falla la red, intentar servir desde cache
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Si no está en cache, mostrar página offline
                        if (event.request.mode === 'navigate') {
                            return caches.match('/login.html');
                        }
                        return new Response('Sin conexión', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// Manejar mensajes desde la aplicación
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME)
            .then(() => {
                console.log('🌀 ITZTLI SW: Cache limpiado');
                event.ports[0].postMessage({ success: true });
            });
    }
});

// Sincronización en segundo plano
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-keys') {
        event.waitUntil(
            // Sincronizar claves ITZTLI cuando haya conexión
            syncItzliKeys()
        );
    }
});

// Función de sincronización de claves
async function syncItzliKeys() {
    try {
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                timestamp: Date.now()
            });
        });
        console.log('🌀 ITZTLI SW: Sincronización completada');
    } catch (error) {
        console.error('🌀 ITZTLI SW: Error en sincronización:', error);
    }
}

// Notificaciones push
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'ITZTLI - Actualización de seguridad',
        icon: '/imagenes/itzli-192.png',
        badge: '/imagenes/itzli-192.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: 'Abrir ITZTLI'
            },
            {
                action: 'close',
                title: 'Cerrar'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('ITZTLI FRACTAL CORE', options)
    );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/login.html')
        );
    }
});