self.addEventListener('fetch', (event) => {
  // Esse código básico já permite a instalação do PWA
  event.respondWith(fetch(event.request));
});
