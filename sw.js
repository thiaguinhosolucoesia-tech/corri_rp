// Define o nome do cache
const CACHE_NOME = 'curriculo-corredores-v5'; // ATUALIZADO para v5

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
  console.log('[ServiceWorker] Instalando (v5)...'); // Log atualizado
  event.waitUntil(
    caches.open(CACHE_NOME)
      .then((cache) => {
        console.log('[ServiceWorker] Abrindo cache e salvando o App Shell (v5)'); // Log atualizado
        // Importante: Limpar o cache antigo ANTES de adicionar o novo
        // para garantir que a rede seja usada se addAll falhar parcialmente.
        // Ou podemos confiar na fase 'activate' para limpar depois.
        // Mantendo como está por enquanto, mas ciente do risco.
        return cache.addAll(listaUrlsParaCache);
      })
      .then(() => {
        console.log('[ServiceWorker] Instalação completa (v5), App Shell cacheado.'); // Log atualizado
        return self.skipWaiting(); // Força o novo SW a ativar
      })
      .catch((error) => {
        console.error('[ServiceWorker] Falha ao cachear o App Shell (v5):', error); // Log atualizado
      })
  );
});

// Evento 'activate': Limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Ativando (v5)...'); // Log atualizado
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Deleta caches que não sejam o cache atual (v5)
          if (cacheName !== CACHE_NOME) {
            console.log('[ServiceWorker] Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[ServiceWorker] Ativado (v5) e pronto para controlar a página.'); // Log atualizado
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
          // Se encontrou no cache, retorna
          if (response) {
            return response;
          }
          // Se não encontrou, busca na rede
          return fetch(event.request).then((networkResponse) => {
              // Clona a resposta para poder salvar no cache E retornar ao navegador
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NOME)
                .then((cache) => {
                  // Adiciona a resposta da rede ao cache
                  cache.put(event.request, responseToCache);
                });
              // Retorna a resposta original da rede
              return networkResponse;
            }
          ).catch((error) => {
            // Tratamento de erro caso a rede falhe e não haja nada no cache
            console.error('[ServiceWorker] Falha no fetch (App Shell) - Cache Miss e Network Error:', error);
            // Poderia retornar uma página offline padrão aqui, se tivesse uma
          });
        })
    );
  } else {
    // Para requisições de terceiros (Firebase, CDNs, Cloudinary, Boxicons)
    // Estratégia: Network first, fallback to cache (Stale-While-Revalidate implícito)
    event.respondWith(
      caches.open(CACHE_NOME).then((cache) => {
        // Tenta buscar primeiro na rede
        return fetch(event.request).then((networkResponse) => {
          // Salva a resposta da rede no cache para futuras requisições offline
          cache.put(event.request, networkResponse.clone());
          // Retorna a resposta da rede
          return networkResponse;
        }).catch(() => {
          // Se a rede falhar, tenta pegar do cache
          return cache.match(event.request).then(response => {
              // Retorna do cache se encontrado, senão falha (não há fallback offline padrão aqui)
              return response;
          });
        });
      })
    );
  }
});