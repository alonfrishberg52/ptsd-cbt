/**
 * Service Worker for NarraTIVE Dashboard
 * Provides offline functionality and caching
 */

const CACHE_NAME = 'narrative-dashboard-v1.0.0';
const STATIC_CACHE_NAME = 'narrative-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'narrative-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/dashboard',
    '/static/dashboard/css/dashboard_enhanced.css',
    '/static/dashboard/css/dashboard.css',
    '/static/dashboard/js/dashboard_enhanced.js',
    '/static/img/logo.png',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.js',
    'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// API endpoints to cache with network-first strategy
const API_ENDPOINTS = [
    '/api/dashboard',
    '/api/patients',
    '/api/stories',
    '/api/notifications'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('[SW] Installing Service Worker');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching static files');
                return cache.addAll(STATIC_FILES.map(url => new Request(url, { mode: 'no-cors' })));
            })
            .catch(error => {
                console.error('[SW] Error caching static files:', error);
            })
    );
    
    // Force the waiting service worker to become active
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating Service Worker');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE_NAME && 
                            cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
    );
    
    // Take control of all pages immediately
    return self.clients.claim();
});

// Fetch event - handle requests with different strategies
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests and chrome-extension requests
    if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
        return;
    }
    
    // API requests - Network first, then cache
    if (API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
        event.respondWith(networkFirstStrategy(request));
        return;
    }
    
    // Static files - Cache first, then network
    if (STATIC_FILES.includes(url.pathname) || 
        url.pathname.startsWith('/static/') ||
        url.hostname === 'cdn.jsdelivr.net' ||
        url.hostname === 'fonts.googleapis.com') {
        event.respondWith(cacheFirstStrategy(request));
        return;
    }
    
    // HTML pages - Stale while revalidate
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(staleWhileRevalidateStrategy(request));
        return;
    }
    
    // Default - Network only
    event.respondWith(fetch(request));
});

/**
 * Cache first strategy - good for static assets
 */
async function cacheFirstStrategy(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache first strategy failed:', error);
        return new Response('Offline - Asset not cached', { status: 503 });
    }
}

/**
 * Network first strategy - good for API calls
 */
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', error);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline response for API calls
        return new Response(JSON.stringify({
            status: 'offline',
            message: 'אין חיבור לאינטרנט. מציג נתונים שמורים.',
            cached: true
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Stale while revalidate strategy - good for HTML pages
 */
async function staleWhileRevalidateStrategy(request) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await caches.match(request);
    
    const networkResponsePromise = fetch(request)
        .then(response => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);
    
    // Return cached version immediately if available
    if (cachedResponse) {
        // Update cache in background
        networkResponsePromise;
        return cachedResponse;
    }
    
    // Wait for network if no cache
    const networkResponse = await networkResponsePromise;
    return networkResponse || createOfflinePage();
}

/**
 * Create offline fallback page
 */
function createOfflinePage() {
    const offlineHTML = `
        <!DOCTYPE html>
        <html lang="he" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>אופליין - NarraTIVE</title>
            <style>
                body {
                    font-family: 'Heebo', Arial, sans-serif;
                    background: linear-gradient(135deg, #2563eb 0%, #10b981 100%);
                    color: white;
                    margin: 0;
                    padding: 0;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                }
                .offline-container {
                    max-width: 500px;
                    padding: 2rem;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    backdrop-filter: blur(20px);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                }
                .offline-icon {
                    font-size: 4rem;
                    margin-bottom: 1.5rem;
                    opacity: 0.8;
                }
                .offline-title {
                    font-size: 2rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                }
                .offline-message {
                    font-size: 1.1rem;
                    line-height: 1.6;
                    margin-bottom: 2rem;
                    opacity: 0.9;
                }
                .retry-btn {
                    background: rgba(255, 255, 255, 0.2);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    padding: 0.75rem 2rem;
                    border-radius: 50px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-decoration: none;
                    display: inline-block;
                }
                .retry-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: translateY(-2px);
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.8; }
                    50% { opacity: 1; }
                }
                .pulse {
                    animation: pulse 2s ease-in-out infinite;
                }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="offline-icon pulse">📡</div>
                <h1 class="offline-title">אין חיבור לאינטרנט</h1>
                <p class="offline-message">
                    המערכת פועלת במצב אופליין. חלק מהתכונות עשויות להיות מוגבלות.
                    אנא בדוק את החיבור שלך לאינטרנט ונסה שוב.
                </p>
                <button class="retry-btn" onclick="window.location.reload()">
                    נסה שוב
                </button>
            </div>
        </body>
        </html>
    `;
    
    return new Response(offlineHTML, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

// Background sync for offline actions
self.addEventListener('sync', event => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'sync-patient-data') {
        event.waitUntil(syncPatientData());
    }
    
    if (event.tag === 'sync-session-notes') {
        event.waitUntil(syncSessionNotes());
    }
});

/**
 * Sync patient data when back online
 */
async function syncPatientData() {
    try {
        console.log('[SW] Syncing patient data...');
        
        // Get offline patient data from IndexedDB or localStorage
        const offlineData = await getOfflinePatientData();
        
        if (offlineData && offlineData.length > 0) {
            for (const data of offlineData) {
                try {
                    await fetch('/api/patients', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(data)
                    });
                } catch (error) {
                    console.error('[SW] Failed to sync patient data:', error);
                }
            }
            
            // Clear offline data after successful sync
            await clearOfflinePatientData();
            console.log('[SW] Patient data synced successfully');
        }
    } catch (error) {
        console.error('[SW] Sync patient data failed:', error);
    }
}

/**
 * Sync session notes when back online
 */
async function syncSessionNotes() {
    try {
        console.log('[SW] Syncing session notes...');
        
        const offlineNotes = await getOfflineSessionNotes();
        
        if (offlineNotes && offlineNotes.length > 0) {
            for (const note of offlineNotes) {
                try {
                    await fetch('/api/session-notes/save', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(note)
                    });
                } catch (error) {
                    console.error('[SW] Failed to sync session note:', error);
                }
            }
            
            await clearOfflineSessionNotes();
            console.log('[SW] Session notes synced successfully');
        }
    } catch (error) {
        console.error('[SW] Sync session notes failed:', error);
    }
}

// Push notifications
self.addEventListener('push', event => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body || 'יש לך התראה חדשה',
        icon: '/static/img/logo.png',
        badge: '/static/img/badge.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'general',
        actions: [
            {
                action: 'view',
                title: 'הצג',
                icon: '/static/img/view-icon.png'
            },
            {
                action: 'dismiss',
                title: 'סגור',
                icon: '/static/img/close-icon.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'NarraTIVE', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/dashboard')
        );
    }
});

// Helper functions for offline data management
async function getOfflinePatientData() {
    // Implementation would use IndexedDB
    return [];
}

async function clearOfflinePatientData() {
    // Implementation would clear IndexedDB
}

async function getOfflineSessionNotes() {
    // Implementation would use IndexedDB
    return [];
}

async function clearOfflineSessionNotes() {
    // Implementation would clear IndexedDB
}

// Message handling for communication with main thread
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

console.log('[SW] Service Worker loaded successfully'); 