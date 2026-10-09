// =======================================================================
// ACHADOS DA NANDA PRO - BACKGROUND SERVICE WORKER (MANIFEST V3)
// Realiza requisições cross-origin com permissões completas de host
// =======================================================================

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Achados da Nanda PRO] Extensão instalada com sucesso.');
});

// Listener de mensagens de content scripts para contornar restrições cross-origin do Manifest V3
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CACHE_PRODUCTS') {
    const backendUrl = request.backendUrl || 'https://achadosdananda.vercel.app';
    const items = request.items || [];

    if (items.length === 0) {
      sendResponse({ success: false, error: 'Nenhum item para salvar' });
      return false;
    }

    fetch(`${backendUrl}/api/marketplaces/mercadolivre/cache-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
      .then((res) => res.json())
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((err) => {
        console.error('[ServiceWorker] Erro ao enviar cache:', err);
        sendResponse({ success: false, error: err.message });
      });

    return true; // Mantém o canal de resposta aberto de forma assíncrona
  }

  if (request.action === 'SAVE_EXTENSION') {
    const backendUrl = request.backendUrl || 'https://achadosdananda.vercel.app';
    fetch(`${backendUrl}/api/extension/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: request.items || [],
        action: request.saveAction || 'QUEUE',
        templateId: request.templateId,
        groupIds: request.groupIds,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((err) => {
        console.error('[ServiceWorker] Erro ao salvar extensão:', err);
        sendResponse({ success: false, error: err.message });
      });

    return true;
  }

  if (request.action === 'FETCH_PENDING_QUEUE') {
    const backendUrl = request.backendUrl || 'https://achadosdananda.vercel.app';
    fetch(`${backendUrl}/api/queue?status=PENDING`)
      .then((res) => res.json())
      .then((data) => sendResponse(data))
      .catch((err) => {
        console.error('[ServiceWorker] Erro ao buscar fila pendente:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (request.action === 'MARK_PUBLISHED') {
    const backendUrl = request.backendUrl || 'https://achadosdananda.vercel.app';
    const id = request.id;
    fetch(`${backendUrl}/api/queue/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'PUBLISH_NOW' }),
    })
      .then((res) => res.json())
      .then((data) => sendResponse(data))
      .catch((err) => {
        console.error('[ServiceWorker] Erro ao marcar como publicado:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (request.action === 'FETCH_IMAGE_BASE64') {
    const imageUrl = request.url;
    if (!imageUrl) {
      sendResponse({ success: false, error: 'URL da imagem vazia' });
      return false;
    }
    fetch(imageUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        return res.arrayBuffer().then((buf) => ({ buf, contentType }));
      })
      .then(({ buf, contentType }) => {
        let binary = '';
        const bytes = new Uint8Array(buf);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const b64 = btoa(binary);
        sendResponse({ success: true, dataUrl: `data:${contentType};base64,${b64}`, contentType });
      })
      .catch((err) => {
        console.error('[ServiceWorker] Erro ao baixar imagem do produto:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});
