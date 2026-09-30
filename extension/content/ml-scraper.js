// Scraper do Mercado Livre para Achados da Nanda (Suporte a Produto Único e Lote/Vitrine)
(function () {
  'use strict';

  function isListingPage() {
    const url = window.location.href;
    const isOffersUrl = url.includes('/ofertas') || url.includes('/promocoes') || url.includes('/lista') || url.includes('/busca') || url.includes('/c/');
    const hasMultipleCards = document.querySelectorAll('.poly-card, .ui-search-layout__item, .ui-search-result, .promotion-item').length > 1;
    return isOffersUrl || hasMultipleCards;
  }

  // 1. Extração de Produto Único (PDP)
  function extractSingleProduct() {
    try {
      const titleElem = document.querySelector('.ui-pdp-title') || document.querySelector('h1.ui-pdp-title') || document.querySelector('h1');
      if (!titleElem) return null;
      const title = titleElem.innerText.trim();

      const priceFraction = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__fraction') ||
        document.querySelector('.andes-money-amount--cents-superscript .andes-money-amount__fraction') ||
        document.querySelector('.andes-money-amount__fraction');
      const priceCents = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__cents') ||
        document.querySelector('.andes-money-amount--cents-superscript .andes-money-amount__cents');

      let currentPrice = 0;
      if (priceFraction) {
        const intVal = priceFraction.innerText.replace(/\D/g, '');
        const centVal = priceCents ? priceCents.innerText.replace(/\D/g, '') : '00';
        currentPrice = parseFloat(`${intVal}.${centVal}`);
      }

      const originalPriceElem = document.querySelector('.ui-pdp-price__original-value .andes-money-amount__fraction') ||
        document.querySelector('s .andes-money-amount__fraction');
      let originalPrice = currentPrice;
      if (originalPriceElem) {
        originalPrice = parseFloat(originalPriceElem.innerText.replace(/\D/g, '')) || currentPrice;
      }

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

        // Preço Atual
        const fracElem = card.querySelector('.andes-money-amount__fraction') ||
          card.querySelector('.poly-price__current .andes-money-amount__fraction') ||
          card.querySelector('.ui-search-price__second-line .andes-money-amount__fraction');
        const centsElem = card.querySelector('.andes-money-amount__cents');

        let currentPrice = 0;
        if (fracElem) {
          const intPart = fracElem.innerText.replace(/\D/g, '');
          const centsPart = centsElem ? centsElem.innerText.replace(/\D/g, '') : '00';
          currentPrice = parseFloat(`${intPart}.${centsPart}`);
        }
        if (!currentPrice || currentPrice <= 0) return;

        // Preço Original (De)
        const origFrac = card.querySelector('s .andes-money-amount__fraction') ||
          card.querySelector('.poly-price__original-value .andes-money-amount__fraction') ||
          card.querySelector('.andes-money-amount--previous .andes-money-amount__fraction');
        let originalPrice = currentPrice;
        if (origFrac) {
          const rawOrig = parseFloat(origFrac.innerText.replace(/\D/g, ''));
          if (rawOrig > currentPrice) originalPrice = rawOrig;
        }

        // Imagem
        const imgElem = card.querySelector('img.poly-component__picture') ||
          card.querySelector('img[src*="http"]') ||
          card.querySelector('img[data-src]');
        let imageUrl = '';
        if (imgElem) {
          imageUrl = imgElem.getAttribute('data-src') || imgElem.src || '';
        }

        // Desconto
        let discount = 0;
        const discountElem = card.querySelector('.andes-money-amount__discount') ||
          card.querySelector('.poly-price__disc') ||
          card.querySelector('[class*="discount"]');
        if (discountElem) {
          const match = discountElem.innerText.match(/\d+/);
          if (match) discount = parseInt(match[0]);
        }
        if (discount === 0 && originalPrice > currentPrice) {
          discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
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
