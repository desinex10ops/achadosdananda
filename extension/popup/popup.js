let API_BASE = 'http://localhost:3000';

let currentSingleProduct = null;
let currentBatchProducts = [];
let selectedProductIds = new Set();
let templates = [];
let groups = [];
let affiliateTags = {};

// DOM Elements
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const singleProductView = document.getElementById('singleProductView');
const batchListingView = document.getElementById('batchListingView');
const statusText = document.getElementById('statusText');
const btnRetry = document.getElementById('btnRetry');
const feedbackMessage = document.getElementById('feedbackMessage');
const linkOpenDashboard = document.getElementById('linkOpenDashboard');

// Settings Elements
const btnSettingsToggle = document.getElementById('btnSettingsToggle');
const settingsPanel = document.getElementById('settingsPanel');
const inputBackendUrl = document.getElementById('inputBackendUrl');
const btnSaveBackendUrl = document.getElementById('btnSaveBackendUrl');

// Single view elements
const productImage = document.getElementById('productImage');
const productMarketplace = document.getElementById('productMarketplace');
const productTitle = document.getElementById('productTitle');
const productOrigPrice = document.getElementById('productOrigPrice');
const productCurrPrice = document.getElementById('productCurrPrice');
const productDiscount = document.getElementById('productDiscount');
const affiliateUrlInput = document.getElementById('affiliateUrl');
const templateSelect = document.getElementById('templateSelect');
const groupSelect = document.getElementById('groupSelect');
const whatsappPreview = document.getElementById('whatsappPreview');
const btnCopyText = document.getElementById('btnCopyText');
const btnAddToQueue = document.getElementById('btnAddToQueue');
const btnSaveRadar = document.getElementById('btnSaveRadar');
const btnOpenWhatsApp = document.getElementById('btnOpenWhatsApp');

// Batch view elements
const batchTitle = document.getElementById('batchTitle');
const batchProductsList = document.getElementById('batchProductsList');
const batchTemplateSelect = document.getElementById('batchTemplateSelect');
const batchGroupSelect = document.getElementById('batchGroupSelect');
const selectedCountQueue = document.getElementById('selectedCountQueue');
const selectedCountRadar = document.getElementById('selectedCountRadar');
const btnBatchAddToQueue = document.getElementById('btnBatchAddToQueue');
const btnBatchSaveRadar = document.getElementById('btnBatchSaveRadar');
const btnSelectAll = document.getElementById('btnSelectAll');
const btnSelect40 = document.getElementById('btnSelect40');
const btnSelect50 = document.getElementById('btnSelect50');
const btnDeselectAll = document.getElementById('btnDeselectAll');
const btnFetchAllDay = document.getElementById('btnFetchAllDay');
const batchProgressContainer = document.getElementById('batchProgressContainer');
const batchProgressBar = document.getElementById('batchProgressBar');
const batchProgressText = document.getElementById('batchProgressText');

function formatCurrency(val) {
  if (!val) return 'R$ 0,00';
  return 'R$ ' + Number(val).toFixed(2).replace('.', ',');
}

// 1. Carregar Configurações de URL do Servidor
function loadServerConfig() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['backendUrl', 'affiliateTags'], (res) => {
        if (res.backendUrl) {
          API_BASE = res.backendUrl.replace(/\/$/, '');
        }
        if (res.affiliateTags) {
          affiliateTags = res.affiliateTags;
        }
        inputBackendUrl.value = API_BASE;
        linkOpenDashboard.href = API_BASE;
        resolve();
      });
    } else {
      inputBackendUrl.value = API_BASE;
      resolve();
    }
  });
}

btnSettingsToggle.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
});

btnSaveBackendUrl.addEventListener('click', async () => {
  const newUrl = inputBackendUrl.value.trim().replace(/\/$/, '');
  if (!newUrl) return;
  API_BASE = newUrl;
  linkOpenDashboard.href = API_BASE;
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ backendUrl: API_BASE });
  }
  settingsPanel.classList.add('hidden');
  showFeedback(`Servidor atualizado: ${API_BASE}`, 'success');
  await checkBackendConnection();
  await loadConfig();
});

