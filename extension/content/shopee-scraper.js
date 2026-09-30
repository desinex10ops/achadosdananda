// Scraper da Shopee para Achados da Nanda (Suporte a Produto Único e Lote)
(function () {
  'use strict';

  function isListingPage() {
    return window.location.href.includes('/search') ||
      window.location.href.includes('/daily_discover') ||
      window.location.href.includes('/flash_sale') ||
      document.querySelectorAll('.shopee-search-item-result__item, [data-sqe="item"]').length > 1;
  }

  function extractSingleProduct() {
    try {
      const titleElem = document.querySelector('.WBVL_7') ||
        document.querySelector('._44qnta') ||
        document.querySelector('.product-briefing h1') ||
        document.querySelector('h1');
      if (!titleElem) return null;
      const title = titleElem.innerText.trim();

      const priceElem = document.querySelector('.pqTWkA') ||
        document.querySelector('._3n5zSv') ||
        document.querySelector('.G274f_') ||
        document.querySelector('[class*="price"]');
      let currentPrice = 0;
      if (priceElem) {
        const raw = priceElem.innerText.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        const match = raw.match(/[\d.]+/);
        if (match) currentPrice = parseFloat(match[0]);
      }

      const origPriceElem = document.querySelector('.Y3gOH7') ||
        document.querySelector('._0Z3IdI') ||
        document.querySelector('s');
      let originalPrice = currentPrice;
      if (origPriceElem) {
        const raw = origPriceElem.innerText.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        const match = raw.match(/[\d.]+/);
        if (match) originalPrice = parseFloat(match[0]);
      }

      const imgElem = document.querySelector('._1noEc9') ||
        document.querySelector('.product-carousel img') ||
        document.querySelector('picture img');
      const imageUrl = imgElem ? imgElem.src : '';

      const couponElem = document.querySelector('.voucher-ticket') || document.querySelector('[class*="voucher"]');
      const coupon = couponElem ? couponElem.innerText.trim() : null;

      return {
        isListing: false,
        marketplace: 'Shopee',
        title,
        originalPrice,
        currentPrice,
        imageUrl,
        coupon,
        shippingInfo: 'Frete Grátis com cupom Shopee',
        url: window.location.href.split('?')[0],
      };
    } catch (e) {
      return null;
    }
  }

  function extractListingProducts() {
    const cardElements = Array.from(document.querySelectorAll('.shopee-search-item-result__item, [data-sqe="item"]'));
    if (cardElements.length === 0) return null;

    const products = [];
    const seenUrls = new Set();

    cardElements.forEach((card, index) => {
      try {
        const linkElem = card.querySelector('a[href*="shopee.com.br"]') || card.querySelector('a');
        if (!linkElem) return;

        let href = linkElem.getAttribute('href') || '';
        if (href.startsWith('/')) href = 'https://shopee.com.br' + href;
        const cleanUrl = href.split('?')[0];

        if (seenUrls.has(cleanUrl)) return;
        seenUrls.add(cleanUrl);

        const titleElem = card.querySelector('[data-sqe="name"]') || card.querySelector('img[alt]');
        const title = titleElem ? (titleElem.innerText || titleElem.getAttribute('alt')).trim() : '';
        if (!title) return;

        const priceElem = card.querySelector('[class*="price"]');
        let currentPrice = 0;
        if (priceElem) {
          const raw = priceElem.innerText.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
          const match = raw.match(/[\d.]+/);
          if (match) currentPrice = parseFloat(match[0]);
        }
        if (!currentPrice || currentPrice <= 0) return;

        const imgElem = card.querySelector('img[src*="http"]');
        const imageUrl = imgElem ? imgElem.src : '';

        products.push({
          id: `shopee_${index}_${Date.now()}`,
          marketplace: 'Shopee',
          title,
          originalPrice: currentPrice,
          currentPrice,
          discountPercentage: 0,
          imageUrl,
          url: cleanUrl,
          shippingInfo: 'Frete Grátis com cupom',
        });
      } catch (e) {}
    });

    if (products.length === 0) return null;

    return {
      isListing: true,
      marketplace: 'Shopee',
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
      const single = extractSingleProduct();
      if (single) {
        sendResponse({ success: true, data: single });
        return true;
      }
      sendResponse({ success: false, error: 'Nenhum produto encontrado.' });
    }
    return true;
  });
})();
