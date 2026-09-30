// Scraper da Amazon para Achados da Nanda (Suporte Robusto e Universal)
(function () {
  'use strict';

  function extractAsinFromUrl(url) {
    if (!url) return null;
    const match = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    return match ? match[1].toUpperCase() : null;
  }

  function cleanAmazonImageUrl(url) {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('data:') || url.includes('.svg')) return '';
    return url.replace(/(\/images\/I\/[A-Za-z0-9%@+-]+)\.[^/?#]*?(\.(?:jpg|jpeg|png|gif|webp))(\?[^"'\s]*)?$/i, '$1$2$3');
  }

  function parsePrice(text) {
    if (!text) return 0;
    const match = text.match(/R\$\s*([\d.]+,\d{2}|\d+)/i) || text.match(/([\d.]+,\d{2})/);
    if (!match) return 0;
    const cleaned = match[1].replace(/\./g, '').replace(',', '.');
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  }

  function isListingPage() {
    const href = window.location.href;
    const path = window.location.pathname;
    if (
      href.includes('/s?') ||
      href.includes('/b?') ||
      path.includes('/deals') ||
      path.includes('/goldbox') ||
      href.includes('/gp/goldbox') ||
      href.includes('/gp/deals') ||
      path.includes('/events/')
    ) {
      return true;
    }
    const dpLinks = document.querySelectorAll('a[href*="/dp/"]');
    return dpLinks.length > 2;
  }

  // Extração de Produto Único (Página de Detalhes do Produto)
  function extractSingleProduct() {
    try {
      const titleElem = document.getElementById('productTitle') || 
        document.querySelector('#title') ||
        document.querySelector('h1.a-size-large') ||
        document.querySelector('h1');
      if (!titleElem) return null;
      const title = (titleElem.innerText || titleElem.textContent || '').trim();
      if (!title || title.length < 3) return null;

      // Preço Atual
      let currentPrice = 0;
      const wholeElem = document.querySelector('.priceToPay .a-price-whole') ||
        document.querySelector('.apexPriceToPay .a-price-whole') ||
        document.querySelector('#corePrice_desktop .a-price-whole') ||
        document.querySelector('#corePriceDisplay_desktop_feature_div .a-price-whole') ||
        document.querySelector('.a-price-whole');
      
      const fractionElem = document.querySelector('.priceToPay .a-price-fraction') ||
        document.querySelector('.apexPriceToPay .a-price-fraction') ||
        document.querySelector('#corePrice_desktop .a-price-fraction') ||
        document.querySelector('#corePriceDisplay_desktop_feature_div .a-price-fraction') ||
        document.querySelector('.a-price-fraction');

      if (wholeElem) {
        const whole = (wholeElem.innerText || wholeElem.textContent || '').replace(/\D/g, '');
        const frac = fractionElem ? (fractionElem.innerText || fractionElem.textContent || '').replace(/\D/g, '') : '00';
        currentPrice = parseFloat(`${whole}.${frac}`);
      }

      if (!currentPrice || currentPrice <= 0) {
        const offscreen = document.querySelector('#corePrice_desktop span.a-offscreen') ||
          document.querySelector('#corePriceDisplay_desktop_feature_div span.a-offscreen') ||
          document.querySelector('.priceToPay span.a-offscreen') ||
          document.querySelector('#priceblock_ourprice') ||
          document.querySelector('#priceblock_dealprice');
        if (offscreen) currentPrice = parsePrice(offscreen.innerText || offscreen.textContent);
      }

      // Preço Original
      let originalPrice = currentPrice;
      const strikeElem = document.querySelector('span.a-price[data-a-strike="true"] .a-offscreen') ||
        document.querySelector('.basisPrice .a-offscreen') ||
        document.querySelector('#corePriceDisplay_desktop_feature_div .a-text-price .a-offscreen') ||
        document.querySelector('.priceBlockStrikePriceString') ||
        document.querySelector('.a-price.a-text-price span[aria-hidden="true"]');

      if (strikeElem) {
        const parsed = parsePrice(strikeElem.innerText || strikeElem.textContent);
        if (parsed > 0) originalPrice = parsed;
      }

      // Imagem
      const imgElem = document.getElementById('landingImage') ||
        document.querySelector('#imgBlkFront') ||
        document.querySelector('#main-image') ||
        document.querySelector('#imgTagWrapperId img');
      let imageUrl = imgElem ? (imgElem.getAttribute('data-old-hires') || imgElem.src) : '';
      imageUrl = cleanAmazonImageUrl(imageUrl);

      // Cupom
      const couponElem = document.querySelector('#applicable_coupons') ||
        document.querySelector('.promoPriceBlockMessage') ||
        document.querySelector('.vpcButton');
      const coupon = couponElem ? (couponElem.innerText || couponElem.textContent || '').trim() : null;

      const isPrime = !!document.getElementById('primeSavingsUpsell') ||
        !!document.querySelector('.a-icon-prime') ||
        !!document.querySelector('#prime-badge');

      const asin = extractAsinFromUrl(window.location.href) || '';
      const cleanUrl = asin ? `https://www.amazon.com.br/dp/${asin}` : window.location.href.split('/ref=')[0].split('?')[0];

      return {
        isListing: false,
        marketplace: 'Amazon',
        title,
        originalPrice,
        currentPrice,
        imageUrl,
        coupon,
        shippingInfo: isPrime ? 'Frete Grátis Prime' : 'Consulte o frete',
        url: cleanUrl,
      };
    } catch (e) {
      return null;
    }
  }

  // Extração Universal de Múltiplos Produtos (Ofertas do Dia, Goldbox, Busca)
  function extractListingProducts() {
    const products = [];
    const seenUrls = new Set();
    const seenTitles = new Set();

    // 1. Busca ampla por todos os links que apontam para produtos ou ofertas
    const linkElements = Array.from(document.querySelectorAll('a[href*="/dp/"], a[href*="/gp/product/"], a[href*="/deal/"]'));

    linkElements.forEach((link, index) => {
      try {
        // Ignora barras de navegação e rodapés
        if (link.closest('footer, #navFooter, #navbar, #nav-belt, #nav-main, #rhf-container')) return;

        let href = link.getAttribute('href') || link.href || '';
        if (!href) return;
        if (href.startsWith('/')) href = 'https://www.amazon.com.br' + href;

        // Extrai ASIN e URL canônica
        const asin = extractAsinFromUrl(href);
        let cleanUrl = asin ? `https://www.amazon.com.br/dp/${asin}` : href.split('/ref=')[0].split('?')[0];

        if (seenUrls.has(cleanUrl)) return;

        // Sobe de 1 a 5 níveis procurando o card que engloba imagem e texto de preço
        let card = link;
        for (let i = 0; i < 5; i++) {
          if (!card.parentElement || card.parentElement.tagName === 'BODY') break;
          card = card.parentElement;
          const text = card.innerText || card.textContent || '';
          if (text.includes('R$') && card.querySelector('img')) {
            break;
          }
        }

        const cardText = (card.innerText || card.textContent || '').trim();
        if (!cardText.includes('R$')) return;

        // Preço Atual
        let currentPrice = 0;
        const offPrice = card.querySelector('.a-price .a-offscreen, [class*="price"] .a-offscreen');
        if (offPrice) currentPrice = parsePrice(offPrice.innerText || offPrice.textContent);
        if (!currentPrice || currentPrice <= 0) {
          const whole = card.querySelector('.a-price-whole');
          const frac = card.querySelector('.a-price-fraction');
          if (whole) {
            const w = (whole.innerText || whole.textContent || '').replace(/\D/g, '');
            const f = frac ? (frac.innerText || frac.textContent || '').replace(/\D/g, '') : '00';
            currentPrice = parseFloat(`${w}.${f}`);
          }
        }
        if (!currentPrice || currentPrice <= 0) {
          currentPrice = parsePrice(cardText);
        }
        if (!currentPrice || currentPrice <= 0) return;

        // Preço Original (De: ...)
        let originalPrice = currentPrice;
        const strikeEl = card.querySelector('span.a-price[data-a-strike="true"] .a-offscreen, .a-text-price .a-offscreen');
        if (strikeEl) {
          const p = parsePrice(strikeEl.innerText || strikeEl.textContent);
          if (p > 0) originalPrice = p;
        } else {
          const deMatch = cardText.match(/De:\s*R\$\s*([\d.]+,\d{2}|\d+)/i);
          if (deMatch) {
            const p = parsePrice(deMatch[0]);
            if (p > 0) originalPrice = p;
          }
        }

        // Título
        let title = '';
        const titleCandidates = card.querySelectorAll('[data-testid="product-card-title"], h2, [class*="title"], [class*="Title"], [class*="name"], .a-text-normal, [class*="productTitle"]');
        for (let tc of titleCandidates) {
          const t = (tc.innerText || tc.textContent || '').trim();
          if (t.length > 8 && !t.startsWith('R$') && !t.match(/^\d+%/)) {
            title = t;
            break;
          }
        }
        if (!title) {
          const img = card.querySelector('img[alt]');
          if (img) title = (img.getAttribute('alt') || '').trim();
        }
        if (!title && link.getAttribute('title')) {
          title = link.getAttribute('title').trim();
        }
        if (!title || title.length < 4) return;

        // Evita duplicatas por título idêntico
        const normTitle = title.toLowerCase().slice(0, 35);
        if (seenTitles.has(normTitle)) return;
        seenTitles.add(normTitle);

        // Imagem
        let imageUrl = '';
        const img = card.querySelector('img[src*="/images/I/"], img.s-image, img');
        if (img) {
          const src = img.getAttribute('data-old-hires') || img.src || img.getAttribute('data-src') || '';
          imageUrl = cleanAmazonImageUrl(src);
        }

        // Desconto
        let discount = 0;
        const badgeMatch = cardText.match(/(\d+)\s*%\s*off/i);
        if (badgeMatch) {
          discount = parseInt(badgeMatch[1]);
        } else if (originalPrice > currentPrice) {
          discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
        }

        seenUrls.add(cleanUrl);
        products.push({
          id: asin ? `amazon_${asin}` : `amazon_${products.length}_${Date.now()}`,
          marketplace: 'Amazon',
          title,
          originalPrice,
          currentPrice,
          discountPercentage: discount,
          imageUrl,
          url: cleanUrl,
          shippingInfo: cardText.includes('Prime') ? 'Frete Grátis Prime' : 'Consulte o frete',
        });
      } catch (e) {}
    });

    if (products.length === 0) return null;

    return {
      isListing: true,
      marketplace: 'Amazon',
      totalFound: products.length,
      pageTitle: document.title,
      products,
    };
  }

  // Listener para mensagens do Popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_PRODUCT') {
      try {
        if (isListingPage()) {
          const listing = extractListingProducts();
          if (listing && listing.products && listing.products.length > 0) {
            sendResponse({ success: true, data: listing });
            return true;
          }
        }
        const single = extractSingleProduct();
        if (single) {
          sendResponse({ success: true, data: single });
          return true;
        }
        sendResponse({ success: false, error: 'Nenhum produto identificado nesta página.' });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }
    return true;
  });
})();