// 2. Conexão com o backend
async function checkBackendConnection() {
  statusText.innerText = 'Conectando...';
  try {
    const res = await fetch(`${API_BASE}/api/extension/me`);
    const json = await res.json();
    if (json.success) {
      statusText.innerText = 'Conectado';
      statusText.parentElement.style.background = 'rgba(34, 197, 94, 0.15)';
      statusText.parentElement.style.color = '#22c55e';

      // Atualizar tags de afiliados automaticamente
      if (json.marketplaces) {
        const tags = {};
        json.marketplaces.forEach((m) => {
          tags[m.slug] = m.affiliateTag;
        });
        affiliateTags = tags;
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ affiliateTags: tags });
        }
      }
      return true;
    }
  } catch (e) {
    statusText.innerText = 'Desconectado';
    statusText.parentElement.style.background = 'rgba(239, 68, 68, 0.15)';
    statusText.parentElement.style.color = '#ef4444';
  }
  return false;
}

// 3. Carregar templates e grupos da central
async function loadConfig() {
  try {
    const [tRes, gRes] = await Promise.all([
      fetch(`${API_BASE}/api/extension/templates`),
      fetch(`${API_BASE}/api/extension/groups`),
    ]);
    const tData = await tRes.json();
    const gData = await gRes.json();

    if (tData.success && tData.data.length > 0) {
      templates = tData.data;
      const opts = templates.map((t) => `<option value="${t.id}">${t.emoji || '⚡'} ${t.name}</option>`).join('');
      templateSelect.innerHTML = opts;
      batchTemplateSelect.innerHTML = opts;
    } else {
      templateSelect.innerHTML = `<option value="">⚡ Padrão</option>`;
      batchTemplateSelect.innerHTML = `<option value="">⚡ Padrão</option>`;
    }

    if (gData.success && gData.data.length > 0) {
      groups = gData.data;
      const opts = groups.map((g) => `<option value="${g.id}">${g.name}</option>`).join('');
      groupSelect.innerHTML = opts;
      batchGroupSelect.innerHTML = opts;

      const promoGroup = groups.find((g) => g.name.includes('PROMO MODA') || g.name.includes('BELEZA'));
      if (promoGroup) {
        groupSelect.value = promoGroup.id;
        batchGroupSelect.value = promoGroup.id;
      }
    } else {
      groupSelect.innerHTML = `<option value="">Grupo VIP Principal</option>`;
      batchGroupSelect.innerHTML = `<option value="">Grupo VIP Principal</option>`;
    }
  } catch (e) {
    console.warn('Usando templates locais');
  }
}

// 4. Injetor de código de afiliada no link
function convertAffiliateLink(url, marketplace) {
  if (!url) return '';
  const mp = (marketplace || '').toLowerCase();
  try {
    const u = new URL(url.startsWith('//') ? 'https:' + url : url);
    if (mp.includes('amazon')) {
      const tag = affiliateTags['amazon'] || 'achadosnanda-20';
      u.searchParams.set('tag', tag);
      u.searchParams.delete('ref');
      return u.toString();
    }
    if (mp.includes('mercado')) {
      const tag = affiliateTags['mercado-livre'] || 'meli-achadosnanda';
      u.searchParams.set('matt_tool', tag);
      return u.toString();
    }
    if (mp.includes('shopee')) {
      const tag = affiliateTags['shopee'] || 'achadosdananda-20';
      u.searchParams.set('utm_source', tag);
      u.searchParams.set('aff_sub', tag);
      return u.toString();
    }
    return url;
  } catch (err) {
    return url;
  }
}

const FALLBACK_PRODUCT_IMAGE = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='%23fce7f3'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='28' text-anchor='middle' dominant-baseline='central'%3E🛍️%3C/text%3E%3C/svg%3E";

