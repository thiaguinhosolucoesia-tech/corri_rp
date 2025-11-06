// sw.js (V23 - LÓGICA CORRIGIDA)

// Define o nome do cache (NOVO NOME É OBRIGATÓRIO)
const CACHE_NOME = 'curriculo-corredores-v23'; 

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
];

// Evento 'install': Salva os arquivos do App Shell no cache
self.addEventListener('install', (event) => {
  console.log(`[ServiceWorker] Instalando (v23)...`);
  event.waitUntil(
    caches.open(CACHE_NOME)
      .then((cache) => {
        console.log(`[ServiceWorker] Abrindo cache e salvando o App Shell (v23)`);
        // addAll() fará o fetch dos arquivos
        return cache.addAll(listaUrlsParaCache);
      })
      .then(() => {
        console.log(`[ServiceWorker] Instalação completa (v23), App Shell cacheado.`);
        return self.skipWaiting(); // Força o novo SW a ativar
      })
      .catch((error) => {
        console.error(`[ServiceWorker] Falha ao cachear o App Shell (v23):`, error);
      })
  );
});

// Evento 'activate': Limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log(`[ServiceWorker] Ativando (v23)...`);
  event.waitUntil(
    caches.keys().then((nomesCache) => {
      return Promise.all(
        nomesCache.map((nome) => {
          if (nome !== CACHE_NOME) {
            console.log(`[ServiceWorker] Limpando cache antigo: ${nome}`);
            return caches.delete(nome);
          }
        })
      );
    }).then(() => {
        console.log('[ServiceWorker] Caches antigos limpos.');
        return self.clients.claim(); // Ativa imediatamente para todos os clientes
    })
  );
});

// Evento 'fetch': Lida com requisições
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não são GET (POST, PUT, etc.)
  if (event.request.method !== 'GET') {
    return; // Deixa o navegador lidar
  }

  // *** CORREÇÃO V23 (A MAIS IMPORTANTE) ***
  // Se a requisição NÃO for para o nosso próprio domínio (ex: Cloudinary, Firebase),
  // NÃO faça nada. Deixe o navegador lidar com ela. Isso corrige as fotos.
  if (!event.request.url.startsWith(self.location.origin)) {
    return; 
  }

  // Se for do nosso domínio (App Shell), usa a estratégia "Cache first, then network"
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 1. Encontrou no cache? Retorna do cache.
        if (response) {
          return response;
        }

        // 2. Não encontrou no cache? Busca na rede.
        console.log(`[ServiceWorker] Não encontrado no cache, buscando: ${event.request.url}`);
        return fetch(event.request)
          .then((networkResponse) => {
            // Clona e salva no cache (apenas se for do nosso domínio)
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NOME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          })
          .catch((error) => {
            console.error('[ServiceWorker] Falha no fetch:', error, event.request.url);
            // Opcional: retornar uma página de "offline" se desejar
          });
      })
  );
});
