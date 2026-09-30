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

// 5. Renderizar Modo 1: Produto Único
function renderSingleView(product) {
  currentSingleProduct = product;
  loadingState.classList.add('hidden');
  emptyState.classList.add('hidden');
  batchListingView.classList.add('hidden');
  singleProductView.classList.remove('hidden');

  productTitle.innerText = product.title;
  productMarketplace.innerText = product.marketplace || 'Oferta';
  productImage.src = product.imageUrl || 'https://via.placeholder.com/150';

  const orig = product.originalPrice || product.currentPrice;
  const curr = product.currentPrice;
  productOrigPrice.innerText = formatCurrency(orig);
  productCurrPrice.innerText = formatCurrency(curr);

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

// 6. Renderizar Modo 2: Lote / Auto-Scroll Harvester
function renderBatchView(data) {
  currentBatchProducts = data.products;
  selectedProductIds = new Set(data.products.map((p) => p.id));

  loadingState.classList.add('hidden');
  emptyState.classList.add('hidden');
  singleProductView.classList.add('hidden');
  batchListingView.classList.remove('hidden');

  batchTitle.innerText = `${data.totalFound} Ofertas no ${data.marketplace || 'Site'}`;

  renderBatchProductCards();
  updateBatchCounters();
}

function renderBatchProductCards() {
  batchProductsList.innerHTML = currentBatchProducts
    .map((prod) => {
      const isSelected = selectedProductIds.has(prod.id);
      const orig = prod.originalPrice || prod.currentPrice;
      const curr = prod.currentPrice;
      const disc = prod.discountPercentage || (orig > curr ? Math.round(((orig - curr) / orig) * 100) : 0);

      return `
        <div class="batch-item ${isSelected ? 'selected' : ''}" data-id="${prod.id}">
          <input type="checkbox" class="batch-checkbox" data-id="${prod.id}" ${isSelected ? 'checked' : ''}>
          <img src="${prod.imageUrl || 'https://via.placeholder.com/80'}" class="batch-thumb" alt="Foto">
          <div class="batch-details">
            <h5 class="batch-item-title">${prod.title}</h5>
            <div>
              <span class="batch-item-price">${formatCurrency(curr)}</span>
              ${orig > curr ? `<span class="batch-item-old">${formatCurrency(orig)}</span>` : ''}
              ${disc > 0 ? `<span class="batch-item-disc">${disc}% OFF</span>` : ''}
            </div>
            <div style="font-size: 10px; color: #10b981; margin-top: 2px;">✓ Link de Afiliada Ativo</div>
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