// 5. Renderizar Modo 1: Produto Único
function renderSingleView(product) {
  currentSingleProduct = product;
  loadingState.classList.add('hidden');
  emptyState.classList.add('hidden');
  batchListingView.classList.add('hidden');
  singleProductView.classList.remove('hidden');

  productTitle.innerText = product.title;
  productMarketplace.innerText = product.marketplace || 'Oferta';
  productImage.src = product.imageUrl || FALLBACK_PRODUCT_IMAGE;
  productImage.onerror = () => { productImage.src = FALLBACK_PRODUCT_IMAGE; };

  let orig = product.originalPrice || product.currentPrice;
  let curr = product.currentPrice;
  if (orig < curr && orig > 0) {
    const tmp = orig;
    orig = curr;
    curr = tmp;
  }
  productOrigPrice.innerText = orig > curr ? `De: ${formatCurrency(orig)}` : '';
  productCurrPrice.innerText = orig > curr ? `Por: ${formatCurrency(curr)}` : formatCurrency(curr);

  if (orig > curr) {
    const disc = Math.round(((orig - curr) / orig) * 100);
    productDiscount.innerText = `${disc}% OFF`;
    productDiscount.classList.remove('hidden');
    productOrigPrice.classList.remove('hidden');
  } else {
    productDiscount.classList.add('hidden');
    productOrigPrice.classList.add('hidden');
  }

  // Gera o link de afiliada automaticamente
  const cleanLink = convertAffiliateLink(product.url, product.marketplace);
  affiliateUrlInput.value = cleanLink;

  updateGeneratedMessage();
}

function updateGeneratedMessage() {
  if (!currentSingleProduct) return;
  const selectedTplId = templateSelect.value;
  const selectedTpl = templates.find((t) => t.id === selectedTplId) || templates[0] || {
    structure: '⚡ {TITULO}\n\nDe: {PRECO_DE}\nPor apenas: {PRECO_POR}\n{DESCONTO}\n\n{FRETE}\n\n👇 VEJA AQUI:\n{LINK}',
    cta: '👇 VEJA AQUI:',
    footer: 'Achados da Nanda',
  };

  const orig = currentSingleProduct.originalPrice || currentSingleProduct.currentPrice;
  const curr = currentSingleProduct.currentPrice;
  const disc = orig > curr ? Math.round(((orig - curr) / orig) * 100) : 0;
  const link = affiliateUrlInput.value.trim() || currentSingleProduct.url;

  let text = selectedTpl.structure || '';
  text = text.replace(/{TITULO}/g, currentSingleProduct.title);
  text = text.replace(/{PRECO_DE}/g, orig > curr ? `De: ~${formatCurrency(orig)}~` : '');
  text = text.replace(/{PRECO_POR}/g, formatCurrency(curr));
  text = text.replace(/{DESCONTO}/g, disc > 0 ? `${disc}% OFF` : '');
  text = text.replace(/{VALOR_ECONOMIZADO}/g, orig > curr ? formatCurrency(orig - curr) : '');
  text = text.replace(/{CUPOM}/g, currentSingleProduct.coupon ? `Cupom: ${currentSingleProduct.coupon}` : '');
  text = text.replace(/{FRETE}/g, currentSingleProduct.shippingInfo || 'Frete Grátis');
  text = text.replace(/{LINK}/g, link);
  text = text.replace(/{CTA}/g, selectedTpl.cta || '👇 COMPRE AQUI:');
  text = text.replace(/{RODAPE}/g, selectedTpl.footer || '');

  whatsappPreview.innerText = text.trim();
}

templateSelect.addEventListener('change', updateGeneratedMessage);
affiliateUrlInput.addEventListener('input', updateGeneratedMessage);

function deduplicateOffers(offers) {
  if (!Array.isArray(offers)) return [];
  const urlMap = new Map();
  const titleMap = new Map();

  for (const offer of offers) {
    if (!offer) continue;

    const rawUrl = (offer.url || offer.affiliateUrl || '').trim();
    const cleanUrl = rawUrl.split('?')[0].replace(/\/+$/, '').toLowerCase();

    const cleanTitle = (offer.title || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 40);

    const hasUrl = cleanUrl && cleanUrl.length > 5;
    const hasTitle = cleanTitle && cleanTitle.length > 6 && cleanTitle !== 'achado promocional';

    let existing = null;
    if (hasUrl && urlMap.has(cleanUrl)) {
      existing = urlMap.get(cleanUrl);
    } else if (hasTitle && titleMap.has(cleanTitle)) {
      existing = titleMap.get(cleanTitle);
    }

    if (existing) {
      if (offer.currentPrice > 0 && (!existing.currentPrice || existing.currentPrice === 0)) {
        existing.currentPrice = offer.currentPrice;
        existing.originalPrice = offer.originalPrice;
        existing.title = offer.title;
        if (offer.imageUrl) existing.imageUrl = offer.imageUrl;
      }
      continue;
    }

    if (hasUrl) urlMap.set(cleanUrl, offer);
    if (hasTitle) titleMap.set(cleanTitle, offer);
  }

  return Array.from(new Set([...urlMap.values(), ...titleMap.values()]));
}

