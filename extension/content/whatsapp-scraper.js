// =======================================================================
// ACHADOS DA NANDA PRO - CLONADOR UNIVERSAL PARA WHATSAPP WEB (V7)
// Com Super Extrator Robusto de Preços e Títulos (suporta markdown do Wpp)
// Smart Message Stitcher (fusão foto + texto + link)
// e Auto-Scroll Harvester (Puxa todas as ofertas enviadas durante o dia)
// =======================================================================

(function () {
  'use strict';

  console.log('[Achados da Nanda PRO] Clonador WhatsApp Web v7 inicializado.');

  let affiliateTags = {
    amazon: 'achadosnanda-20',
    shopee: 'achadosdananda-20',
    mercadolivre: 'meli-achadosnanda',
    magalu: 'magalu-nanda',
  };

  // Cache acumulativo de ofertas da sessão do dia
  const harvestedOffersCache = new Map();

  // Configuração de URL do servidor
  let backendUrl = 'https://achadosdananda.vercel.app';

  // Carrega configurações do storage da extensão
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['backendUrl', 'affiliateTags'], (res) => {
      if (res.backendUrl) backendUrl = res.backendUrl.replace(/\/$/, '');
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

  // Envia ofertas para a Fila do Sistema através do Service Worker sem bloqueio de CORS
  function sendToQueueViaServiceWorker(items, groupIds = []) {
    return new Promise((resolve) => {
      const payloadItems = items.map((o) => ({
        title: o.title,
        originalPrice: o.originalPrice || o.currentPrice,
        currentPrice: o.currentPrice,
        imageUrl: o.imageUrl,
        url: o.url,
        affiliateUrl: o.affiliateUrl || convertToAffiliateLink(o.url),
        marketplace: o.marketplace,
        coupon: o.coupon,
        shippingInfo: 'Frete Promocional',
        action: 'QUEUE',
      }));

      const targetGroups = groupIds.length > 0 ? groupIds : ['cmuyvtbad0001dnoffbw3o3e8'];

      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          {
            action: 'SAVE_EXTENSION',
            backendUrl,
            items: payloadItems,
            saveAction: 'QUEUE',
            groupIds: targetGroups,
          },
          (res) => {
            if (chrome.runtime.lastError) {
              fetch(`${backendUrl}/api/extension/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: payloadItems, action: 'QUEUE', groupIds: targetGroups }),
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
          body: JSON.stringify({ items: payloadItems, action: 'QUEUE', groupIds: targetGroups }),
        })
          .then((r) => r.json())
          .then((d) => resolve(d))
          .catch((e) => resolve({ success: false, error: e.message }));
      }
    });
  }

  // 1. Converte links para os links de afiliada da Nanda
  function convertToAffiliateLink(url) {
    if (!url) return url;
    try {
      let clean = url.trim();
      const low = clean.toLowerCase();

      // 1. Amazon (amazon.com.br, amzn.to, a.co)
      if (low.includes('amazon') || low.includes('amzn.to') || low.includes('a.co')) {
        const tag = affiliateTags.amazon || 'achadosnanda-20';
        if (clean.includes('tag=')) {
          clean = clean.replace(/tag=[^&]+/g, `tag=${tag}`);
        } else {
          clean += (clean.includes('?') ? '&' : '?') + `tag=${tag}`;
        }
        return clean;
      }

      // 2. Shopee (shopee.com.br, shope.ee, s.shopee.com.br)
      if (low.includes('shopee') || low.includes('shope.ee')) {
        const tag = affiliateTags.shopee || 'achadosdananda-20';
        if (clean.includes('utm_source=')) {
          clean = clean.replace(/utm_source=[^&]+/g, `utm_source=${tag}`);
        } else {
          clean += (clean.includes('?') ? '&' : '?') + `utm_source=${tag}&aff_sub=${tag}`;
        }
        return clean;
      }

      // 3. Mercado Livre (mercadolivre.com.br, meli.la, mercadolibre.com)
      if (low.includes('mercadolivre') || low.includes('mercadolibre') || low.includes('meli.la')) {
        const tag = affiliateTags.mercadolivre || 'meli-achadosnanda';
        if (clean.includes('matt_tool=')) {
          clean = clean.replace(/matt_tool=[^&]+/g, `matt_tool=${tag}`);
        } else {
          clean += (clean.includes('?') ? '&' : '?') + `matt_tool=${tag}&tracking_id=${tag}`;
        }
        return clean;
      }

      // 4. Magalu (magazineluiza.com.br, magazinevoce.com.br, magalu.me)
      if (low.includes('magalu') || low.includes('magazineluiza') || low.includes('magazinevoce')) {
        const tag = affiliateTags.magalu || 'magalu-nanda';
        if (clean.includes('magazinevoce.com.br/')) {
          clean = clean.replace(/magazinevoce\.com\.br\/[^\/]+/i, `magazinevoce.com.br/${tag}`);
        }
        return clean;
      }

      return clean;
    } catch (e) {
      return url;
    }
  }

  // 2. Identifica o marketplace da URL
  function detectMarketplace(url) {
    if (!url) return 'Mercado Livre';
    const low = url.toLowerCase();
    if (low.includes('amazon') || low.includes('amzn.to') || low.includes('a.co')) return 'Amazon';
    if (low.includes('shopee') || low.includes('shope.ee')) return 'Shopee';
    if (low.includes('mercadolivre') || low.includes('mercadolibre') || low.includes('meli.la')) return 'Mercado Livre';
    if (low.includes('magazineluiza') || low.includes('magalu') || low.includes('magazinevoce')) return 'Magalu';
    if (low.includes('shein')) return 'Shein';
    return 'Mercado Livre';
  }

  // 3. Extrai links de compras de um texto
  function extractUrlsFromText(text) {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s]+|meli\.la\/[^\s]+|shope\.ee\/[^\s]+|amzn\.to\/[^\s]+)/gi;
    const matches = text.match(urlRegex) || [];
    return matches.map(u => {
      let clean = u.replace(/[.,;!?)\]'"]+$/, '');
      if (!clean.startsWith('http')) clean = 'https://' + clean;
      return clean;
    });
  }

  // 4. Extrator Robusto de Preços (Elimina markdown do WhatsApp, ignora parcelamento e separa De/Por)
  function extractPricesFromText(text) {
    if (!text) return { currentPrice: 0, originalPrice: 0 };

    // Normaliza espaços unicode e limpa markdown do WhatsApp (*, ~, _, `)
    const clean = text
      .replace(/[\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/g, ' ')
      .replace(/[*_~`]/g, '');

    // Busca padrão De / Por explícito
    const deMatch = clean.match(/(?:de|de:|antes|era)\s*[:]?\s*R\$\s*([\d.]+,\d{2}|\d+)/i);
    const porMatch = clean.match(/(?:por|por\s*apenas|valor|por:|preço|preco|pagando|sai\s*por|apenas)\s*[:]?\s*R\$\s*([\d.]+,\d{2}|\d+)/i);

    let originalPrice = deMatch ? parseFloat(deMatch[1].replace(/\./g, '').replace(',', '.')) : 0;
    let currentPrice = porMatch ? parseFloat(porMatch[1].replace(/\./g, '').replace(',', '.')) : 0;

    // Remove menções de parcelamento (ex: 10x de R$ 25,00) para não contaminar detecção de preços totais
    const cleanNoInstallments = clean.replace(/\b\d+\s*x\s*(?:de\s*)?R\$\s*[\d.,]+/gi, '');

    // Se achou Por mas não achou De, ou vice-versa, busca outros preços na mensagem
    if (currentPrice > 0 && originalPrice === 0) {
      const otherPrices = Array.from(cleanNoInstallments.matchAll(/R\$\s*([\d.]+,\d{2}|\d+)/gi))
        .map(m => parseFloat(m[1].replace(/\./g, '').replace(',', '.')) || 0)
        .filter(p => p > currentPrice);
      if (otherPrices.length > 0) {
        originalPrice = Math.max(...otherPrices);
      } else {
        originalPrice = currentPrice;
      }
    } else if (originalPrice > 0 && currentPrice === 0) {
      const otherPrices = Array.from(cleanNoInstallments.matchAll(/R\$\s*([\d.]+,\d{2}|\d+)/gi))
        .map(m => parseFloat(m[1].replace(/\./g, '').replace(',', '.')) || 0)
        .filter(p => p > 0 && p < originalPrice);
      if (otherPrices.length > 0) {
        currentPrice = Math.min(...otherPrices);
      } else {
        currentPrice = originalPrice;
      }
    }

    if (currentPrice > 0 && originalPrice > 0) {
      if (originalPrice < currentPrice) {
        const tmp = originalPrice;
        originalPrice = currentPrice;
        currentPrice = tmp;
      }
      return { currentPrice, originalPrice };
    }

    // Procura qualquer ocorrência de "R$ valor" no texto sem parcelas
    const allPrices = Array.from(cleanNoInstallments.matchAll(/R\$\s*([\d.]+,\d{2}|\d+)/gi))
      .map(m => parseFloat(m[1].replace(/\./g, '').replace(',', '.')) || 0)
      .filter(p => p > 0);

    if (allPrices.length === 1) {
      return { currentPrice: allPrices[0], originalPrice: allPrices[0] };
    } else if (allPrices.length > 1) {
      allPrices.sort((a, b) => b - a);
      return { originalPrice: allPrices[0], currentPrice: allPrices[allPrices.length - 1] };
    }

    return { currentPrice: 0, originalPrice: 0 };
  }

  // 5. Extrai código de cupom
  function extractCouponFromText(text) {
    if (!text) return null;
    const clean = text.replace(/[*_~`]/g, '');
    const match = clean.match(/(?:cupom|cupom\s*:|use\s*:|c[oó]digo\s*:)\s*([A-Z0-9_\-]+)/i);
    return match ? match[1].trim().toUpperCase() : null;
  }

  // 6. Converte todo o texto da mensagem com os links de afiliada da Nanda
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

  // 7. Extrator Robusto de Título
  function extractProductTitle(rawText) {
    if (!rawText) return 'Achado Promocional';

    const clean = rawText
      .replace(/[\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/g, ' ')
      .replace(/[*_~`]/g, '');

    // Divide por quebra de linha
    let chunks = clean.split(/\n+/).map(c => c.trim()).filter(Boolean);

    // Se veio tudo em uma linha só, tenta quebrar antes dos divisores promocionais
    if (chunks.length <= 1) {
      const single = chunks[0] || clean;
      chunks = single
        .split(/(?:De:\s*R\$|Por:\s*R\$|Cupom:|🎟️|Compre aqui:|🔗|https?:\/\/)/i)
        .map(c => c.trim())
        .filter(Boolean);
    }

    const candidates = chunks.filter(c => {
      const low = c.toLowerCase();
      if (low.startsWith('http') || low.includes('meli.la') || low.includes('shope.ee') || low.includes('amzn.to')) return false;
      if (low.includes('de:') || low.includes('por:') || low.includes('cupom:') || low.includes('compre aqui')) return false;
      if (low.includes('link:')) return false;
      if (/^r\$\s*[\d.,]+/i.test(c)) return false;
      return c.length > 5;
    });

    if (candidates.length === 0) return 'Achado Promocional';

    let chosen = candidates.length > 1 && candidates[0].length < candidates[1].length
      ? candidates[1]
      : candidates[0];

    chosen = chosen.replace(/^[🚨🔥⚡💥👇📢👀✨🛍️📦👉💛💖💅👑]+\s*/, '').trim();
    if (chosen.length > 95) chosen = chosen.substring(0, 95) + '...';
    return chosen;
  }

  // 8. Extrai imagem do nó e converte em base64 (Canvas)
  function getBase64Image(node) {
    if (!node) return '';
    const img = node.querySelector('img[src*="blob:"], img[src*="http"], div[data-testid="image-thumb"] img, img');
    if (!img) return '';

    try {
      if (img.complete && img.naturalWidth > 20) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.naturalWidth, 320);
        canvas.height = Math.min(img.naturalHeight, 320);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch (e) {}

    if (img.src && !img.src.startsWith('blob:')) {
      return img.src;
    }
    return '';
  }

  // 9. Extrai o texto completo de uma mensagem do WhatsApp lendo todos os spans internos
  function getNodeFullText(node) {
    if (!node) return '';
    const spans = Array.from(node.querySelectorAll('.copyable-text, .selectable-text, span[dir="ltr"], span._ao3e, p'));
    let textFromSpans = '';
    if (spans.length > 0) {
      textFromSpans = spans.map(s => s.innerText || s.textContent || '').filter(Boolean).join('\n');
    }
    const inner = (node.innerText || node.textContent || '').trim();
    return textFromSpans.length >= inner.length ? textFromSpans : inner;
  }

  // 10. Filtro para garantir nós dentro da conversa aberta (ignora o menu lateral #side)
  function isInsideChat(el) {
    if (!el) return false;
    return !el.closest('#side') && !el.closest('header') && !el.closest('div[data-testid="chat-list"]');
  }

  // 11. Coleta os nós de mensagens do chat ativo
  function getChatMsgElements() {
    const candidates = Array.from(document.querySelectorAll(
      'div[data-id], div[role="row"], div.message-in, div.message-out, div[data-testid="msg-container"]'
    )).filter(isInsideChat);

    const uniqueNodes = [];
    const seen = new Set();

    candidates.forEach(el => {
      const row = el.closest('div[role="row"]') || el.closest('div[data-id]') || el;
      if (!seen.has(row)) {
        seen.add(row);
        uniqueNodes.push(row);
      }
    });

    return uniqueNodes;
  }

  // 12. Extração Inteligente com Smart Message Stitcher e Acúmulo no Cache
  function extractAllChatOffers() {
    const nodes = getChatMsgElements();

    // Mapeia todas as mensagens com seus textos e imagens
    const msgList = nodes.map((node, index) => {
      const text = getNodeFullText(node);
      const urls = extractUrlsFromText(text);
      const img = getBase64Image(node);
      return { node, index, text, urls, img };
    });

    for (let i = 0; i < msgList.length; i++) {
      const current = msgList[i];
      if (current.urls.length === 0) continue;

      const rawUrl = current.urls[0];
      const cleanBase = rawUrl.split('?')[0];

      let combinedText = current.text;
      let combinedImage = current.img;

      // Smart Stitcher: Se a mensagem do link for curta ou não tiver preço
      // Procura nas mensagens anteriores (até 3 mensagens antes)
      const currentPrices = extractPricesFromText(combinedText);
      if (currentPrices.currentPrice === 0 || combinedText.length < 50) {
        for (let back = 1; back <= 3; back++) {
          const prev = msgList[i - back];
          if (prev && prev.text && prev.text.length > 10) {
            combinedText = prev.text + '\n' + combinedText;
            if (!combinedImage && prev.img) {
              combinedImage = prev.img;
            }
            // Se já achou preço na mensagem anterior, para a busca
            if (extractPricesFromText(combinedText).currentPrice > 0) break;
          }
        }
      }

      // Se ainda não tem imagem, vasculha os vizinhos imediatos
      if (!combinedImage) {
        for (let back = 1; back <= 2; back++) {
          if (i - back >= 0 && msgList[i - back].img) {
            combinedImage = msgList[i - back].img;
            break;
          }
        }
      }

      const { currentPrice, originalPrice } = extractPricesFromText(combinedText);
      const coupon = extractCouponFromText(combinedText);
      const title = extractProductTitle(combinedText);
      const affiliateUrl = convertToAffiliateLink(rawUrl);
      const marketplace = detectMarketplace(rawUrl);
      const disc = originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
      const convertedText = cloneAndConvertMessageText(combinedText);

      const offerObj = {
        id: `wpp_${cleanBase.replace(/[^a-zA-Z0-9]/g, '_')}`,
        isListing: false,
        marketplace,
        title,
        currentPrice: currentPrice || originalPrice || 0,
        originalPrice: originalPrice || currentPrice || 0,
        discountPercentage: disc,
        coupon,
        url: rawUrl,
        affiliateUrl,
        imageUrl: combinedImage,
        shippingInfo: 'Verificar no link',
        rawText: combinedText,
        convertedText,
      };

      const normalizedUrl = cleanBase.replace(/\/+$/, '').toLowerCase();
      const normalizedTitle = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 40);

      // Evita duplicatas no cache por URL ou por Título idêntico
      let existingKey = null;
      for (const [key, cached] of harvestedOffersCache.entries()) {
        const cachedUrl = (cached.url || '').split('?')[0].replace(/\/+$/, '').toLowerCase();
        const cachedTitle = (cached.title || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 40);

        if (cachedUrl === normalizedUrl || (normalizedTitle.length > 8 && normalizedTitle !== 'achado promocional' && cachedTitle === normalizedTitle)) {
          existingKey = key;
          break;
        }
      }

      if (existingKey) {
        const prev = harvestedOffersCache.get(existingKey);
        if (offerObj.currentPrice > 0 && (!prev.currentPrice || prev.currentPrice === 0)) {
          prev.currentPrice = offerObj.currentPrice;
          prev.originalPrice = offerObj.originalPrice;
          prev.discountPercentage = offerObj.discountPercentage;
          prev.title = offerObj.title;
        }
        if (!prev.imageUrl && offerObj.imageUrl) {
          prev.imageUrl = offerObj.imageUrl;
        }
        if (!prev.coupon && offerObj.coupon) {
          prev.coupon = offerObj.coupon;
        }
        continue;
      }

      // Guarda no cache acumulativo único
      harvestedOffersCache.set(normalizedUrl, offerObj);
    }

    return Array.from(harvestedOffersCache.values());
  }

  // 13. Localiza o container rolável de mensagens do chat ativo
  function getChatScrollContainer() {
    const main = document.querySelector('#main') || document.querySelector('div[role="region"]');
    if (!main) return null;

    const list = [
      main.querySelector('div[tabindex="-1"]'),
      main.querySelector('div[data-testid="conversation-panel-wrapper"]'),
      ...Array.from(main.querySelectorAll('div')).filter(el => {
        const style = window.getComputedStyle(el);
        return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
      })
    ];

    return list.find(Boolean) || main;
  }

  // 14. Identifica se a rolagem subiu até o divisor "HOJE" ou anterior
  function hasReachedTodayStart(scrollBox) {
    if (!scrollBox) return false;
    const main = document.querySelector('#main') || document.querySelector('div[role="region"]') || document.body;
    const boxRect = scrollBox.getBoundingClientRect();

    // Procura divisores de data do WhatsApp
    const candidates = Array.from(main.querySelectorAll('span[dir="auto"], span, div'));
    for (const el of candidates) {
      const txt = (el.innerText || '').trim();
      if (!txt || txt.length > 25) continue;
      const upper = txt.toUpperCase();

      // Divisor "ONTEM", "YESTERDAY" ou data passada explícita visível no chat
      if (upper === 'ONTEM' || upper === 'YESTERDAY' || /^\d{1,2}\s+DE\s+[A-Zç]+\.?/i.test(txt) || /^\d{2}\/\d{2}\/\d{2,4}$/.test(txt)) {
        const rect = el.getBoundingClientRect();
        if (rect.top >= boxRect.top - 40 && rect.bottom <= boxRect.bottom + 40) {
          return true; // Passou de hoje e chegou em mensagens anteriores
        }
      }

      // Divisor "HOJE" ou "TODAY" alcançou o topo visível da área do chat
      if (upper === 'HOJE' || upper === 'TODAY') {
        const rect = el.getBoundingClientRect();
        if (rect.top <= boxRect.top + 160 && rect.top >= boxRect.top - 80) {
          return true; // Chegou no início do dia de hoje!
        }
      }
    }

    // Topo absoluto atingido
    if (scrollBox.scrollTop <= 5) {
      return true;
    }

    return false;
  }

  // 15. Auto-Scroll Inteligente: Rola de baixo para cima e para no início de "HOJE"
  async function autoScrollAndHarvestAllDay(onProgress) {
    const scrollBox = getChatScrollContainer();
    if (!scrollBox) {
      return extractAllChatOffers();
    }

    showToast('📜 <b>Puxando ofertas de HOJE...</b> Rolando de baixo para cima.');

    // 1. Garante leitura inicial das ofertas mais recentes (de baixo)
    extractAllChatOffers();
    updateQueueBadge();

    let reachedTodayStart = false;
    let stepCount = 0;
    const maxSteps = 45; // Limite de segurança

    while (!reachedTodayStart && stepCount < maxSteps) {
      stepCount++;

      const prevTop = scrollBox.scrollTop;
      // Rola para cima suavemente
      scrollBox.scrollTop = Math.max(0, scrollBox.scrollTop - 650);

      await new Promise((r) => setTimeout(r, 320));

      // Extrai as ofertas carregadas nesta fatia
      extractAllChatOffers();
      updateQueueBadge();

      // Checa se alcançou o divisor "HOJE" ou data anterior
      if (hasReachedTodayStart(scrollBox)) {
        reachedTodayStart = true;
        break;
      }

      // Topo absoluto da conversa alcançado
      if (scrollBox.scrollTop === prevTop && scrollBox.scrollTop === 0) {
        reachedTodayStart = true;
        break;
      }

      if (onProgress) {
        onProgress(stepCount, maxSteps, harvestedOffersCache.size);
      }
    }

    // 2. Retorna suavemente para a posição mais recente (embaixo)
    scrollBox.scrollTop = scrollBox.scrollHeight;

    const all = Array.from(harvestedOffersCache.values());
    if (reachedTodayStart) {
      showToast(`🎯 <b>Início de HOJE alcançado!</b> ${all.length} ofertas capturadas.`);
    } else {
      showToast(`⚡ <b>Pronto!</b> ${all.length} ofertas capturadas.`);
    }

    updateQueueBadge();
    return all;
  }

  // 15. Toast visual no WhatsApp Web
  function showToast(text) {
    let toast = document.getElementById('nanda-whatsapp-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'nanda-whatsapp-toast';
      toast.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        background: #18181b;
        color: #ffffff;
        padding: 12px 20px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 10px 25px rgba(236,72,153,0.4);
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
    }, 4500);
  }

  // Função ultra segura de cópia para área de transferência (com fallback para execCommand)
  function safeCopyToClipboard(text) {
    return new Promise((resolve, reject) => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(resolve).catch(() => {
          fallbackCopyText(text) ? resolve() : reject();
        });
      } else {
        fallbackCopyText(text) ? resolve() : reject();
      }
    });
  }

  function fallbackCopyText(text) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (e) {
      return false;
    }
  }

  // 16. Injeta botões "⚡ Clonar c/ Meu Link" nas mensagens do chat
  function injectCloneButtons() {
    const nodes = getChatMsgElements();

    nodes.forEach(node => {
      if (node.querySelector('.nanda-clone-btn')) return;

      const text = getNodeFullText(node);
      const hasOffer = /(http|meli\.la|shope\.ee|amzn\.to|mercadolivre|shopee|amazon|magalu)/i.test(text);
      if (!hasOffer) return;

      const btn = document.createElement('button');
      btn.className = 'nanda-clone-btn';
      btn.innerHTML = '⚡ Clonar c/ Meu Link';
      btn.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin: 6px 0;
        padding: 6px 14px;
        background: linear-gradient(135deg, #ec4899, #db2777);
        color: #ffffff;
        border: none;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(236,72,153,0.35);
        transition: transform 0.15s ease;
        z-index: 99;
      `;

      btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.05)'; });
      btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        const offers = extractAllChatOffers();
        const thisUrls = extractUrlsFromText(text);
        let targetOffer = null;

        if (thisUrls.length > 0) {
          const cleanThis = thisUrls[0].split('?')[0];
          targetOffer = offers.find(o => o.url.includes(cleanThis));
        }
        if (!targetOffer && offers.length > 0) {
          targetOffer = offers[offers.length - 1];
        }

        const toCopy = targetOffer ? targetOffer.convertedText : cloneAndConvertMessageText(text);

        safeCopyToClipboard(toCopy).then(() => {
          showToast(`⚡ <b>Oferta Clonada!</b> Mensagem copiada com seu link de afiliada.`);
        }).catch(() => {
          showToast(`⚠️ Não foi possível copiar para a área de transferência.`);
        });
      });

      const btnSingleQueue = document.createElement('button');
      btnSingleQueue.className = 'nanda-single-queue-btn';
      btnSingleQueue.innerHTML = '🚀 Enviar p/ Fila';
      btnSingleQueue.title = 'Envia direto para a Fila de Disparo (PROMO MODA & BELEZA #4)';
      btnSingleQueue.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin: 6px 0 6px 6px;
        padding: 6px 14px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: #ffffff;
        border: none;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(16,185,129,0.35);
        transition: transform 0.15s ease;
        z-index: 99;
      `;
      btnSingleQueue.addEventListener('mouseenter', () => { btnSingleQueue.style.transform = 'scale(1.05)'; });
      btnSingleQueue.addEventListener('mouseleave', () => { btnSingleQueue.style.transform = 'scale(1)'; });

      btnSingleQueue.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();

        const offers = extractAllChatOffers();
        const thisUrls = extractUrlsFromText(text);
        let targetOffer = null;
        if (thisUrls.length > 0) {
          const cleanThis = thisUrls[0].split('?')[0];
          targetOffer = offers.find(o => o.url.includes(cleanThis));
        }
        if (!targetOffer && offers.length > 0) {
          targetOffer = offers[offers.length - 1];
        }

        const offerToSend = targetOffer || {
          title: text.split('\n')[0].replace(/[*_~`]/g, '').slice(0, 80) || 'Oferta Clonada',
          currentPrice: 49.90,
          originalPrice: 69.90,
          imageUrl: '',
          url: thisUrls[0] || '',
          affiliateUrl: convertToAffiliateLink(thisUrls[0] || ''),
          marketplace: detectMarketplace(thisUrls[0] || ''),
        };

        showToast('🚀 Enviando oferta para a Fila de Disparo...');
        const res = await sendToQueueViaServiceWorker([offerToSend], ['cmuyvtbad0001dnoffbw3o3e8']);
        if (res && res.success) {
          showToast(`🎉 <b>Oferta enviada para a Fila!</b> (Grupo: PROMO MODA & BELEZA #4)`);
        } else {
          showToast(`❌ Erro ao enviar: ${res?.error || 'Erro no servidor'}`);
        }
      });

      const container = node.querySelector('.copyable-text') || node;
      container.appendChild(btn);
      container.appendChild(btnSingleQueue);
    });
  }

  function updateQueueBadge() {
    const badge = document.getElementById('nanda-wpp-queue-badge');
    const sendCount = document.getElementById('nanda-wpp-send-count');
    const count = harvestedOffersCache.size || extractAllChatOffers().length;
    if (badge) badge.innerText = String(count);
    if (sendCount) sendCount.innerText = String(count);
  }

  // 17. HUD Flutuante no Canto Inferior Direito (Livre de Conflitos com GRUPOLEADS e Menus)
  function injectFloatingBar() {
    if (document.getElementById('nanda-wpp-widget')) {
      updateQueueBadge();
      return;
    }

    const widget = document.createElement('div');
    widget.id = 'nanda-wpp-widget';
    widget.style.cssText = `
      position: fixed;
      bottom: 85px;
      right: 24px;
      z-index: 2147483647;
      background: linear-gradient(135deg, #18181b 0%, #09090b 100%);
      border: 2px solid #ec4899;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(236, 72, 153, 0.45), 0 8px 10px -6px rgba(0, 0, 0, 0.6);
      color: #fff;
      padding: 12px 14px;
      width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-sizing: border-box;
      transition: all 0.25s ease;
    `;

    widget.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 7px;">
          <div style="width: 22px; height: 22px; background: #ec4899; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 13px;">⚡</div>
          <div>
            <div style="font-weight: 700; color: #fdf2f8; font-size: 12px; line-height: 1.2;">Achados da Nanda</div>
            <div style="font-size: 10px; color: #10b981; font-weight: 600;">🎯 PROMO MODA & BELEZA #4</div>
          </div>
        </div>
        <button id="nanda-wpp-toggle-btn" style="background: rgba(255,255,255,0.1); border: none; color: #cbd5e1; border-radius: 6px; padding: 2px 7px; cursor: pointer; font-size: 10px;">Minimizar</button>
      </div>

      <div id="nanda-wpp-widget-body">
        <div style="background: rgba(255, 255, 255, 0.05); padding: 7px 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #94a3b8; font-size: 11px;">Ofertas Capturadas:</span>
          <span id="nanda-wpp-queue-badge" style="font-size: 16px; font-weight: 800; color: #38bdf8;">0</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button id="nanda-wpp-send-queue-btn" style="
            background: linear-gradient(135deg, #10b981, #059669);
            border: none;
            color: white;
            font-weight: 700;
            padding: 9px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
          ">🚀 Enviar Todas para Fila (<span id="nanda-wpp-send-count">0</span>)</button>

          <button id="nanda-fetch-all-day-btn" style="
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: white;
            font-weight: 600;
            padding: 7px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 11px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
          ">📜 Puxar Todas do Dia (Auto-Scroll)</button>

          <button id="nanda-quick-clone-btn" style="
            background: linear-gradient(135deg, #ec4899, #db2777);
            border: none;
            color: white;
            font-weight: 600;
            padding: 7px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 11px;
          ">⚡ Clonar Última c/ Meu Link</button>
        </div>

        <!-- PILOTO AUTOMÁTICO (AUTO-POST) -->
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.12);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: #34d399; display: flex; align-items: center; gap: 4px;">
              <span>🤖</span> Piloto Automático
            </span>
            <select id="nanda-autopost-interval-select" style="
              background: #27272a;
              color: #fbbf24;
              font-weight: 700;
              border: 1px solid #3f3f46;
              border-radius: 6px;
              font-size: 10px;
              padding: 2px 4px;
              cursor: pointer;
            ">
              <option value="5">5 min (teste)</option>
              <option value="10">10 min</option>
              <option value="15" selected>15 min</option>
              <option value="20">20 min</option>
              <option value="30">30 min</option>
            </select>
          </div>

          <button id="nanda-test-post-now-btn" style="
            width: 100%;
            margin-bottom: 5px;
            background: linear-gradient(135deg, #ec4899, #db2777);
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
            box-shadow: 0 4px 10px rgba(236, 72, 153, 0.35);
            transition: all 0.2s ease;
          ">⚡ Disparar 1ª Oferta Agora (Teste)</button>

          <button id="nanda-autopost-btn" style="
            width: 100%;
            background: linear-gradient(135deg, #059669, #047857);
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
            box-shadow: 0 4px 10px rgba(5, 150, 105, 0.3);
            transition: all 0.2s ease;
          ">▶️ Ligar Piloto Automático</button>

          <div id="nanda-autopost-status-box" style="display: none; margin-top: 6px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 6px; padding: 4px 8px; font-size: 10px; color: #a7f3d0; text-align: center;">
            ⏳ Próximo envio em: <span id="nanda-autopost-timer-text" style="font-weight: 800; color: #fbbf24; font-family: monospace;">15:00</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(widget);

    const btnToggle = widget.querySelector('#nanda-wpp-toggle-btn');
    const widgetBody = widget.querySelector('#nanda-wpp-widget-body');
    let isMinimized = false;
    btnToggle?.addEventListener('click', () => {
      isMinimized = !isMinimized;
      widgetBody.style.display = isMinimized ? 'none' : 'block';
      btnToggle.innerText = isMinimized ? 'Expandir' : 'Minimizar';
    });

    const btnAllDay = widget.querySelector('#nanda-fetch-all-day-btn');
    btnAllDay?.addEventListener('click', async () => {
      btnAllDay.innerText = '📜 Puxando ofertas do dia...';
      await autoScrollAndHarvestAllDay();
      btnAllDay.innerText = '📜 Puxar Todas do Dia (Auto-Scroll)';
      updateQueueBadge();
    });

    const btnSendQueue = widget.querySelector('#nanda-wpp-send-queue-btn');
    btnSendQueue?.addEventListener('click', async () => {
      let offers = Array.from(harvestedOffersCache.values());
      if (offers.length === 0) {
        offers = extractAllChatOffers();
      }
      if (offers.length === 0) {
        showToast('⚠️ Nenhuma oferta identificada no chat aberto.');
        return;
      }

      showToast(`🚀 Enviando ${offers.length} ofertas para a Fila de Disparo (PROMO MODA & BELEZA #4)...`);
      const res = await sendToQueueViaServiceWorker(offers, ['cmuyvtbad0001dnoffbw3o3e8']);
      if (res && res.success) {
        showToast(`🎉 <b>Sucesso!</b> ${offers.length} ofertas enviadas para a Fila (Grupo: PROMO MODA & BELEZA #4)!`);
      } else {
        showToast(`❌ Erro ao enviar para fila: ${res?.error || 'Verifique o servidor'}`);
      }
    });

    const btnQuick = widget.querySelector('#nanda-quick-clone-btn');
    btnQuick?.addEventListener('click', () => {
      const offers = extractAllChatOffers();
      if (offers.length === 0) {
        showToast('⚠️ Nenhuma oferta identificada. Role o chat ou clique em Puxar Todas do Dia.');
        return;
      }
      const latest = offers[offers.length - 1];
      safeCopyToClipboard(latest.convertedText).then(() => {
        showToast(`⚡ <b>${offers.length} Oferta(s) Pronta(s)!</b> Última copiada com seu link.`);
      });
    });

    // Botão de Disparo Imediato (Teste)
    const btnTestNow = widget.querySelector('#nanda-test-post-now-btn');
    btnTestNow?.addEventListener('click', async () => {
      btnTestNow.innerText = '⏳ Disparando agora...';
      btnTestNow.style.opacity = '0.7';
      try {
        await executeAutoPostStep();
      } finally {
        btnTestNow.innerText = '⚡ Disparar 1ª Oferta Agora (Teste)';
        btnTestNow.style.opacity = '1';
      }
    });

    // Piloto Automático Listeners
    const btnAutoPost = widget.querySelector('#nanda-autopost-btn');
    const selectInterval = widget.querySelector('#nanda-autopost-interval-select');
    const statusBox = widget.querySelector('#nanda-autopost-status-box');
    const timerText = widget.querySelector('#nanda-autopost-timer-text');

    selectInterval?.addEventListener('change', () => {
      autoPostIntervalMinutes = Number(selectInterval.value) || 15;
      if (isAutoPostRunning) {
        autoPostSecondsRemaining = autoPostIntervalMinutes * 60;
      }
    });

    btnAutoPost?.addEventListener('click', async () => {
      isAutoPostRunning = !isAutoPostRunning;
      if (isAutoPostRunning) {
        autoPostIntervalMinutes = Number(selectInterval?.value) || 15;
        autoPostSecondsRemaining = autoPostIntervalMinutes * 60;
        btnAutoPost.innerHTML = '⏸️ Pausar Piloto Automático';
        btnAutoPost.style.background = 'linear-gradient(135deg, #d97706, #b45309)';
        if (statusBox) statusBox.style.display = 'block';

        showToast(`🚀 <b>Piloto Automático Ativado!</b> Enviando a 1ª oferta imediatamente...`);

        // Envia a 1ª oferta imediatamente sem esperar o tempo do cronômetro!
        await executeAutoPostStep();

        if (autoPostTimerInterval) clearInterval(autoPostTimerInterval);
        autoPostTimerInterval = setInterval(async () => {
          autoPostSecondsRemaining--;
          if (autoPostSecondsRemaining <= 0) {
            autoPostSecondsRemaining = autoPostIntervalMinutes * 60;
            await executeAutoPostStep();
          }

          if (timerText) {
            const m = Math.floor(autoPostSecondsRemaining / 60);
            const s = autoPostSecondsRemaining % 60;
            timerText.innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
          }
        }, 1000);
      } else {
        if (autoPostTimerInterval) clearInterval(autoPostTimerInterval);
        btnAutoPost.innerHTML = '▶️ Ligar Piloto Automático';
        btnAutoPost.style.background = 'linear-gradient(135deg, #059669, #047857)';
        if (statusBox) statusBox.style.display = 'none';
        showToast('⏸️ Piloto Automático pausado.');
      }
    });

    updateQueueBadge();
  }

  // =======================================================================
  // EXECUÇÃO DO DISPARO AUTOMÁTICO NO WHATSAPP
  // =======================================================================
  let isAutoPostRunning = false;
  let autoPostIntervalMinutes = 15;
  let autoPostSecondsRemaining = 15 * 60;
  let autoPostTimerInterval = null;

  function fetchPendingQueue() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'FETCH_PENDING_QUEUE', backendUrl }, (res) => {
          if (chrome.runtime.lastError || !res) {
            fetch(`${backendUrl}/api/queue?status=PENDING`)
              .then((r) => r.json())
              .then((d) => resolve(d?.data || []))
              .catch(() => resolve([]));
          } else {
            resolve(res?.data || []);
          }
        });
      } else {
        fetch(`${backendUrl}/api/queue?status=PENDING`)
          .then((r) => r.json())
          .then((d) => resolve(d?.data || []))
          .catch(() => resolve([]));
      }
    });
  }

  function markOfferPublished(pubId) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'MARK_PUBLISHED', backendUrl, id: pubId }, (res) => {
          resolve(res);
        });
      } else {
        fetch(`${backendUrl}/api/queue/${pubId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'PUBLISH_NOW' }),
        })
          .then((r) => r.json())
          .then(resolve)
          .catch(resolve);
      }
    });
  }

  // Localiza qualquer campo digitável no chat ativo do WhatsApp Web
  function findWhatsAppInput() {
    const selectors = [
      '#main footer div[contenteditable="true"]',
      '#main footer [contenteditable="true"]',
      'footer div[contenteditable="true"]',
      'div[contenteditable="true"][data-tab="10"]',
      'div[contenteditable="true"][data-lexical-editor="true"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][aria-label*="mensagem" i]',
      'div[contenteditable="true"][title*="mensagem" i]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) return el;
    }
    return null;
  }

  // Localiza o botão de envio ativo
  function findSendButton() {
    const selectors = [
      '#main footer button span[data-icon="send"]',
      '#main footer span[data-icon="send"]',
      'footer button span[data-icon="send"]',
      'span[data-icon="send"]',
      'button[aria-label="Enviar"]',
      'button[aria-label="Send"]',
      'button[data-testid="send"]',
      'button[data-testid="compose-btn-send"]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        return el.closest('button') || el;
      }
    }
    return null;
  }

  async function switchToTargetChat(targetName = 'PROMO MODA & BELEZA #4') {
    const cleanTarget = targetName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Checa título do chat já aberto no #main header
    const headerTitle = document.querySelector('#main header') || document.querySelector('header');
    if (headerTitle) {
      const headerText = (headerTitle.innerText || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (headerText.includes(cleanTarget) || (headerText.includes('promomoda') && headerText.includes('4'))) {
        return true; // Já está no grupo correto!
      }
    }

    // 2. Procura na lista lateral visível de conversas
    const chatNodes = document.querySelectorAll('div[role="listitem"]');
    for (const node of chatNodes) {
      const text = (node.innerText || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (text.includes(cleanTarget) || (text.includes('promomoda') && text.includes('4'))) {
        const clickable = node.querySelector('div[role="gridcell"]') || node.querySelector('span[dir="auto"]') || node;
        clickable.click();
        await new Promise((r) => setTimeout(r, 1200));
        return true;
      }
    }

    // 3. Se não achou na lista visível, usa o campo de busca do WhatsApp
    const searchInput = document.querySelector('#side [contenteditable="true"]') ||
                        document.querySelector('div[contenteditable="true"][data-tab="3"]');
    if (searchInput) {
      try {
        searchInput.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, targetName);
        searchInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 1400));

        const firstResult = document.querySelector('#side div[role="listitem"]') ||
                            document.querySelector('#side div[role="gridcell"]');
        if (firstResult) {
          firstResult.click();
          await new Promise((r) => setTimeout(r, 1200));
          return true;
        }
      } catch (e) {
        console.warn('Erro ao pesquisar chat:', e);
      }
    }

    return false;
  }

  // Converte qualquer imagem (inclusive WebP ou AVIF) em JPEG padrão compatível com WhatsApp Web
  async function convertFileToJpeg(file) {
    if (file.type === 'image/jpeg' || file.type === 'image/png') return file;
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.95));
      if (blob) {
        return new File([blob], 'produto.jpg', { type: 'image/jpeg' });
      }
    } catch (e) {
      console.warn('Conversão para JPEG falhou:', e);
    }
    return file;
  }

  // Baixa a imagem do produto através do service worker (imune a CORS e CSP)
  function fetchProductImageFile(imageUrl) {
    return new Promise((resolve) => {
      if (!imageUrl) return resolve(null);
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'FETCH_IMAGE_BASE64', url: imageUrl }, async (res) => {
          if (res && res.success && res.dataUrl) {
            try {
              const r = await fetch(res.dataUrl);
              const blob = await r.blob();
              const mime = res.contentType || blob.type || 'image/jpeg';
              const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
              let file = new File([blob], `oferta.${ext}`, { type: mime });
              file = await convertFileToJpeg(file);
              resolve(file);
            } catch (err) {
              console.warn('[AutoPost] Erro criando File a partir de dataUrl:', err);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      } else {
        resolve(null);
      }
    });
  }

  async function postOfferTextMessage(text) {
    let input = findWhatsAppInput();

    if (!input) {
      for (let retry = 0; retry < 4; retry++) {
        await new Promise((r) => setTimeout(r, 500));
        input = findWhatsAppInput();
        if (input) break;
      }
    }

    if (!input) {
      const footer = document.querySelector('#main footer');
      const footerText = footer ? footer.innerText : '';
      if (/apenas admins|only admins|canal|administradores/i.test(footerText)) {
        showToast('⚠️ <b>Atenção:</b> O grupo atual é restrito (apenas admins postam). Abra seu próprio grupo ou torne este número admin!');
      } else {
        showToast('⚠️ Campo de mensagem não encontrado. Abra o grupo onde deseja postar!');
      }
      return false;
    }

    input.focus();

    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      const pasteEvt = new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true
      });
      input.dispatchEvent(pasteEvt);
    } catch (e) {
      console.warn('ClipboardEvent paste falhou, tentando fallback', e);
    }

    const currentVal = input.innerText || input.textContent || '';
    if (!currentVal.trim() || currentVal.length < 10) {
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);
    }

    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    showToast('🖼️ <b>Texto inserido!</b> Aguardando prévia de link do WhatsApp (3s)...');
    await new Promise((r) => setTimeout(r, 3000));

    let sendBtn = findSendButton();
    if (sendBtn) {
      sendBtn.click();
    } else {
      const enterDown = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
      input.dispatchEvent(enterDown);
      const enterUp = new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
      input.dispatchEvent(enterUp);
    }

    await new Promise((r) => setTimeout(r, 800));
    return true;
  }

  function isMediaEditorOpen() {
    return Boolean(
      document.querySelector('span[data-icon="crop"]') ||
      document.querySelector('span[data-icon="pencil"]') ||
      document.querySelector('span[data-icon="text"]') ||
      document.querySelector('span[data-icon="x-viewer"]') ||
      document.querySelector('div[data-animate-media-viewer="true"]')
    );
  }

  function getMediaCaptionInput() {
    const editables = Array.from(document.querySelectorAll('div[contenteditable="true"]'))
      .filter(el => el.offsetParent !== null);

    if (editables.length === 0) return null;

    // Se só tem 1 contenteditable visível e o editor de mídia está aberto, É a legenda!
    if (editables.length === 1 && isMediaEditorOpen()) {
      return editables[0];
    }

    // Procura por atributos de legenda
    for (const el of editables) {
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const ph = (el.getAttribute('aria-placeholder') || el.getAttribute('placeholder') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();
      if (aria.includes('legenda') || ph.includes('legenda') || title.includes('legenda') ||
          aria.includes('caption') || ph.includes('caption')) {
        return el;
      }
    }

    // Se tem mais de um, retorna o que não for o input normal do chat
    const chatInput = findWhatsAppInput();
    const other = editables.find(el => el !== chatInput);
    if (other) return other;

    return editables[editables.length - 1];
  }

  function getMediaSendButton() {
    // 1. Procura por qualquer botão com data-icon contendo 'send' visível
    const sendIcons = Array.from(document.querySelectorAll('span[data-icon*="send"], span[data-icon*="wds-ic-send"]'));
    for (const icon of sendIcons) {
      const btn = icon.closest('div[role="button"]') || icon.closest('button');
      if (btn && btn.offsetParent !== null) {
        return btn;
      }
    }

    // 2. Procura por botões com aria-label de envio
    const ariaBtns = Array.from(document.querySelectorAll('div[role="button"][aria-label*="Enviar" i], button[aria-label*="Enviar" i], div[role="button"][aria-label*="Send" i], button[aria-label*="Send" i]'))
      .filter(el => el.offsetParent !== null);
    if (ariaBtns.length > 0) {
      return ariaBtns[ariaBtns.length - 1];
    }

    // 3. Procura botão verde circular no canto inferior direito
    const allButtons = Array.from(document.querySelectorAll('div[role="button"], button'))
      .filter(el => el.offsetParent !== null);

    for (const btn of allButtons) {
      const rect = btn.getBoundingClientRect();
      if (rect.top > window.innerHeight * 0.5 && rect.left > window.innerWidth * 0.6) {
        const bg = window.getComputedStyle(btn).backgroundColor || '';
        if (bg.includes('168') || bg.includes('211') || bg.includes('green') || btn.querySelector('svg')) {
          return btn;
        }
      }
    }

    return null;
  }

  async function postOfferWithMedia(text, imageFile) {
    if (!imageFile) {
      return await postOfferTextMessage(text);
    }

    showToast('🖼️ <b>Carregando foto do produto no WhatsApp...</b>');

    // Esconde temporariamente o widget flutuante para não cobrir a barra de envio
    const widget = document.getElementById('nanda-wpp-widget');
    if (widget) {
      widget.style.opacity = '0.15';
      widget.style.pointerEvents = 'none';
    }

    // 1. Tenta acionar input file de fotos do WhatsApp
    let fileInput = document.querySelector('#main footer input[type="file"]') ||
                    document.querySelector('input[type="file"][accept*="image"]') ||
                    document.querySelector('input[type="file"]');

    if (!fileInput) {
      const attachBtn = document.querySelector('#main footer button span[data-icon="plus"]') ||
                        document.querySelector('#main footer button span[data-icon="attach-menu-plus"]') ||
                        document.querySelector('#main footer button span[data-icon="clip"]') ||
                        document.querySelector('#main footer button[aria-label="Anexar"]') ||
                        document.querySelector('#main footer button[aria-label="Attach"]');
      if (attachBtn) {
        attachBtn.closest('button')?.click();
        await new Promise((r) => setTimeout(r, 350));
        fileInput = document.querySelector('input[type="file"][accept*="image"]') ||
                    document.querySelector('input[type="file"]');
      }
    }

    let fileDispatched = false;
    if (fileInput) {
      try {
        const dt = new DataTransfer();
        dt.items.add(imageFile);
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        fileDispatched = true;
      } catch (e) {
        console.warn('Erro ao disparar fileInput:', e);
      }
    }

    // 2. Se fileInput não abriu ou não existia, tenta ClipboardEvent com o File no chat
    if (!fileDispatched) {
      const chatInput = findWhatsAppInput();
      if (chatInput) {
        chatInput.focus();
        try {
          const dt = new DataTransfer();
          dt.items.add(imageFile);
          const pasteEvt = new ClipboardEvent('paste', {
            clipboardData: dt,
            bubbles: true,
            cancelable: true
          });
          chatInput.dispatchEvent(pasteEvt);
        } catch (e) {
          console.warn('Erro no paste do arquivo:', e);
        }
      }
    }

    // 3. Aguarda o editor de mídia abrir (até 4 segundos)
    let captionInput = null;
    for (let i = 0; i < 16; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (isMediaEditorOpen()) {
        captionInput = getMediaCaptionInput();
        if (captionInput) break;
      }
    }

    // 4. Se o modal abriu:
    if (isMediaEditorOpen() || captionInput) {
      showToast('✍️ <b>Foto pronta!</b> Inserindo legenda e link...');

      if (captionInput) {
        captionInput.focus();
        document.execCommand('selectAll', false, null);

        try {
          const textDt = new DataTransfer();
          textDt.setData('text/plain', text);
          captionInput.dispatchEvent(new ClipboardEvent('paste', { clipboardData: textDt, bubbles: true, cancelable: true }));
        } catch (e) {}

        const curVal = captionInput.innerText || captionInput.textContent || '';
        if (!curVal.trim() || curVal.length < 10) {
          document.execCommand('insertText', false, text);
        }
        captionInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
        captionInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      await new Promise((r) => setTimeout(r, 800));

      // 5. Clica no botão de envio do visualizador de foto
      for (let attempt = 0; attempt < 4; attempt++) {
        const sendMediaBtn = getMediaSendButton();
        if (sendMediaBtn) {
          sendMediaBtn.click();
        }

        if (captionInput) {
          const enterDown = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
          captionInput.dispatchEvent(enterDown);
          const enterUp = new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
          captionInput.dispatchEvent(enterUp);
        }

        await new Promise((r) => setTimeout(r, 600));

        // Se o editor de mídia fechou, o envio foi concluído!
        if (!isMediaEditorOpen()) {
          break;
        }
      }

      // Restaura o widget flutuante
      if (widget) {
        widget.style.opacity = '1';
        widget.style.pointerEvents = 'auto';
      }

      await new Promise((r) => setTimeout(r, 800));
      return true;
    }

    // Restaura o widget flutuante caso não tenha aberto
    if (widget) {
      widget.style.opacity = '1';
      widget.style.pointerEvents = 'auto';
    }

    // 6. Se o modal não abriu de jeito nenhum, envia como mensagem de texto
    console.warn('[AutoPost] Modal de mídia não detectado, disparando texto...');
    return await postOfferTextMessage(text);
  }

  async function postOfferMessage(text) {
    return await postOfferTextMessage(text);
  }

  async function executeAutoPostStep() {
    try {
      showToast('📡 <b>1/4</b> Buscando ofertas pendentes na fila...');
      const pubs = await fetchPendingQueue();

      if (!pubs || pubs.length === 0) {
        showToast('💤 <b>Fila Vazia!</b> Nenhuma oferta pendente encontrada na fila do sistema.');
        return;
      }

      const nextPub = pubs[0];
      const targetGroupName = 'PROMO MODA & BELEZA #4';
      const offerTitle = nextPub.offer?.title || nextPub.generatedText?.slice(0, 35) || 'Oferta';
      const imageUrl = nextPub.offer?.product?.imageUrl || nextPub.offer?.imageUrl;

      showToast(`📝 <b>2/4</b> Oferta pronta: <i>${offerTitle.slice(0, 30)}...</i>`);

      // Se o chat atual já possui campo de escrita (o usuário abriu manualmente ou já está nele), usa direto!
      const currentInput = findWhatsAppInput();
      const headerTitle = document.querySelector('#main header')?.innerText || '';

      if (!currentInput || !headerTitle.toLowerCase().includes('promo moda')) {
        showToast(`🔄 Tentando abrir grupo: <b>${targetGroupName}</b>...`);
        const switched = await switchToTargetChat(targetGroupName);
        if (switched) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      let imageFile = null;
      if (imageUrl) {
        showToast('🖼️ <b>3/4</b> Baixando foto oficial do produto...');
        imageFile = await fetchProductImageFile(imageUrl);
      }

      showToast('✍️ <b>3/4</b> Inserindo foto e legenda no chat...');
      const posted = await postOfferWithMedia(nextPub.generatedText, imageFile);

      if (posted) {
        await markOfferPublished(nextPub.id);
        showToast(`🎉 <b>4/4 FOTO E OFERTA ENVIADAS COM SUCESSO!</b><br>Restam <b>${pubs.length - 1}</b> ofertas na fila.`);
        updateQueueBadge();
      }
    } catch (err) {
      console.error('[Piloto Automático] Erro no ciclo:', err);
      showToast(`❌ Erro no disparo: ${err.message || 'Falha inesperada'}`);
    }
  }

  // Observa mudanças no DOM com debounce inteligente e proteção contra loops de CPU
  let domUpdateTimeout = null;
  let isUpdatingDom = false;

  const observer = new MutationObserver((mutations) => {
    if (isUpdatingDom) return;

    // Ignora mutações geradas pelos nossos próprios elementos
    let hasExternalMutation = false;
    for (const m of mutations) {
      const el = m.target;
      if (el && !el.id?.startsWith('nanda-') && !el.className?.toString().includes('nanda-')) {
        hasExternalMutation = true;
        break;
      }
    }
    if (!hasExternalMutation) return;

    if (domUpdateTimeout) clearTimeout(domUpdateTimeout);
    domUpdateTimeout = setTimeout(() => {
      isUpdatingDom = true;
      try {
        extractAllChatOffers();
        injectCloneButtons();
        injectFloatingBar();
      } finally {
        setTimeout(() => { isUpdatingDom = false; }, 200);
      }
    }, 800);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    extractAllChatOffers();
    injectCloneButtons();
    injectFloatingBar();
  }, 1500);

  // 18. Listener para o Popup da Extensão
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_PRODUCT' || request.action === 'GET_HARVESTED_OFFERS') {
      const offers = extractAllChatOffers();

      if (offers && offers.length > 0) {
        sendResponse({
          success: true,
          data: offers.length === 1 ? offers[0] : {
            isListing: true,
            totalFound: offers.length,
            marketplace: 'WhatsApp Web',
            products: offers,
          },
          offers,
          marketplace: 'WhatsApp Web',
        });
      } else {
        sendResponse({
          success: false,
          error: 'Abra uma conversa com ofertas no WhatsApp Web.',
        });
      }
      return true;
    }

    if (request.action === 'FETCH_ALL_DAY_OFFERS') {
      autoScrollAndHarvestAllDay().then((allOffers) => {
        sendResponse({
          success: true,
          data: {
            isListing: true,
            totalFound: allOffers.length,
            marketplace: 'WhatsApp Web',
            products: allOffers,
          },
          offers: allOffers,
          marketplace: 'WhatsApp Web',
        });
      });
      return true; // Resposta assíncrona
    }

    return true;
  });
})();
