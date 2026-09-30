// Scraper e Clonador de Ofertas para WhatsApp Web - Achados da Nanda PRO
(function () {
  'use strict';

  console.log('[Achados da Nanda] Clonador do WhatsApp Web ativado.');

  const AFFILIATE_TAGS = {
    amazon: 'achadosnanda-20',
    shopee: 'achadosdananda-20',
    mercadolivre: 'meli-achadosnanda',
  };

  // Converte qualquer link de concorrente para o link de afiliada da Nanda
  function convertToAffiliateLink(url) {
    if (!url) return url;
    try {
      let clean = url.trim();

      // 1. Amazon
      if (clean.includes('amazon.com.br') || clean.includes('amzn.to')) {
        if (clean.includes('tag=')) {
          clean = clean.replace(/tag=[^&]+/g, `tag=${AFFILIATE_TAGS.amazon}`);
        } else {
          clean += (clean.includes('?') ? '&' : '?') + `tag=${AFFILIATE_TAGS.amazon}`;
        }
        return clean;
      }

      // 2. Shopee
      if (clean.includes('shopee.com.br')) {
        if (clean.includes('af_sub_siteid=')) {
          clean = clean.replace(/af_sub_siteid=[^&]+/g, `af_sub_siteid=${AFFILIATE_TAGS.shopee}`);
        } else {
          clean += (clean.includes('?') ? '&' : '?') + `af_sub_siteid=${AFFILIATE_TAGS.shopee}`;
        }
        return clean;
      }

      // 3. Mercado Livre
      if (clean.includes('mercadolivre.com.br') || clean.includes('mercadolibre.com')) {
        if (clean.includes('matt_tool=')) {
          clean = clean.replace(/matt_tool=[^&]+/g, `matt_tool=${AFFILIATE_TAGS.mercadolivre}`);
        } else {
          clean += (clean.includes('?') ? '&' : '?') + `matt_tool=${AFFILIATE_TAGS.mercadolivre}`;
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
    if (url.includes('shopee')) return 'Shopee';
    if (url.includes('mercadolivre') || url.includes('mercadolibre')) return 'Mercado Livre';
    if (url.includes('magazineluiza') || url.includes('magalu')) return 'Magalu';
    return 'WhatsApp';
  }

  // Extrai links de um texto
  function extractUrlsFromText(text) {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = text.match(urlRegex) || [];
    return matches.map(u => u.replace(/[.,;!?)\]]+$/, '')); // limpa pontuação final
  }

  // Extrai preço do texto (ex: R$ 49,90 ou De R$ 99 Por R$ 49)
  function extractPricesFromText(text) {
    if (!text) return { currentPrice: 0, originalPrice: 0 };
    const priceMatches = Array.from(text.matchAll(/R\$\s*([\d.]+,\d{2}|\d+)/gi));
    if (priceMatches.length === 0) return { currentPrice: 0, originalPrice: 0 };

    const prices = priceMatches.map(m => {
      const cleaned = m[1].replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    }).filter(p => p > 0);

    if (prices.length === 1) {
      return { currentPrice: prices[0], originalPrice: prices[0] };
    }
    // Geralmente o maior é o De e o menor é o Por
    prices.sort((a, b) => b - a);
    return { originalPrice: prices[0], currentPrice: prices[prices.length - 1] };
  }

  // Converte todo o texto da mensagem substituindo todos os links pelo link da Nanda
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

  // Extrai dados completos de um elemento de mensagem do WhatsApp
  function parseMessageElement(msgEl) {
    if (!msgEl) return null;

    // Texto da mensagem
    const textEl = msgEl.querySelector('.copyable-text, [class*="selectable-text"]') || msgEl;
    const rawText = textEl ? (textEl.innerText || textEl.textContent || '').trim() : '';

    // Links
    const links = extractUrlsFromText(rawText);
    const mainUrl = links[0] || '';
    const convertedUrl = convertToAffiliateLink(mainUrl);
    const marketplace = detectMarketplace(mainUrl);

    // Preços
    const { currentPrice, originalPrice } = extractPricesFromText(rawText);

    // Imagem da mensagem ou de preview
    const imgEl = msgEl.querySelector('img[src*="blob:"], img[src*="data:"], img[src*="http"], div[data-testid="image-thumb"] img');
    let imageUrl = '';
    if (imgEl) {
      imageUrl = imgEl.src || imgEl.getAttribute('data-src') || '';
    }

    // Título aproximado (primeira linha do texto ou primeiras palavras)
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    let title = lines[0] || 'Oferta Clonada do WhatsApp';
    // Remove emojis ou marcadores do início do título
    title = title.replace(/^[🚨🔥⚡💥👇📢👀✨]+\s*/, '').trim();
    if (title.length > 80) title = title.substring(0, 80) + '...';

    // Texto clonado com os links convertidos
    const convertedText = cloneAndConvertMessageText(rawText);

    return {
      isListing: false,
      marketplace,
      title,
      currentPrice,
      originalPrice,
      url: mainUrl,
      affiliateUrl: convertedUrl,
      imageUrl,
      shippingInfo: 'Verificar no link',
      rawText,
      convertedText,
    };
  }

  // Encontra a melhor mensagem para extrair na conversa ativa
  function getBestTargetMessage() {
    // 1. Mensagem sob hover ou selecionada
    const hoveredMsg = document.querySelector('div[role="row"]:hover, div[class*="message-"]:hover');
    if (hoveredMsg) {
      const parsed = parseMessageElement(hoveredMsg);
      if (parsed && (parsed.url || parsed.currentPrice > 0)) return parsed;
    }

    // 2. Procura de baixo para cima as mensagens mais recentes com links
    const allMessages = Array.from(document.querySelectorAll('div[role="row"], div[class*="message-in"], div[class*="message-out"]'));
    for (let i = allMessages.length - 1; i >= 0; i--) {
      const msg = allMessages[i];
      const parsed = parseMessageElement(msg);
      if (parsed && parsed.url && (parsed.url.includes('http') || parsed.rawText.length > 15)) {
        return parsed;
      }
    }

    return null;
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
        background: #0f172a;
        color: #ffffff;
        padding: 12px 20px;
        border-radius: 12px;
        font-family: sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid #f97316;
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

  // Injeta botões "⚡ Clonar" diretamente sobre as mensagens com ofertas no chat
  function injectCloneButtons() {
    const rows = document.querySelectorAll('div[role="row"]');
    rows.forEach(row => {
      if (row.querySelector('.nanda-clone-btn')) return;

      const text = row.innerText || '';
      // Se a mensagem contém links de lojas conhecidas ou indicativo de oferta
      const hasOfferLink = /(amazon|amzn|shopee|mercadolivre|magalu|magazine)/i.test(text);
      if (!hasOfferLink) return;

      const actionContainer = row.querySelector('[class*="copyable-text"]') || row;
      if (!actionContainer) return;

      const btn = document.createElement('button');
      btn.className = 'nanda-clone-btn';
      btn.innerHTML = '⚡ Clonar p/ Nanda';
      btn.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-top: 6px;
        padding: 4px 10px;
        background: linear-gradient(135deg, #f97316, #ea580c);
        color: #ffffff;
        border: none;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        transition: transform 0.15s ease, background 0.15s ease;
        z-index: 10;
      `;

      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.04)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
      });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        const data = parseMessageElement(row);
        if (!data) return;

        // Copia a mensagem clonada com os links da Nanda para a área de transferência
        navigator.clipboard.writeText(data.convertedText).then(() => {
          showToast(`⚡ <b>Oferta Clonada!</b> Texto copiado com seu link de afiliada.`);
        }).catch(() => {
          showToast(`⚠️ Não foi possível copiar automaticamente.`);
        });
      });

      actionContainer.appendChild(btn);
    });
  }

  // Observa novas mensagens chegando no chat
  const observer = new MutationObserver(() => {
    injectCloneButtons();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Listener para quando o popup da extensão for aberto
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_PRODUCT') {
      const target = getBestTargetMessage();
      if (target) {
        sendResponse({ success: true, data: target });
      } else {
        sendResponse({
          success: false,
          error: 'Nenhuma mensagem de oferta identificada nesta conversa. Selecione ou clique em uma mensagem com link.',
        });
      }
      return true;
    }
    return true;
  });
})();