// 6. Renderizar Modo 2: Lote / Auto-Scroll Harvester
function renderBatchView(data) {
  const uniqueProducts = deduplicateOffers(data.products || []);
  currentBatchProducts = uniqueProducts;
  selectedProductIds = new Set(uniqueProducts.map((p) => p.id));

  loadingState.classList.add('hidden');
  emptyState.classList.add('hidden');
  singleProductView.classList.add('hidden');
  batchListingView.classList.remove('hidden');

  batchTitle.innerText = `${uniqueProducts.length} Ofertas Únicas no ${data.marketplace || 'Site'}`;

  renderBatchProductCards();
  updateBatchCounters();
}

function renderBatchProductCards() {
  batchProductsList.innerHTML = currentBatchProducts
    .map((prod) => {
      const isSelected = selectedProductIds.has(prod.id);
      let orig = prod.originalPrice || prod.currentPrice;
      let curr = prod.currentPrice;
      if (orig < curr && orig > 0) {
        const tmp = orig;
        orig = curr;
        curr = tmp;
      }
      const disc = prod.discountPercentage || (orig > curr ? Math.round(((orig - curr) / orig) * 100) : 0);

      return `
        <div class="batch-item ${isSelected ? 'selected' : ''}" data-id="${prod.id}">
          <img src="${prod.imageUrl || FALLBACK_PRODUCT_IMAGE}" class="batch-thumb" alt="Foto" onerror="this.onerror=null;this.src=FALLBACK_PRODUCT_IMAGE">
          <div class="batch-details">
            <h5 class="batch-item-title">${prod.title}</h5>
            <div style="display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; margin-top: 3px;">
              <span class="batch-item-price" style="font-size: 13px; font-weight: 800; color: #ec4899;">${formatCurrency(curr)}</span>
              ${orig > curr ? `<span class="batch-item-old" style="font-size: 11px; text-decoration: line-through; color: #94a3b8;">${formatCurrency(orig)}</span>` : ''}
              ${disc > 0 ? `<span class="batch-item-disc" style="font-size: 10px; font-weight: 700; color: #10b981; background: rgba(16,185,129,0.12); padding: 1px 5px; border-radius: 4px;">${disc}% OFF</span>` : ''}
            </div>
            <div style="font-size: 10px; color: #10b981; margin-top: 3px; font-weight: 600;">✓ Link de Afiliada Ativo</div>
          </div>
        </div>
      `;
    })
    .join('');

  batchProductsList.querySelectorAll('.batch-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      const id = item.dataset.id;
      const checkbox = item.querySelector('.batch-checkbox');

      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
      }

      if (checkbox.checked) {
        selectedProductIds.add(id);
        item.classList.add('selected');
      } else {
        selectedProductIds.delete(id);
        item.classList.remove('selected');
      }
      updateBatchCounters();
    });
  });
}

function updateBatchCounters() {
  const count = selectedProductIds.size;
  selectedCountQueue.innerText = String(count);
  selectedCountRadar.innerText = String(count);
  btnBatchAddToQueue.disabled = count === 0;
  btnBatchSaveRadar.disabled = count === 0;
}

function updateFilterChipActive(activeBtn) {
  [btnSelectAll, btnSelect40, btnSelect50, btnDeselectAll].forEach((b) => b.classList.remove('active'));
  activeBtn.classList.add('active');
}

btnSelectAll.addEventListener('click', () => {
  selectedProductIds = new Set(currentBatchProducts.map((p) => p.id));
  updateFilterChipActive(btnSelectAll);
  renderBatchProductCards();
  updateBatchCounters();
});

btnSelect40.addEventListener('click', () => {
  selectedProductIds = new Set(
    currentBatchProducts.filter((p) => (p.discountPercentage || 0) >= 40).map((p) => p.id)
  );
  updateFilterChipActive(btnSelect40);
  renderBatchProductCards();
  updateBatchCounters();
});

