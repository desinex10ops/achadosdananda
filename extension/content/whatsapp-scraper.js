// Scraper e Clonador de Ofertas Universal para WhatsApp Web - Achados da Nanda PRO
(function () {
  'use strict';

  console.log('[Achados da Nanda] Clonador do WhatsApp Web ativado.');

  let affiliateTags = {
    amazon: 'achadosnanda-20',
    shopee: 'achadosdananda-20',
    mercadolivre: 'meli-achadosnanda',
    magalu: 'magalu-nanda',
  };

  // Carregar tags do storage se existirem
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['affiliateTags'], (res) => {
      if (res.affiliateTags) {
        affiliateTags = {
          amazon: res.affiliateTags.amazon || affiliateTags.amazon,
          shopee: res.affiliateTags.shopee || affiliateTags.shopee,
          mercadolivre: res.affiliateTags['mercado-livre'] || affiliateTags.mercadolivre,
          magalu: res.affiliateTags.magalu || affiliateTags.magalu,
        };
      }
    });
  }

  // Converte qualquer link de concorrente para o link de afiliada da Nanda
  function convertToAffiliateLink(url) {
    if (!url) return url;
    try {
      let clean = url.trim();

      // 1. Amazon
      if (clean.includes('amazon.com.br') || clean.includes('amzn.to')) {
        const tag = affiliateTags.amazon || 'achadosnanda-20';
        if (clean.includes('tag=')) {
          clean = clean.replace(/tag=[^&]+/g, `tag=${tag}`);
        } else {
          clean += (clean.includes('?') ? '&' : '?') + `tag=${tag}`;
        }
        return clean;
      }

      // 2. Shopee
      if (clean.includes('shopee.com.br') || clean.includes('shope.ee')) {
        const tag = affiliateTags.shopee || 'achadosdananda-20';
        if (clean.includes('utm_source=')) {
          clean = clean.replace(/utm_source=[^&]+/g, `utm_source=${tag}`);
        } else {
          clean += (clean.includes('?') ? '&' : '?') + `utm_source=${tag}&aff_sub=${tag}`;
        }
        return clean;
      }

      // 3. Mercado Livre
      if (clean.includes('mercadolivre.com.br') || clean.includes('mercadolibre.com')) {
        const tag = affiliateTags.mercadolivre || 'meli-achadosnanda';
        if (clean.includes('matt_tool=')) {
          clean = clean.replace(/matt_tool=[^&]+/g, `matt_tool=${tag}`);
        } else {
          clean += (clean.includes('?') ? '&' : '?') + `matt_tool=${tag}&tracking_id=${tag}`;
        }
        return clean;
      }

      return clean;
    } catch (e) {
      return url;
    }
  }

  // Identifica marketplace do link
  function detectMarketplace(url) {
    if (!url) return 'WhatsApp';
    if (url.includes('amazon') || url.includes('amzn.to')) return 'Amazon';
    if (url.includes('shopee') || url.includes('shope.ee')) return 'Shopee';
    if (url.includes('mercadolivre') || url.includes('mercadolibre')) return 'Mercado Livre';
    if (url.includes('magazineluiza') || url.includes('magalu') || url.includes('magazinevoce')) return 'Magalu';
    return 'Oferta WhatsApp';
  }

  // Extrai links de um texto
  function extractUrlsFromText(text) {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = text.match(urlRegex) || [];
    return matches.map(u => u.replace(/[.,;!?)\]'"]+$/, ''));
  }

  // Extrai preço do texto
  function extractPricesFromText(text) {
    if (!text) return { currentPrice: 0, originalPrice: 0 };
    const priceMatches = Array.from(text.matchAll(/R\$\s*([\d.]+,\d{2}|\d+)/gi));
    if (priceMatches.length === 0) {
      const genericPrice = Array.from(text.matchAll(/(?:por|de|apenas)\s*([\d.]+,\d{2})/gi));
      if (genericPrice.length > 0) {
        const p = parseFloat(genericPrice[0][1].replace(/\./g, '').replace(',', '.'));
        return { currentPrice: p, originalPrice: p };
      }
      return { currentPrice: 0, originalPrice: 0 };
    }

    const prices = priceMatches.map(m => {
      const cleaned = m[1].replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    }).filter(p => p > 0);

    if (prices.length === 1) {
      return { currentPrice: prices[0], originalPrice: prices[0] };
    }
    prices.sort((a, b) => b - a);
    return { originalPrice: prices[0], currentPrice: prices[prices.length - 1] };
  }

  // Converte todo o texto da mensagem substituindo os links
  function cloneAndConvertMessageText(text) {
    if (!text) return '';
    const urls = extractUrlsFromText(text);
    let converted = text;
    urls.forEach(originalUrl => {
      const affiliateUrl = convertToAffiliateLink(originalUrl);
      converted = converted.replace(originalUrl, affiliateUrl);
    });
    return converted;
  }

  // Extrai dados completos de uma bolha de mensagem do WhatsApp Web
  function parseMessageElement(msgEl) {
    if (!msgEl) return null;

    const textEl = msgEl.querySelector('.copyable-text, [class*="selectable-text"]') || msgEl;
    const rawText = textEl ? (textEl.innerText || textEl.textContent || '').trim() : '';

    const links = extractUrlsFromText(rawText);
    const mainUrl = links.find(u => !u.includes('whatsapp.com')) || links[0] || '';
    if (!mainUrl && rawText.length < 10) return null;

    const convertedUrl = convertToAffiliateLink(mainUrl);
    const marketplace = detectMarketplace(mainUrl);
    const { currentPrice, originalPrice } = extractPricesFromText(rawText);

    // Imagem do produto no WhatsApp
    const imgEl = msgEl.querySelector('img[src*="blob:"], img[src*="data:"], img[src*="http"], div[data-testid="image-thumb"] img');
    let imageUrl = '';
    if (imgEl) {
      imageUrl = imgEl.src || imgEl.getAttribute('data-src') || '';
    }

    // Título extraído das primeiras linhas
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    let title = lines.find(l => !l.startsWith('http') && l.length > 5) || 'Achadinho Clonado do WhatsApp';
    title = title.replace(/^[🚨🔥⚡💥👇📢👀✨🛍️📦👉]+\s*/, '').trim();
    if (title.length > 90) title = title.substring(0, 90) + '...';

    const disc = originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
    const convertedText = cloneAndConvertMessageText(rawText);

    return {
      id: `wpp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isListing: false,
      marketplace,
      title,
      currentPrice,
      originalPrice,
      discountPercentage: disc,
      url: mainUrl,
      affiliateUrl: convertedUrl,
      imageUrl,
      shippingInfo: 'Verificar no link',
      rawText,
      convertedText,
    };
  }

  // Extrai TODAS as mensagens com links de ofertas da conversa aberta
  function extractAllChatOffers() {
    const mainPane = document.querySelector('#main') || document.querySelector('div[role="region"]') || document.body;
    
    // Procura por links ou mensagens
    const linkElems = Array.from(mainPane.querySelectorAll('a[href^="http"]'));
    const seenUrls = new Set();
    const offers = [];

    // Estratégia 1: Através das tags de link <a>
    linkElems.forEach((a) => {
      try {
        const href = a.href || '';
        if (!href || href.includes('whatsapp.com')) return;
        const cleanBase = href.split('?')[0];
        if (seenUrls.has(cleanBase)) return;
        seenUrls.add(cleanBase);

        const msgRow = a.closest('div[role="row"]') || 
                       a.closest('div[data-id]') || 
                       a.closest('div[class*="message-"]') || 
                       a.parentElement?.parentElement;
        if (!msgRow) return;

        const parsed = parseMessageElement(msgRow);
        if (parsed && (parsed.url || parsed.currentPrice > 0)) {
          offers.push(parsed);
        }
      } catch (e) {}
    });

    // Estratégia 2: Se não achou por <a>, procura por blocos de texto com links
    if (offers.length === 0) {
      const textBlocks = Array.from(mainPane.querySelectorAll('.copyable-text, [class*="selectable-text"]'));
      for (let i = textBlocks.length - 1; i >= 0; i--) {
        const block = textBlocks[i];
        const text = block.innerText || '';
        if (text.includes('http')) {
          const parsed = parseMessageElement(block.closest('div[role="row"]') || block);
          if (parsed && parsed.url && !seenUrls.has(parsed.url)) {
            seenUrls.add(parsed.url);
            offers.push(parsed);
          }
        }
      }
    }

    return offers;
  }

  // Notificação visual toast no WhatsApp Web
  function showToast(text) {
    let toast = document.getElementById('nanda-whatsapp-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'nanda-whatsapp-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #18181b;
        color: #ffffff;
        padding: 12px 20px;
        border-radius: 12px;
        font-family: -apple-system, sans-serif;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 10px 25px rgba(236,72,153,0.3);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 8px;
        border: 2px solid #ec4899;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.innerHTML = text;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
    }, 3500);
  }

  // Injeta botões "⚡ Clonar p/ Nanda" diretamente nas mensagens com ofertas
  function injectCloneButtons() {
    const mainPane = document.querySelector('#main');
    if (!mainPane) return;

    const rows = mainPane.querySelectorAll('div[role="row"], div[class*="message-in"], div[class*="message-out"]');
    rows.forEach(row => {
      if (row.querySelector('.nanda-clone-btn')) return;

      const text = row.innerText || '';
      const hasOfferLink = /(amazon|amzn|shopee|shope\.ee|mercadolivre|mercadolibre|magalu|magazine|http)/i.test(text);
      if (!hasOfferLink) return;

      const actionContainer = row.querySelector('.copyable-text') || row;
      if (!actionContainer) return;

      const btn = document.createElement('button');
      btn.className = 'nanda-clone-btn';
      btn.innerHTML = '⚡ Clonar c/ Meu Link';
      btn.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-top: 6px;
        margin-bottom: 4px;
        padding: 4px 10px;
        background: linear-gradient(135deg, #ec4899, #db2777);
        color: #ffffff;
        border: none;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(236,72,153,0.3);
        transition: transform 0.15s ease;
        z-index: 10;
      `;

      btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.04)'; });
      btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        const data = parseMessageElement(row);
        if (!data) return;

        navigator.clipboard.writeText(data.convertedText).then(() => {
          showToast(`⚡ <b>Oferta Clonada!</b> Mensagem copiada com seu link de afiliada.`);
        }).catch(() => {
          showToast(`⚠️ Não foi possível copiar automaticamente.`);
        });
      });

      actionContainer.appendChild(btn);
    });
  }

  // Observa mensagens novas no chat do WhatsApp
  const observer = new MutationObserver(() => {
    injectCloneButtons();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Listener para o popup da extensão
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_PRODUCT' || request.action === 'GET_HARVESTED_OFFERS') {
      const offers = extractAllChatOffers();

      if (offers && offers.length > 1) {
        // Modo lote: encontrou várias ofertas na conversa
        sendResponse({
          success: true,
          data: {
            isListing: true,
            totalFound: offers.length,
            marketplace: 'WhatsApp Web',
            products: offers,
          },
          offers,
          marketplace: 'WhatsApp Web',
        });
      } else if (offers && offers.length === 1) {
        // Encontrou 1 oferta
        sendResponse({
          success: true,
          data: offers[0],
          offers,
          marketplace: offers[0].marketplace || 'WhatsApp Web',
        });
      } else {
        // Fallback: tenta mensagem mais recente do chat
        const mainPane = document.querySelector('#main');
        if (!mainPane) {
          sendResponse({
            success: false,
            error: 'Abra uma conversa ou grupo no WhatsApp Web para clonar as ofertas.',
          });
          return true;
        }

        const lastRow = mainPane.querySelector('div[role="row"]:last-child') || mainPane.querySelector('div[class*="message-"]:last-child');
        const parsed = parseMessageElement(lastRow);
        if (parsed && (parsed.url || parsed.currentPrice > 0)) {
          sendResponse({ success: true, data: parsed });
        } else {
          sendResponse({
            success: false,
            error: 'Nenhuma oferta com link identificada nesta conversa. Role para carregar mais mensagens ou clique em uma mensagem com link.',
          });
        }
      }
      return true;
    }
    return true;
  });
})();
