// Define o nome do cache
const CACHE_NOME = 'curriculo-corredores-v5'; // ATUALIZADO para v5 (Esta é a correção)

// Lista de arquivos exatos do seu projeto para o App Shell
const listaUrlsParaCache = [
  '.',
  'index.html',
  'css/styles.css',
  'js/config.js',
  'js/admin-logic.js',
  'js/main-logic.js',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
  // NOTA: Não estamos cacheando os scripts do Firebase ou Boxicons no 'install'
  // Eles serão cacheados dinamicamente pela rede no evento 'fetch'.
];

// Evento 'install': Salva os arquivos do App Shell no cache
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Instalando (v5)...');
  event.waitUntil(
    caches.open(CACHE_NOME)
      .then((cache) => {
        console.log('[ServiceWorker] Abrindo cache e salvando o App Shell (v5)');
        return cache.addAll(listaUrlsParaCache);
      })
      .then(() => {
        console.log('[ServiceWorker] Instalação completa (v5), App Shell cacheado.');
        return self.skipWaiting(); // Força o novo SW a ativar
      })
      .catch((error) => {
        console.error('[ServiceWorker] Falha ao cachear o App Shell (v5):', error);
      })
  );
});

// Evento 'activate': Limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Ativando (v5)...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Deleta caches que não sejam o cache atual
          if (cacheName !== CACHE_NOME) {
            console.log('[ServiceWorker] Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[ServiceWorker] Ativado (v5) e pronto para controlar a página.');
        return self.clients.claim(); // Torna-se o SW controlador imediatamente
    })
  );
});

// Evento 'fetch': Intercepta requisições
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Se a requisição for para nosso próprio domínio (App Shell)
  if (requestUrl.origin === self.location.origin) {
    // Estratégia: Cache first, fallback to network
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((networkResponse) => {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NOME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              return networkResponse;
            }
          ).catch((error) => {
            console.error('[ServiceWorker] Falha no fetch (App Shell):', error);
          });
        })
    );
  } else {
    // Para requisições de terceiros (Firebase, CDNs, Cloudinary)
    // Estratégia: Network first, fallback to cache
    event.respondWith(
      caches.open(CACHE_NOME).then((cache) => {
        return fetch(event.request).then((networkResponse) => {
          // Salva no cache e retorna
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        }).catch(() => {
          // Falhou na rede? Tenta pegar do cache.
          return cache.match(event.request);
        });
      })
    );
  }
});