btnSelect50.addEventListener('click', () => {
  selectedProductIds = new Set(
    currentBatchProducts.filter((p) => (p.discountPercentage || 0) >= 50).map((p) => p.id)
  );
  updateFilterChipActive(btnSelect50);
  renderBatchProductCards();
  updateBatchCounters();
});

btnDeselectAll.addEventListener('click', () => {
  selectedProductIds.clear();
  updateFilterChipActive(btnDeselectAll);
  renderBatchProductCards();
  updateBatchCounters();
});

if (btnFetchAllDay) {
  btnFetchAllDay.addEventListener('click', async () => {
    btnFetchAllDay.disabled = true;
    btnFetchAllDay.innerText = '📜 Puxando ofertas do dia... (aguarde)';
    showFeedback('Puxando histórico de ofertas do dia...', 'info');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        btnFetchAllDay.disabled = false;
        btnFetchAllDay.innerText = '📜 Puxar Todas as Ofertas do Dia (Auto-Scroll)';
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: 'FETCH_ALL_DAY_OFFERS' }, (response) => {
        btnFetchAllDay.disabled = false;
        btnFetchAllDay.innerText = '📜 Puxar Todas as Ofertas do Dia (Auto-Scroll)';

        if (response && response.success && response.offers && response.offers.length > 0) {
          renderBatchView({
            totalFound: response.offers.length,
            marketplace: 'WhatsApp Web',
            products: response.offers,
          });
          showFeedback(`⚡ Sucesso! ${response.offers.length} ofertas do dia capturadas!`, 'success');
        } else {
          showFeedback('Nenhuma nova oferta identificada.', 'info');
        }
      });
    } catch (e) {
      btnFetchAllDay.disabled = false;
      btnFetchAllDay.innerText = '📜 Puxar Todas as Ofertas do Dia (Auto-Scroll)';
      showFeedback('Erro ao puxar histórico do dia.', 'error');
    }
  });
}

// 7. Envio em Lote Super Rápido (Single Batch POST)
async function sendBatchOffers(action) {
  const selectedList = currentBatchProducts.filter((p) => selectedProductIds.has(p.id));
  if (selectedList.length === 0) return;

  btnBatchAddToQueue.disabled = true;
  btnBatchSaveRadar.disabled = true;
  batchProgressContainer.classList.remove('hidden');
  batchProgressBar.style.width = '50%';
  batchProgressText.innerText = `Enviando ${selectedList.length} ofertas para ${action === 'QUEUE' ? 'a Fila' : 'o Radar'}...`;

  try {
    const payloadItems = selectedList.map((prod) => ({
      title: prod.title,
      originalPrice: prod.originalPrice,
      currentPrice: prod.currentPrice,
      imageUrl: prod.imageUrl,
      url: prod.url || prod.originalUrl,
      affiliateUrl: prod.affiliateUrl || convertAffiliateLink(prod.url || prod.originalUrl, prod.marketplace),
      marketplace: prod.marketplace,
      coupon: prod.coupon,
      shippingInfo: prod.shippingInfo,
      action,
    }));

    const res = await fetch(`${API_BASE}/api/extension/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: payloadItems,
        action,
        templateId: batchTemplateSelect.value || undefined,
        groupIds: batchGroupSelect.value ? [batchGroupSelect.value] : [],
      }),
    });

    batchProgressBar.style.width = '100%';

    const json = await res.json();
    if (json.success) {
      showFeedback(
        action === 'QUEUE'
          ? `⚡ ${json.count || selectedList.length} ofertas adicionadas à Fila com sucesso!`
          : `🔥 ${json.count || selectedList.length} ofertas salvas no Radar!`,
        'success'
      );
    } else {
      showFeedback(`Erro ao salvar: ${json.error || 'Falha no servidor'}`, 'error');
    }
  } catch (err) {
    showFeedback('Falha de conexão com o servidor.', 'error');
  } finally {
    batchProgressContainer.classList.add('hidden');
    btnBatchAddToQueue.disabled = false;
    btnBatchSaveRadar.disabled = false;
  }
}

btnBatchAddToQueue.addEventListener('click', () => sendBatchOffers('QUEUE'));
btnBatchSaveRadar.addEventListener('click', () => sendBatchOffers('RADAR'));

// 8. Envio de Oferta Única
btnAddToQueue.addEventListener('click', async () => {
  if (!currentSingleProduct) return;
  showFeedback('Enviando para a Fila...', 'info');

  try {
    const payload = {
      title: currentSingleProduct.title,
      originalPrice: currentSingleProduct.originalPrice,
      currentPrice: currentSingleProduct.currentPrice,
      imageUrl: currentSingleProduct.imageUrl,
      url: currentSingleProduct.url,
      affiliateUrl: affiliateUrlInput.value.trim() || currentSingleProduct.url,
      marketplace: currentSingleProduct.marketplace,
      coupon: currentSingleProduct.coupon,
      action: 'QUEUE',
      templateId: templateSelect.value || undefined,
      groupIds: groupSelect.value ? [groupSelect.value] : [],
    };

    const res = await fetch(`${API_BASE}/api/extension/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showFeedback('⚡ Adicionada à Fila com sucesso!', 'success');
    } else {
      showFeedback('Erro ao adicionar.', 'error');
    }
  } catch (err) {
    showFeedback('Falha de conexão com o servidor.', 'error');
  }
});

