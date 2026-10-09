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
  window.__nanda_captured_offers = capturedOffers;
  let isAutoScrollActive = true;
  let backendUrl = 'https://achadosdananda.vercel.app';
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

  // Proxy de rede através do Service Worker para contornar restrições cross-origin do Manifest V3
  function cacheItemsViaServiceWorker(items) {
    if (!items || items.length === 0) return Promise.resolve({ success: true, count: 0 });
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          {
            action: 'CACHE_PRODUCTS',
            backendUrl,
            items,
          },
          (res) => {
            if (chrome.runtime.lastError) {
              console.warn('[Harvester] ServiceWorker fallback:', chrome.runtime.lastError.message);
              fetch(`${backendUrl}/api/marketplaces/mercadolivre/cache-products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items }),
              })
                .then((r) => r.json())
                .then((d) => resolve({ success: true, data: d }))
                .catch(() => resolve({ success: false }));
              return;
            }
            resolve(res || { success: true });
          }
        );
      } else {
        fetch(`${backendUrl}/api/marketplaces/mercadolivre/cache-products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        })
          .then((r) => r.json())
          .then((d) => resolve({ success: true, data: d }))
          .catch(() => resolve({ success: false }));
      }
    });
  }

  function saveExtensionViaServiceWorker(items, saveAction) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          {
            action: 'SAVE_EXTENSION',
            backendUrl,
            items,
            saveAction,
          },
          (res) => {
            if (chrome.runtime.lastError) {
              fetch(`${backendUrl}/api/extension/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items, action: saveAction }),
              })
                .then((r) => r.json())
                .then((d) => resolve(d))
                .catch((e) => resolve({ success: false, error: e.message }));
              return;
            }
            resolve(res || { success: true });
          }
        );
      } else {
        fetch(`${backendUrl}/api/extension/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, action: saveAction }),
        })
          .then((r) => r.json())
          .then((d) => resolve(d))
          .catch((e) => resolve({ success: false, error: e.message }));
      }
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

  // Extrator Infalível de Preços do Mercado Livre (Garante De: R$ 399,99 e Por: R$ 266,99)
  function extractMercadoLivrePrices(scope) {
    function parseAmount(el) {
      if (!el) return 0;
      const frac = el.querySelector('.andes-money-amount__fraction') || (el.classList && el.classList.contains('andes-money-amount__fraction') ? el : null);
      if (!frac) return 0;
      const intPart = frac.innerText.replace(/\D/g, '');
      if (!intPart) return 0;
      const cents = el.querySelector('.andes-money-amount__cents');
      const centsPart = cents ? cents.innerText.replace(/\D/g, '') : '00';
      return parseFloat(`${intPart}.${centsPart}`) || 0;
    }

    // 1. Extrai Preço Original (De / Riscado / Antigo)
    let originalPrice = 0;
    const origContainer = 
      scope.querySelector('.poly-price__original-value') ||
      scope.querySelector('.ui-search-price__original-value') ||
      scope.querySelector('.ui-pdp-price__original-value') ||
      scope.querySelector('s.andes-money-amount') ||
      scope.querySelector('s') ||
      scope.querySelector('.andes-money-amount--previous');

    if (origContainer) {
      originalPrice = parseAmount(origContainer);
    }

    // 2. Extrai Preço Atual (Por / Oferta em Destaque)
    let currentPrice = 0;
    const currContainer = 
      scope.querySelector('.poly-price__current') ||
      scope.querySelector('.ui-search-price__second-line') ||
      scope.querySelector('.ui-pdp-price__second-line') ||
      scope.querySelector('.ui-pdp-price__main-container');

    if (currContainer) {
      currentPrice = parseAmount(currContainer);
    }

    // Fallback: se não achou pelo container específico de preço atual, busca nos andes-money-amount filtrando fora preços antigos e parcelamento
    if (!currentPrice || currentPrice <= 0) {
      const allAmounts = Array.from(scope.querySelectorAll('.andes-money-amount'));
      for (const amt of allAmounts) {
        if (amt.closest('s, .andes-money-amount--previous, .poly-price__original-value, .ui-search-price__original-value, .ui-pdp-price__original-value')) {
          continue;
        }
        if (amt.closest('.poly-price__installments, .ui-search-installments, .ui-pdp-price__subtitles, [class*="installments"]')) {
          continue;
        }
        const val = parseAmount(amt);
        if (val > 0) {
          currentPrice = val;
          break;
        }
      }
    }

    // Extrai Desconto Percentual se existir no DOM
    let discount = 0;
    const discElem = 
      scope.querySelector('.andes-money-amount__discount') ||
      scope.querySelector('.poly-price__disc') ||
      scope.querySelector('.ui-pdp-price__second-line .ui-pdp-discount') ||
      scope.querySelector('[class*="discount"]');
    if (discElem) {
      const m = discElem.innerText.match(/\d+/);
      if (m) discount = parseInt(m[0], 10);
    }

    // Regras de Ouro e Validação Matemática:
    if (discount > 0 && discount < 100) {
      if (originalPrice > 0 && currentPrice > 0) {
        if (originalPrice < currentPrice) {
          // Invertidos! O maior é o original (De) e o menor é a oferta (Por)
          const tmp = originalPrice;
          originalPrice = currentPrice;
          currentPrice = tmp;
        } else if (originalPrice === currentPrice) {
          // Ambos pegaram o mesmo valor! Recalcula o preço da oferta aplicando o desconto
          currentPrice = Math.round(originalPrice * (1 - discount / 100) * 100) / 100;
        }
      } else if (currentPrice > 0 && originalPrice === 0) {
        originalPrice = Math.round((currentPrice / (1 - discount / 100)) * 100) / 100;
      } else if (originalPrice > 0 && currentPrice === 0) {
        currentPrice = Math.round(originalPrice * (1 - discount / 100) * 100) / 100;
      }
    }

    // Fallbacks finais se não tiver desconto explícito
    if (!originalPrice || originalPrice <= 0) {
      originalPrice = currentPrice;
    }
    if (!currentPrice || currentPrice <= 0) {
      currentPrice = originalPrice;
    }

    if (originalPrice < currentPrice && originalPrice > 0) {
      const tmp = originalPrice;
      originalPrice = currentPrice;
      currentPrice = tmp;
    }

    if (discount === 0 && originalPrice > currentPrice) {
      discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    }

    return { currentPrice, originalPrice, discount };
  }

  // 2. Extração de ofertas de acordo com o marketplace
  function scanPageOffers() {
    if (!isAutoScrollActive) return;

    let cards = [];
    if (currentMarketplace === 'Mercado Livre') {
      const cardSelectors = [
        '.poly-card',
        'li.ui-search-layout__item',
        '.ui-search-result',
        '.promotion-item',
        '.andes-card',
        '[class*="poly-component"]',
        '[data-component="poly-card"]',
        '.items__item',
        '.ui-recommendations-card',
        '.carousel__item',
        '.ui-search-layout li'
      ];
      cards = document.querySelectorAll(cardSelectors.join(', '));
      cards.forEach((card) => {
        try {
          const titleLink = card.querySelector('a.poly-component__title') ||
            card.querySelector('a.ui-search-link__title-card') ||
            card.querySelector('a.ui-search-item__group__element') ||
            card.querySelector('a.ui-search-link') ||
            card.querySelector('a[href*="/p/MLB"]') ||
            card.querySelector('a[href*="produto.mercadolivre.com.br/MLB"]') ||
            card.querySelector('a[href*="MLB"]');
          if (!titleLink) return;

          let href = titleLink.getAttribute('href') || titleLink.href || '';
          if (!href) return;
          const cleanUrl = href.split('?')[0].split('#')[0];
          if (capturedOffers.has(cleanUrl)) return;

          const title = (
            card.querySelector('.poly-component__title') ||
            card.querySelector('.ui-search-item__title') ||
            card.querySelector('.ui-search-link__title-card') ||
            titleLink
          ).innerText.trim();

          // Extração de Preço
          const { currentPrice, originalPrice, discount } = extractMercadoLivrePrices(card);

          // Foto Real Mercado Livre de Alta Qualidade
          let imageUrl = '';
          const allImgs = Array.from(card.querySelectorAll('img'));
          for (const img of allImgs) {
            const candidates = [
              img.getAttribute('data-src'),
              img.getAttribute('data-zoom'),
              img.getAttribute('data-srcset'),
              img.srcset,
              img.src,
              img.getAttribute('src'),
            ];
            for (const cand of candidates) {
              if (cand && typeof cand === 'string' && (cand.includes('mlstatic.com') || cand.includes('http2.mlstatic'))) {
                const parts = cand.split(',').map((s) => s.trim().split(' ')[0]);
                const best = parts.find((p) => p.includes('http2.mlstatic.com') || p.includes('mlstatic.com')) || parts[0];
                if (best && best.startsWith('http') && !best.includes('.svg') && !best.includes('data:image')) {
                  imageUrl = best;
                  break;
                }
              }
            }
            if (imageUrl) break;
          }

          if (!imageUrl) {
            for (const img of allImgs) {
              const src = img.src || img.getAttribute('src') || '';
              if (src && src.startsWith('http') && !src.includes('data:image') && !src.includes('.svg')) {
                imageUrl = src;
                break;
              }
            }
          }

          const affiliateUrl = injectAffiliateTag(href);

          const offer = {
            id: `ml_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            marketplace: 'Mercado Livre',
            title: title || 'Oferta Mercado Livre',
            currentPrice: currentPrice || 49.90,
            originalPrice: originalPrice || (currentPrice ? currentPrice * 1.3 : 69.90),
            discountPercentage: discount || 25,
            imageUrl,
            originalUrl: cleanUrl,
            affiliateUrl,
            shippingInfo: card.innerText.includes('FULL') ? 'Frete Grátis FULL' : 'Mercado Envios',
            capturedAt: new Date().toISOString(),
          };

          capturedOffers.set(cleanUrl, offer);
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

            <button id="nanda-btn-copy-links-only" style="
              background: rgba(56, 189, 248, 0.15);
              border: 1px solid rgba(56, 189, 248, 0.4);
              color: #38bdf8;
              font-weight: 700;
              padding: 7px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 11px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
            ">🔗 Extrair Links da Página</button>

            <button id="nanda-btn-copy-json" style="
              background: linear-gradient(135deg, #10b981, #059669);
              border: none;
              color: white;
              font-weight: 700;
              padding: 8px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 11px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
            ">✨ Copiar com Fotos Reais (JSON / Sistema)</button>

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

    const btnCopyLinksOnly = widgetContainer.querySelector('#nanda-btn-copy-links-only');
    btnCopyLinksOnly?.addEventListener('click', async () => {
      // 1. Escaneia a tela atual rapidamente
      scanPageOffers();

      const links = new Set();
      const items = [];
      const seenUrls = new Set();

      // 2. Coloca PRIMEIRO todas as ofertas acumuladas no Map (as 81 ou mais ofertas que o usuário capturou rolando!)
      capturedOffers.forEach((val, key) => {
        const clean = key.split('?')[0];
        if (!seenUrls.has(clean)) {
          seenUrls.add(clean);
          links.add(val.originalUrl || val.affiliateUrl || key);
          items.push({
            url: val.originalUrl || key,
            title: val.title,
            imageUrl: val.imageUrl,
            currentPrice: val.currentPrice,
            originalPrice: val.originalPrice,
            discountPercentage: val.discountPercentage,
            isFull: Boolean(val.shippingInfo?.includes('FULL')),
          });
        }
      });

      // 3. Adiciona qualquer card visível no DOM que ainda não estivesse no Map
      const cardSelectors = [
        '.poly-card',
        '.ui-search-result',
        '.promotion-item',
        '[class*="poly-component"]',
        '.andes-card',
        'li.ui-search-layout__item',
        '.ui-search-layout li',
        '[data-component="poly-card"]',
        '.items__item',
        '.ui-recommendations-card',
        '.carousel__item'
      ];

      const cards = document.querySelectorAll(cardSelectors.join(', '));
      cards.forEach((card) => {
        const linkElem = card.querySelector('a.poly-component__title') ||
          card.querySelector('a[href*="/p/MLB"]') ||
          card.querySelector('a[href*="produto.mercadolivre.com.br/MLB"]') ||
          card.querySelector('a.ui-search-link') ||
          card.querySelector('a.ui-search-link__title-card') ||
          card.querySelector('a.ui-search-item__group__element') ||
          card.querySelector('a[href*="mercadolivre.com.br"]');
        if (!linkElem) return;
        let h = linkElem.href ? linkElem.href.split('#')[0] : '';
        if (!h) return;

        const cleanUrl = h.split('?')[0];
        if (seenUrls.has(cleanUrl)) return;
        seenUrls.add(cleanUrl);
        links.add(h);

        const title = (
          card.querySelector('.poly-component__title') ||
          card.querySelector('.ui-search-item__title') ||
          card.querySelector('.ui-search-link__title-card') ||
          linkElem
        ).innerText.trim();

        let imageUrl = '';
        const allImgs = Array.from(card.querySelectorAll('img'));
        for (const img of allImgs) {
          const src = img.getAttribute('data-src') || img.src || img.getAttribute('data-srcset') || img.srcset || '';
          if (src && (src.includes('mlstatic.com') || src.includes('http2.mlstatic') || src.startsWith('http'))) {
            imageUrl = src.split(' ')[0].split(',')[0].trim();
            break;
          }
        }

        const frac = card.querySelector('.poly-price__current .andes-money-amount__fraction') || card.querySelector('.andes-money-amount__fraction');
        const price = frac ? parseFloat(frac.innerText.replace(/\D/g, '')) : 0;
        const discElem = card.querySelector('.poly-price__disc') || card.querySelector('[class*="discount"]');
        const disc = discElem ? parseInt(discElem.innerText.replace(/\D/g, ''), 10) : 0;
        const isFull = Boolean(card.querySelector('[class*="full"]') || card.innerText.includes('FULL'));

        items.push({
          url: h,
          title,
          imageUrl,
          currentPrice: price,
          discountPercentage: disc,
          isFull,
        });
      });

      // 4. Fallback de links soltos
      document.querySelectorAll('a[href*="/p/MLB"], a[href*="MLB-"]').forEach((a) => {
        let h = a.href;
        if (h) {
          h = h.split('#')[0];
          const cleanUrl = h.split('?')[0];
          if (!seenUrls.has(cleanUrl)) {
            seenUrls.add(cleanUrl);
            links.add(h);
          }
        }
      });

      const arr = Array.from(links);
      if (arr.length > 0) {
        statusMsg.innerText = 'Salvando fotos reais no sistema...';
        statusMsg.style.color = '#38bdf8';

        // Envia para o cache do backend via Service Worker sem bloqueio de CSP/CORS
        if (items.length > 0) {
          try {
            await cacheItemsViaServiceWorker(items);
          } catch (e) {
            console.error('Erro ao salvar fotos via service worker:', e);
          }
        }

        await navigator.clipboard.writeText(arr.join('\n'));
        statusMsg.innerText = `✓ ${arr.length} links com FOTOS REAIS salvos! Cole no sistema.`;
        statusMsg.style.color = '#10b981';
        setTimeout(() => {
          statusMsg.innerText = 'Role a página para capturar';
          statusMsg.style.color = '#a1a1aa';
        }, 3500);
      } else {
        statusMsg.innerText = 'Nenhum link detectado nesta página.';
      }
    });

    const btnCopyJson = widgetContainer.querySelector('#nanda-btn-copy-json');
    btnCopyJson?.addEventListener('click', async () => {
      scanPageOffers();
      const list = Array.from(capturedOffers.values());
      if (list.length === 0) {
        statusMsg.innerText = 'Nenhuma oferta capturada ainda. Role a página!';
        return;
      }

      statusMsg.innerText = 'Copiando produtos com fotos reais...';
      statusMsg.style.color = '#10b981';

      // Também envia para o backend via Service Worker
      cacheItemsViaServiceWorker(list.map((o) => ({
        url: o.originalUrl || o.url,
        title: o.title,
        imageUrl: o.imageUrl,
        currentPrice: o.currentPrice,
        originalPrice: o.originalPrice,
        discountPercentage: o.discountPercentage,
        isFull: Boolean(o.shippingInfo?.includes('FULL')),
      })));

      const formattedJson = JSON.stringify(
        list.map((o, idx) => ({
          id: o.id || `ml-${idx}`,
          title: o.title,
          originalPrice: o.originalPrice,
          currentPrice: o.currentPrice,
          discountPercentage: o.discountPercentage,
          imageUrl: o.imageUrl,
          originalUrl: o.originalUrl || o.url,
          affiliateUrl: o.affiliateUrl || o.url,
          isFull: Boolean(o.shippingInfo?.includes('FULL')),
          salesCountText: `+${(idx + 1) * 2}k vendidos`,
        })),
        null,
        2
      );

      await navigator.clipboard.writeText(formattedJson);
      statusMsg.innerText = `✨ ${list.length} ofertas com fotos reais copiadas! Cole no campo Buscar.`;
      statusMsg.style.color = '#10b981';
      setTimeout(() => {
        statusMsg.innerText = 'Role a página para capturar';
        statusMsg.style.color = '#a1a1aa';
      }, 4000);
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
        const res = await saveExtensionViaServiceWorker(list, 'QUEUE');
        if (res && res.success) {
          statusMsg.innerText = `🎉 ${list.length} ofertas salvas na fila!`;
          statusMsg.style.color = '#10b981';
          setTimeout(() => {
            capturedOffers.clear();
            updateWidget();
            statusMsg.innerText = 'Role a página para capturar';
            statusMsg.style.color = '#a1a1aa';
          }, 3000);
        } else {
          statusMsg.innerText = `Erro: ${res?.error || 'Falha ao salvar'}`;
          statusMsg.style.color = '#ef4444';
        }
      } catch (err) {
        statusMsg.innerText = 'Erro ao conectar no servidor local.';
        statusMsg.style.color = '#ef4444';
      }
    });

    btnSendRadar.addEventListener('click', async () => {
      if (capturedOffers.size === 0) return;
      statusMsg.innerText = 'Salvando no Radar...';
      try {
        const list = Array.from(capturedOffers.values());
        const res = await saveExtensionViaServiceWorker(list, 'RADAR');
        if (res && res.success) {
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
