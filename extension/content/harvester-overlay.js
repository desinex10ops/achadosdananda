// =======================================================================
// ACHADOS DA NANDA PRO - AUTO-SCROLL HARVESTER & AFFILIATE INJECTOR
// Monitora a rolagem na página, colhe ofertas automaticamente e
// injeta as tags de afiliada nos links em tempo real.
// =======================================================================

(function () {
  'use strict';

  // Evita reinjeção dupla
  if (window.__nanda_harvester_initialized) return;
  window.__nanda_harvester_initialized = true;

  // Estado global do Harvester
  const capturedOffers = new Map();
  let isAutoScrollActive = true;
  let backendUrl = 'http://localhost:3000';
  let affiliateTags = {
    amazon: 'achadosnanda-20',
    'mercado-livre': 'meli-achadosnanda',
    shopee: 'achadosdananda-20',
    magalu: 'magalu-nanda',
  };

  // Identificar marketplace atual
  function getMarketplace() {
    const host = window.location.hostname;
    if (host.includes('mercadolivre') || host.includes('mercadolibre')) return 'Mercado Livre';
    if (host.includes('shopee')) return 'Shopee';
    if (host.includes('amazon')) return 'Amazon';
    if (host.includes('magazineluiza') || host.includes('magazinevoce')) return 'Magalu';
    return 'Geral';
  }

  const currentMarketplace = getMarketplace();

  // Carregar configurações do storage da extensão
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['backendUrl', 'affiliateTags'], (res) => {
      if (res.backendUrl) backendUrl = res.backendUrl;
      if (res.affiliateTags) affiliateTags = { ...affiliateTags, ...res.affiliateTags };
      updateWidget();
    });
  }

  // 1. Injetor de código de afiliada nos links
  function injectAffiliateTag(rawUrl) {
    if (!rawUrl) return '';
    try {
      const urlObj = new URL(rawUrl.startsWith('//') ? 'https:' + rawUrl : rawUrl);
      const cleanBase = `${urlObj.origin}${urlObj.pathname}`;

      if (currentMarketplace === 'Amazon') {
        const tag = affiliateTags.amazon || 'achadosnanda-20';
        urlObj.searchParams.set('tag', tag);
        urlObj.searchParams.delete('ref');
        urlObj.searchParams.delete('pf_rd_r');
        return urlObj.toString();
      }

      if (currentMarketplace === 'Mercado Livre') {
        const tag = affiliateTags['mercado-livre'] || 'meli-achadosnanda';
        urlObj.searchParams.set('matt_tool', tag);
        urlObj.searchParams.set('tracking_id', tag);
        return urlObj.toString();
      }

      if (currentMarketplace === 'Shopee') {
        const tag = affiliateTags.shopee || 'achadosdananda-20';
        urlObj.searchParams.set('utm_source', tag);
        urlObj.searchParams.set('aff_sub', tag);
        return urlObj.toString();
      }

      return cleanBase;
    } catch (e) {
      return rawUrl;
    }
  }

  // 2. Extração de ofertas de acordo com o marketplace
  function scanPageOffers() {
    if (!isAutoScrollActive) return;

    let cards = [];
    if (currentMarketplace === 'Mercado Livre') {
      cards = document.querySelectorAll('.poly-card, li.ui-search-layout__item, .ui-search-result, .promotion-item, .andes-card');
      cards.forEach((card) => {
        try {
          const titleLink = card.querySelector('a.poly-component__title') ||
            card.querySelector('a.ui-search-link__title-card') ||
            card.querySelector('a.ui-search-item__group__element') ||
            card.querySelector('a[href*="MLB"]');
          if (!titleLink) return;

          const title = titleLink.innerText.trim();
          let href = titleLink.getAttribute('href') || '';
          if (!title || !href) return;
          const cleanUrl = href.split('?')[0].split('#')[0];
          if (capturedOffers.has(cleanUrl)) return;

          const fracElem = card.querySelector('.andes-money-amount__fraction') ||
            card.querySelector('.poly-price__current .andes-money-amount__fraction');
          const centsElem = card.querySelector('.andes-money-amount__cents');
          let currentPrice = 0;
          if (fracElem) {
            const intPart = fracElem.innerText.replace(/\D/g, '');
            const centsPart = centsElem ? centsElem.innerText.replace(/\D/g, '') : '00';
            currentPrice = parseFloat(`${intPart}.${centsPart}`);
          }
          if (!currentPrice || currentPrice <= 0) return;

          const origFrac = card.querySelector('s .andes-money-amount__fraction') ||
            card.querySelector('.poly-price__original-value .andes-money-amount__fraction');
          let originalPrice = currentPrice;
          if (origFrac) {
            const raw = parseFloat(origFrac.innerText.replace(/\D/g, ''));
            if (raw > currentPrice) originalPrice = raw;
          }

          const imgElem = card.querySelector('img.poly-component__picture') || card.querySelector('img[src*="http"]');
          const imageUrl = imgElem ? (imgElem.getAttribute('data-src') || imgElem.src) : '';

          let discount = 0;
          const discElem = card.querySelector('.andes-money-amount__discount') || card.querySelector('[class*="discount"]');
          if (discElem) {
            const m = discElem.innerText.match(/\d+/);
            if (m) discount = parseInt(m[0]);
          }
          if (discount === 0 && originalPrice > currentPrice) {
            discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
          }

          const affiliateUrl = injectAffiliateTag(href);

          capturedOffers.set(cleanUrl, {
            id: `ml_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            marketplace: 'Mercado Livre',
            title,
            currentPrice,
            originalPrice,
            discountPercentage: discount,
            imageUrl,
            originalUrl: cleanUrl,
            affiliateUrl,
            shippingInfo: card.innerText.includes('FULL') ? 'Frete Grátis FULL' : 'Mercado Envios',
            capturedAt: new Date().toISOString(),
          });
        } catch (e) {}
      });
    } else if (currentMarketplace === 'Amazon') {
      cards = document.querySelectorAll('div[data-component-type="s-search-result"], .s-result-item, .deal-card, div[data-asin]');
      cards.forEach((card) => {
        try {
          const asin = card.getAttribute('data-asin');
          const titleElem = card.querySelector('h2 a span') || card.querySelector('h2') || card.querySelector('.a-link-normal .a-text-normal');
          const linkElem = card.querySelector('h2 a') || card.querySelector('a.a-link-normal[href*="/dp/"]');
          if (!titleElem || !linkElem) return;

          const title = titleElem.innerText.trim();
          let href = linkElem.getAttribute('href') || '';
          if (!title || !href) return;
          if (href.startsWith('/')) href = 'https://www.amazon.com.br' + href;
          const cleanUrl = href.split('?')[0].split('/ref=')[0];
          if (capturedOffers.has(cleanUrl)) return;

          const priceWhole = card.querySelector('.a-price .a-price-whole');
          const priceFraction = card.querySelector('.a-price .a-price-fraction');
          let currentPrice = 0;
          if (priceWhole) {
            const w = priceWhole.innerText.replace(/\D/g, '');
            const f = priceFraction ? priceFraction.innerText.replace(/\D/g, '') : '00';
            currentPrice = parseFloat(`${w}.${f}`);
          }
          if (!currentPrice || currentPrice <= 0) return;

          const oldPriceElem = card.querySelector('.a-text-price .a-offscreen') || card.querySelector('s .a-price-whole');
          let originalPrice = currentPrice;
          if (oldPriceElem) {
            const raw = parseFloat(oldPriceElem.innerText.replace(/[^\d,]/g, '').replace(',', '.'));
            if (raw > currentPrice) originalPrice = raw;
          }

          const imgElem = card.querySelector('img.s-image') || card.querySelector('img[src*="media-amazon"]');
          const imageUrl = imgElem ? imgElem.src : '';

          let discount = originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
          const affiliateUrl = injectAffiliateTag(href);

          capturedOffers.set(cleanUrl, {
            id: `amz_${asin || Date.now()}`,
            marketplace: 'Amazon',
            title,
            currentPrice,
            originalPrice,
            discountPercentage: discount,
            imageUrl,
            originalUrl: cleanUrl,
            affiliateUrl,
            shippingInfo: card.innerText.includes('Prime') ? 'Frete Grátis Prime' : 'Frete Padrão',
            capturedAt: new Date().toISOString(),
          });
        } catch (e) {}
      });
    } else if (currentMarketplace === 'Shopee') {
      cards = document.querySelectorAll('.shopee-search-item-result__item, [data-sqe="item"], .item-card-list__item');
      cards.forEach((card) => {
        try {
          const linkElem = card.querySelector('a[href*="-i."]') || card.querySelector('a[data-sqe="link"]') || card.querySelector('a');
          if (!linkElem) return;
          let href = linkElem.getAttribute('href') || '';
          if (!href) return;
          if (href.startsWith('/')) href = 'https://shopee.com.br' + href;
          const cleanUrl = href.split('?')[0];
          if (capturedOffers.has(cleanUrl)) return;

          const titleElem = card.querySelector('.WBVL_7') || card.querySelector('._44qnta') || card.querySelector('[data-sqe="name"]') || card.querySelector('img[alt]');
          const title = titleElem ? (titleElem.innerText || titleElem.getAttribute('alt') || '').trim() : '';
          if (!title) return;

          const priceElem = card.querySelector('.pqTWkA') || card.querySelector('._3n5zSv') || card.querySelector('.G274f_');
          let currentPrice = 0;
          if (priceElem) {
            const m = priceElem.innerText.replace(/\./g, '').replace(',', '.').match(/[\d.]+/);
            if (m) currentPrice = parseFloat(m[0]);
          }
          if (!currentPrice || currentPrice <= 0) return;

          const origPriceElem = card.querySelector('.Y3gOH7') || card.querySelector('._0Z3IdI');
          let originalPrice = currentPrice;
          if (origPriceElem) {
            const m = origPriceElem.innerText.replace(/\./g, '').replace(',', '.').match(/[\d.]+/);
            if (m && parseFloat(m[0]) > currentPrice) originalPrice = parseFloat(m[0]);
          }

          const imgElem = card.querySelector('img');
          const imageUrl = imgElem ? imgElem.src : '';

          let discount = originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
          const affiliateUrl = injectAffiliateTag(href);

          capturedOffers.set(cleanUrl, {
            id: `shp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            marketplace: 'Shopee',
            title,
            currentPrice,
            originalPrice,
            discountPercentage: discount,
            imageUrl,
            originalUrl: cleanUrl,
            affiliateUrl,
            shippingInfo: 'Frete Grátis com cupom Shopee',
            capturedAt: new Date().toISOString(),
          });
        } catch (e) {}
      });
    }

    // Salvar no storage da extensão para o popup
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        capturedOffersList: Array.from(capturedOffers.values()),
        lastMarketplace: currentMarketplace,
      });
    }

    updateWidget();
  }

  // 3. Interface Flutuante na Página (HUD Widget)
  let widgetContainer = null;

  function createWidget() {
    if (document.getElementById('nanda-harvester-widget')) return;

    widgetContainer = document.createElement('div');
    widgetContainer.id = 'nanda-harvester-widget';
    widgetContainer.innerHTML = `
      <div id="nanda-widget-card" style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        background: linear-gradient(135deg, #18181b 0%, #09090b 100%);
        border: 2px solid #ec4899;
        border-radius: 16px;
        box-shadow: 0 10px 25px -5px rgba(236, 72, 153, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        padding: 14px 16px;
        width: 320px;
        font-size: 13px;
        box-sizing: border-box;
        transition: all 0.3s ease;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; background: #ec4899; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold;">⚡</div>
            <div>
              <div style="font-weight: 700; color: #fdf2f8; font-size: 13px;">Achados da Nanda</div>
              <div style="font-size: 10px; color: #f472b6;">Auto-Captura ao Rolar</div>
            </div>
          </div>
          <button id="nanda-btn-toggle" style="background: rgba(255,255,255,0.1); border: none; color: #cbd5e1; border-radius: 6px; padding: 3px 8px; cursor: pointer; font-size: 11px;">Minimizar</button>
        </div>

        <div id="nanda-widget-body">
          <div style="background: rgba(255, 255, 255, 0.05); padding: 8px 12px; border-radius: 10px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #94a3b8; font-size: 12px;">Ofertas Capturadas:</span>
              <span id="nanda-offer-count" style="font-size: 16px; font-weight: 800; color: #38bdf8;">0</span>
            </div>
            <div style="font-size: 10px; color: #10b981; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
              <span>✓ Link com seu código de afiliado</span>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px;">
            <button id="nanda-btn-send-queue" style="
              background: linear-gradient(135deg, #ec4899, #db2777);
              border: none;
              color: white;
              font-weight: 600;
              padding: 9px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              transition: transform 0.1s;
            ">⚡ Enviar Todas para Fila (<span id="nanda-badge-queue">0</span>)</button>

            <button id="nanda-btn-copy-all" style="
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.15);
              color: white;
              font-weight: 500;
              padding: 7px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 11px;
            ">📋 Copiar Ofertas Formatadas</button>

            <div style="display: flex; gap: 6px; margin-top: 4px;">
              <button id="nanda-btn-send-radar" style="
                flex: 1;
                background: transparent;
                border: 1px solid #f59e0b;
                color: #fbbf24;
                font-size: 10px;
                padding: 5px;
                border-radius: 6px;
                cursor: pointer;
              ">🔥 Salvar no Radar</button>
              <button id="nanda-btn-clear" style="
                background: transparent;
                border: 1px solid #ef4444;
                color: #f87171;
                font-size: 10px;
                padding: 5px 8px;
                border-radius: 6px;
                cursor: pointer;
              ">Limpar</button>
            </div>
          </div>

          <div id="nanda-status-msg" style="margin-top: 8px; font-size: 11px; text-align: center; color: #a1a1aa; min-height: 14px;">Role a página para capturar</div>
        </div>
      </div>
    `;

    document.body.appendChild(widgetContainer);

    // Eventos dos botões do widget
    const btnSendQueue = document.getElementById('nanda-btn-send-queue');
    const btnCopyAll = document.getElementById('nanda-btn-copy-all');
    const btnSendRadar = document.getElementById('nanda-btn-send-radar');
    const btnClear = document.getElementById('nanda-btn-clear');
    const btnToggle = document.getElementById('nanda-btn-toggle');
    const widgetBody = document.getElementById('nanda-widget-body');
    const statusMsg = document.getElementById('nanda-status-msg');

    let isMinimized = false;
    btnToggle.addEventListener('click', () => {
      isMinimized = !isMinimized;
      widgetBody.style.display = isMinimized ? 'none' : 'block';
      btnToggle.innerText = isMinimized ? 'Expandir' : 'Minimizar';
    });

    btnClear.addEventListener('click', () => {
      capturedOffers.clear();
      updateWidget();
      statusMsg.innerText = 'Lista limpa.';
      setTimeout(() => { statusMsg.innerText = 'Role a página para capturar'; }, 2000);
    });

    btnCopyAll.addEventListener('click', () => {
      if (capturedOffers.size === 0) {
        statusMsg.innerText = 'Nenhuma oferta capturada ainda.';
        return;
      }
      const list = Array.from(capturedOffers.values());
      const formatted = list.map((item) => {
        return `🔥 *${item.title}*\n` +
          (item.originalPrice > item.currentPrice ? `De: ~R$ ${item.originalPrice.toFixed(2).replace('.', ',')}~\n` : '') +
          `💥 *Por apenas: R$ ${item.currentPrice.toFixed(2).replace('.', ',')}*\n` +
          (item.discountPercentage > 0 ? `📉 Desconto: ${item.discountPercentage}% OFF\n` : '') +
          `🚚 ${item.shippingInfo}\n` +
          `🛒 *Link com desconto:*\n${item.affiliateUrl}\n\n`;
      }).join('-------------------------\n');

      navigator.clipboard.writeText(formatted).then(() => {
        statusMsg.innerText = `✅ ${list.length} ofertas copiadas com seu link!`;
        statusMsg.style.color = '#10b981';
        setTimeout(() => {
          statusMsg.innerText = 'Role a página para capturar';
          statusMsg.style.color = '#a1a1aa';
        }, 3000);
      });
    });

    btnSendQueue.addEventListener('click', async () => {
      if (capturedOffers.size === 0) {
        statusMsg.innerText = 'Nenhuma oferta para enviar.';
        return;
      }
      statusMsg.innerText = 'Enviando para a Fila do Sistema...';
      statusMsg.style.color = '#38bdf8';

      try {
        const list = Array.from(capturedOffers.values());
        const res = await fetch(`${backendUrl}/api/extension/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: list,
            action: 'QUEUE',
          }),
        });

        const json = await res.json();
        if (json.success) {
          statusMsg.innerText = `🎉 ${list.length} ofertas salvas na fila!`;
          statusMsg.style.color = '#10b981';
          setTimeout(() => {
            capturedOffers.clear();
            updateWidget();
            statusMsg.innerText = 'Role a página para capturar';
            statusMsg.style.color = '#a1a1aa';
          }, 3000);
        } else {
          statusMsg.innerText = `Erro: ${json.error || 'Falha ao salvar'}`;
          statusMsg.style.color = '#ef4444';
        }
      } catch (err) {
        statusMsg.innerText = 'Erro ao conectar no servidor local/Vercel.';
        statusMsg.style.color = '#ef4444';
      }
    });

    btnSendRadar.addEventListener('click', async () => {
      if (capturedOffers.size === 0) return;
      statusMsg.innerText = 'Salvando no Radar...';
      try {
        const list = Array.from(capturedOffers.values());
        const res = await fetch(`${backendUrl}/api/extension/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: list,
            action: 'RADAR',
          }),
        });
        const json = await res.json();
        if (json.success) {
          statusMsg.innerText = `🔥 ${list.length} salvas no Radar!`;
          statusMsg.style.color = '#f59e0b';
        }
      } catch (err) {
        statusMsg.innerText = 'Erro de conexão com o sistema.';
      }
    });
  }

  function updateWidget() {
    createWidget();
    const countElem = document.getElementById('nanda-offer-count');
    const badgeQueue = document.getElementById('nanda-badge-queue');
    if (countElem) countElem.innerText = capturedOffers.size;
    if (badgeQueue) badgeQueue.innerText = capturedOffers.size;
  }

  // 4. Debounce do Scroll para máxima performance sem travar a navegação
  let scrollTimeout = null;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      scanPageOffers();
    }, 250);
  }, { passive: true });

  // 5. MutationObserver para detectar conteúdo dinâmico (carregamento infinito)
  const observer = new MutationObserver(() => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      scanPageOffers();
    }, 400);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Scan inicial
  setTimeout(() => {
    createWidget();
    scanPageOffers();
  }, 1000);

  // Escuta mensagens do popup da extensão
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'GET_HARVESTED_OFFERS') {
        sendResponse({
          success: true,
          offers: Array.from(capturedOffers.values()),
          marketplace: currentMarketplace,
        });
        return true;
      }
      if (request.action === 'CLEAR_HARVESTED_OFFERS') {
        capturedOffers.clear();
        updateWidget();
        sendResponse({ success: true });
        return true;
      }
    });
  }
})();