btnSaveRadar.addEventListener('click', async () => {
  if (!currentSingleProduct) return;
  showFeedback('Salvando no Radar...', 'info');

  try {
    const payload = {
      title: currentSingleProduct.title,
      originalPrice: currentSingleProduct.originalPrice,
      currentPrice: currentSingleProduct.currentPrice,
      imageUrl: currentSingleProduct.imageUrl,
      url: currentSingleProduct.url,
      affiliateUrl: affiliateUrlInput.value.trim() || currentSingleProduct.url,
      marketplace: currentSingleProduct.marketplace,
      coupon: currentSingleProduct.coupon,
      action: 'RADAR',
    };

    const res = await fetch(`${API_BASE}/api/extension/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showFeedback('🔥 Salva no Radar com sucesso!', 'success');
    } else {
      showFeedback('Erro ao salvar.', 'error');
    }
  } catch (err) {
    showFeedback('Falha de conexão.', 'error');
  }
});

btnCopyText.addEventListener('click', async () => {
  await navigator.clipboard.writeText(whatsappPreview.innerText);
  btnCopyText.innerText = 'Copiado!';
  setTimeout(() => (btnCopyText.innerText = 'Copiar'), 2000);
});

btnOpenWhatsApp.addEventListener('click', () => {
  const url = `https://web.whatsapp.com/send?text=${encodeURIComponent(whatsappPreview.innerText)}`;
  window.open(url, '_blank');
});

btnRetry.addEventListener('click', extractFromCurrentTab);

function showFeedback(msg, type) {
  feedbackMessage.innerText = msg;
  feedbackMessage.className = `feedback ${type}`;
  feedbackMessage.classList.remove('hidden');
  setTimeout(() => feedbackMessage.classList.add('hidden'), 4000);
}

// 9. Extração da Aba Ativa (Prioriza colheita ao rolar)
async function extractFromCurrentTab() {
  loadingState.classList.remove('hidden');
  emptyState.classList.add('hidden');
  singleProductView.classList.add('hidden');
  batchListingView.classList.add('hidden');

  if (typeof chrome === 'undefined' || !chrome.tabs) {
    loadingState.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      loadingState.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    // Primeiro tenta buscar ofertas colhidas pelo Auto-Scroll Harvester ou WhatsApp
    chrome.tabs.sendMessage(tab.id, { action: 'GET_HARVESTED_OFFERS' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success || (!response.offers && !response.data)) {
        // Fallback: extração pontual
        chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PRODUCT' }, (fallbackRes) => {
          loadingState.classList.add('hidden');
          if (chrome.runtime.lastError || !fallbackRes || !fallbackRes.success || !fallbackRes.data) {
            emptyState.classList.remove('hidden');
            return;
          }

          if (fallbackRes.data.isListing) {
            renderBatchView(fallbackRes.data);
          } else {
            renderSingleView(fallbackRes.data);
          }
        });
        return;
      }

      // Se encontrou dados válidos
      loadingState.classList.add('hidden');
      if (response.data && !response.data.isListing) {
        renderSingleView(response.data);
      } else if (response.data && response.data.isListing) {
        renderBatchView(response.data);
      } else if (response.offers && response.offers.length > 0) {
        renderBatchView({
          totalFound: response.offers.length,
          marketplace: response.marketplace || 'Ofertas',
          products: response.offers,
        });
      }
    });
  } catch (err) {
    loadingState.classList.add('hidden');
    emptyState.classList.remove('hidden');
  }
}

