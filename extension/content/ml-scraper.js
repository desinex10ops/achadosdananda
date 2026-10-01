// Scraper do Mercado Livre para Achados da Nanda (Suporte a Produto Único e Lote/Vitrine)
(function () {
  'use strict';

  function isListingPage() {
    const url = window.location.href;
    const isOffersUrl = url.includes('/ofertas') || url.includes('/promocoes') || url.includes('/lista') || url.includes('/busca') || url.includes('/c/');
    const hasMultipleCards = document.querySelectorAll('.poly-card, .ui-search-layout__item, .ui-search-result, .promotion-item').length > 1;
    return isOffersUrl || hasMultipleCards;
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

  // 1. Extração de Produto Único (PDP)
  function extractSingleProduct() {
    try {
      const titleElem = document.querySelector('.ui-pdp-title') || document.querySelector('h1.ui-pdp-title') || document.querySelector('h1');
      if (!titleElem) return null;
      const title = titleElem.innerText.trim();

      const { currentPrice, originalPrice } = extractMercadoLivrePrices(document);

      const imgElem = document.querySelector('.ui-pdp-gallery__figure__image') ||
        document.querySelector('.ui-pdp-image') ||
        document.querySelector('img[data-zoom]');
      let imageUrl = imgElem ? (imgElem.src || imgElem.getAttribute('data-zoom')) : '';

      const couponElem = document.querySelector('.ui-pdp-promotions-pill-label__text') ||
        document.querySelector('.coupon-pill') ||
        document.querySelector('[class*="coupon"]');
      let coupon = couponElem ? couponElem.innerText.trim() : null;

      const shippingElem = document.querySelector('.ui-pdp-media__title') || document.querySelector('.ui-pdp-color--GREEN');
      let shippingInfo = shippingElem && shippingElem.innerText.toLowerCase().includes('grátis') ? 'Frete Grátis' : 'Envio Mercado Envios';

      return {
        isListing: false,
        marketplace: 'Mercado Livre',
        title,
        originalPrice,
        currentPrice,
        imageUrl,
        coupon,
        shippingInfo,
        url: window.location.href.split('?')[0],
      };
    } catch (e) {
      console.error('[Achados da Nanda] Erro PDP:', e);
      return null;
    }
  }

  // 2. Extração em LOTE (Vitrine de Ofertas) 100% passiva no DOM, imune a bloqueios
  function extractListingProducts() {
    const cardSelectors = ['.poly-card', 'li.ui-search-layout__item', '.ui-search-result', '.promotion-item', '.andes-card'];
    let cardElements = [];

    for (const sel of cardSelectors) {
      const found = document.querySelectorAll(sel);
      if (found.length > 0) {
        cardElements = Array.from(found);
        break;
      }
    }

    if (cardElements.length === 0) return null;

    const products = [];
    const seenUrls = new Set();

    cardElements.forEach((card, index) => {
      try {
        // Título e Link
        const titleLink = card.querySelector('a.poly-component__title') ||
          card.querySelector('a.ui-search-link__title-card') ||
          card.querySelector('a.ui-search-item__group__element') ||
          card.querySelector('a[href*="MLB"]');

        if (!titleLink) return;

        let title = titleLink.innerText.trim();
        let href = titleLink.getAttribute('href') || '';
        if (href.startsWith('//')) href = 'https:' + href;
        const cleanUrl = href.split('?')[0].split('#')[0];

        if (seenUrls.has(cleanUrl) || !title) return;
        seenUrls.add(cleanUrl);

        // Preço Original e Preço Atual
        const { currentPrice, originalPrice, discount } = extractMercadoLivrePrices(card);

        if (!currentPrice || currentPrice <= 0) return;

        // Imagem
        const imgElem = card.querySelector('img.poly-component__picture') ||
          card.querySelector('img[src*="http"]') ||
          card.querySelector('img[data-src]');
        let imageUrl = '';
        if (imgElem) {
          imageUrl = imgElem.getAttribute('data-src') || imgElem.src || '';
        }

        // Selo / Tag (ex: "Mais Vendido", "Full")
        const highlightElem = card.querySelector('.poly-component__highlight') || card.querySelector('[class*="highlight"]');
        const highlight = highlightElem ? highlightElem.innerText.trim() : null;

        products.push({
          id: `ml_${index}_${Date.now()}`,
          marketplace: 'Mercado Livre',
          title,
          originalPrice,
          currentPrice,
          discountPercentage: discount,
          imageUrl,
          url: cleanUrl,
          highlight,
          shippingInfo: card.innerText.includes('FULL') ? 'Frete Grátis FULL' : 'Mercado Envios',
        });
      } catch (err) {
        // ignora card malformado
      }
    });

    if (products.length === 0) return null;

    return {
      isListing: true,
      marketplace: 'Mercado Livre',
      totalFound: products.length,
      pageTitle: document.title,
      products,
    };
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_PRODUCT') {
      if (isListingPage()) {
        const listing = extractListingProducts();
        if (listing && listing.products.length > 0) {
          sendResponse({ success: true, data: listing });
          return true;
        }
      }

      // Se for página de produto individual
      const single = extractSingleProduct();
      if (single) {
        sendResponse({ success: true, data: single });
        return true;
      }

      // Fallback
      const fallbackListing = extractListingProducts();
      if (fallbackListing && fallbackListing.products.length > 0) {
        sendResponse({ success: true, data: fallbackListing });
        return true;
      }

      sendResponse({ success: false, error: 'Nenhum produto encontrado.' });
    }
    return true;
  });
})();