// Inicialização
(async function init() {
  await loadServerConfig();
  await checkBackendConnection();
  await loadConfig();
  await extractFromCurrentTab();
})();


// =========================================================================
// FERRAMENTAS: EXTRAIR LINKS DE PRODUTOS DA ABA ATUAL (MERCADO LIVRE / SHOPEE)
// =========================================================================
const btnExtractLinks = document.getElementById('btnExtractLinks');
const extractLinksFeedback = document.getElementById('extractLinksFeedback');
const extractLinksCountText = document.getElementById('extractLinksCountText');

btnExtractLinks?.addEventListener('click', async () => {
  btnExtractLinks.innerText = '⏳ Extraindo links...';
  btnExtractLinks.style.opacity = '0.6';

  try {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!activeTab || !activeTab.id) {
        throw new Error('Nenhuma aba ativa identificada.');
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: async () => {
          // 1. Rola suavemente para baixo para acionar o carregamento de todos os produtos com lazy-loading
          await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 400;
            let count = 0;
            const maxScrolls = 15; // Rola até 15 vezes rapidamente
            const timer = setInterval(() => {
              window.scrollBy(0, distance);
              totalHeight += distance;
              count++;
              if (count >= maxScrolls || (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
                clearInterval(timer);
                // Retorna ao topo suavemente
                window.scrollTo({ top: 0, behavior: 'instant' });
                setTimeout(resolve, 300);
              }
            }, 100);
          });

          const links = new Set();
          const items = [];
          const seenUrls = new Set();

          // 1. Puxa TODAS as ofertas já capturadas durante a rolagem (ex: as 81 ofertas acumuladas!)
          if (window.__nanda_captured_offers && typeof window.__nanda_captured_offers.forEach === 'function') {
            window.__nanda_captured_offers.forEach((val, key) => {
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
          }

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
            
            // Procura a imagem real do Mercado Livre (incluindo lazy-loaded, data-src e srcset)
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

          // Fallback caso encontre links de produtos avulsos na página
          document.querySelectorAll('a[href*="/p/MLB"], a[href*="MLB-"]').forEach((a) => {
            let h = a.href;
            if (!h) return;
            h = h.split('#')[0];
            const cleanUrl = h.split('?')[0];
            if (!seenUrls.has(cleanUrl)) {
              seenUrls.add(cleanUrl);
              links.add(h);
            }
          });

          // Une com todas as ofertas já acumuladas na memória do Harvester enquanto o usuário rolou a página
          if (window.__nanda_captured_offers && typeof window.__nanda_captured_offers.forEach === 'function') {
            window.__nanda_captured_offers.forEach((val, key) => {
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
          }

          return { links: Array.from(links), items };
        },
      });

      const extractedData = results && results[0] && results[0].result;
      const links = extractedData?.links || [];
      const items = extractedData?.items || [];

      if (links.length > 0) {
        // Envia para o cache do backend e aguarda gravação
        if (items.length > 0) {
          try {
            await fetch(`${API_BASE}/api/marketplaces/mercadolivre/cache-products`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items }),
            });
          } catch (e) {
            console.error('Erro ao salvar cache:', e);
          }
        }

        await navigator.clipboard.writeText(links.join('\n'));

        if (extractLinksFeedback && extractLinksCountText) {
          extractLinksCountText.innerText = links.length;
          extractLinksFeedback.style.display = 'block';
        }

        showFeedback(`✓ ${links.length} link(s) de Mercado Livre copiado(s)!`, 'success');
      } else {
        showFeedback('Nenhum link de produto detectado nesta página.', 'error');
      }
    } else {
      showFeedback('Ambiente de extensão não disponível.', 'error');
    }
  } catch (err) {
    console.error('Erro ao extrair links:', err);
    showFeedback('Falha ao extrair links da aba atual.', 'error');
  } finally {
    btnExtractLinks.innerText = '🔗 Extrair links de produtos da aba atual';
    btnExtractLinks.style.opacity = '1';
  }
});


