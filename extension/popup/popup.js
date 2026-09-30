const API_BASE = 'http://localhost:3000';

let currentSingleProduct = null;
let currentBatchProducts = [];
let selectedProductIds = new Set();
let templates = [];
let groups = [];

// DOM Elements
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const singleProductView = document.getElementById('singleProductView');
const batchListingView = document.getElementById('batchListingView');
const statusText = document.getElementById('statusText');
const btnRetry = document.getElementById('btnRetry');
const feedbackMessage = document.getElementById('feedbackMessage');

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 1. Conexão com o backend
async function checkBackendConnection() {
  try {
    const res = await fetch(`${API_BASE}/api/extension/me`);
    const json = await res.json();
    if (json.success) {
      statusText.innerText = 'Conectado';
      return true;
    }
  } catch (e) {
    statusText.innerText = 'Desconectado';
    statusText.parentElement.style.background = 'rgba(239, 68, 68, 0.15)';
    statusText.parentElement.style.color = '#ef4444';
  }
  return false;
}

// 2. Carregar templates e grupos da central
async function loadConfig() {
  try {
    const [tRes, gRes] = await Promise.all([
      fetch(`${API_BASE}/api/extension/templates`),
      fetch(`${API_BASE}/api/extension/groups`),
    ]);
    const tData = await tRes.json();
    const gData = await gRes.json();

    if (tData.success) {
      templates = tData.data;
      const opts = templates.map((t) => `<option value="${t.id}">${t.emoji} ${t.name}</option>`).join('');
      templateSelect.innerHTML = opts;
      batchTemplateSelect.innerHTML = opts;
    }

    if (gData.success) {
      groups = gData.data;
      const opts = groups.map((g) => `<option value="${g.id}">${g.name}</option>`).join('');
      groupSelect.innerHTML = opts;
      batchGroupSelect.innerHTML = opts;
    }
  } catch (e) {
    console.error('Erro ao carregar configurações:', e);
  }
}

// 3. Extrair da aba atual
async function extractFromCurrentTab() {
  loadingState.classList.remove('hidden');
  emptyState.classList.add('hidden');
  singleProductView.classList.add('hidden');
  batchListingView.classList.add('hidden');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      showEmptyState();
      return;
    }

    const tabUrl = tab.url || '';
    let scriptFile = null;
    if (tabUrl.includes('amazon.com.br')) scriptFile = 'content/amazon-scraper.js';
    else if (tabUrl.includes('mercadolivre.com.br') || tabUrl.includes('mercadolibre.com')) scriptFile = 'content/ml-scraper.js';
    else if (tabUrl.includes('shopee.com.br')) scriptFile = 'content/shopee-scraper.js';
    else if (tabUrl.includes('web.whatsapp.com')) scriptFile = 'content/whatsapp-scraper.js';

    function sendExtractMessage(isRetry = false) {
      chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PRODUCT' }, async (response) => {
        if (chrome.runtime.lastError || !response || !response.success || !response.data) {
          // Se falhou e ainda não tentamos auto-injetar o script na aba
          if (!isRetry && scriptFile && chrome.scripting) {
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: [scriptFile],
              });
              setTimeout(() => sendExtractMessage(true), 300);
              return;
            } catch (e) {
              console.error('Falha ao auto-injetar script:', e);
            }
          }
          showEmptyState();
          return;
        }

        const data = response.data;
        if (data.isListing && data.products && data.products.length > 0) {
          renderBatchView(data);
        } else {
          renderSingleView(data);
        }
      });
    }

    sendExtractMessage();
  } catch (err) {
    console.error(err);
    showEmptyState();
  }
}

function showEmptyState() {
  loadingState.classList.add('hidden');
  emptyState.classList.remove('hidden');
  singleProductView.classList.add('hidden');
  batchListingView.classList.add('hidden');
}

// 4. Renderizar Modo 1: Produto Único
function renderSingleView(prod) {
  currentSingleProduct = prod;
  loadingState.classList.add('hidden');
  emptyState.classList.add('hidden');
  batchListingView.classList.add('hidden');
  singleProductView.classList.remove('hidden');

  productImage.src = prod.imageUrl || 'https://via.placeholder.com/150';
  productMarketplace.innerText = prod.marketplace || 'Marketplace';
  productTitle.innerText = prod.title || 'Produto sem título';

  productOrigPrice.innerText = formatCurrency(prod.originalPrice);
  productCurrPrice.innerText = formatCurrency(prod.currentPrice);

  const orig = prod.originalPrice || prod.currentPrice;
  const curr = prod.currentPrice;
  let discount = 0;
  if (orig > curr && orig > 0) {
    discount = Math.round(((orig - curr) / orig) * 100);
  }

  productDiscount.innerText = `${discount}% OFF`;
  if (discount === 0) {
    productOrigPrice.style.display = 'none';
  } else {
    productOrigPrice.style.display = 'inline';
  }

  affiliateUrlInput.value = prod.affiliateUrl || prod.url;

  // Se veio do WhatsApp com texto clonado, adiciona opção de manter o texto original com os links substituídos
  if (prod.convertedText) {
    const existingCloneOpt = templateSelect.querySelector('option[value="original_clone"]');
    if (!existingCloneOpt) {
      const cloneOpt = document.createElement('option');
      cloneOpt.value = 'original_clone';
      cloneOpt.innerText = '⚡ Texto Original (Apenas Links Substituídos)';
      templateSelect.prepend(cloneOpt);
    }
    templateSelect.value = 'original_clone';
  }

  updateGeneratedMessage();
}

function updateGeneratedMessage() {
  if (!currentSingleProduct) return;

  const link = affiliateUrlInput.value.trim() || currentSingleProduct.affiliateUrl || currentSingleProduct.url;

  if (templateSelect.value === 'original_clone' && currentSingleProduct.convertedText) {
    let originalWithUpdatedLink = currentSingleProduct.convertedText;
    if (currentSingleProduct.affiliateUrl && link !== currentSingleProduct.affiliateUrl) {
      originalWithUpdatedLink = originalWithUpdatedLink.replace(currentSingleProduct.affiliateUrl, link);
    }
    whatsappPreview.innerText = originalWithUpdatedLink.trim();
    return;
  }

  const selectedTpl = templates.find((t) => t.id === templateSelect.value) || templates[0];
  if (!selectedTpl) {
    whatsappPreview.innerText = `🔥 ${currentSingleProduct.title}\nPor: ${formatCurrency(currentSingleProduct.currentPrice)}\n${link}`;
    return;
  }

  const precoDe = currentSingleProduct.originalPrice > currentSingleProduct.currentPrice
    ? `De: ~${formatCurrency(currentSingleProduct.originalPrice)}~`
    : '';
  const precoPor = `Por apenas: *${formatCurrency(currentSingleProduct.currentPrice)}*`;
  const desc = currentSingleProduct.originalPrice > currentSingleProduct.currentPrice
    ? `${Math.round(((currentSingleProduct.originalPrice - currentSingleProduct.currentPrice) / currentSingleProduct.originalPrice) * 100)}% OFF`
    : '';

  let text = selectedTpl.structure;
  text = text.replace(/{TITULO}/g, currentSingleProduct.title);
  text = text.replace(/{PRECO_DE}/g, precoDe);
  text = text.replace(/{PRECO_POR}/g, precoPor);
  text = text.replace(/{DESCONTO}/g, desc);
  text = text.replace(/{VALOR_ECONOMIZADO}/g, formatCurrency(currentSingleProduct.originalPrice - currentSingleProduct.currentPrice));
  text = text.replace(/{CUPOM}/g, currentSingleProduct.coupon ? `Cupom: *${currentSingleProduct.coupon}*` : '');
  text = text.replace(/{FRETE}/g, currentSingleProduct.shippingInfo || 'Frete Grátis');
  text = text.replace(/{LINK}/g, link);
  text = text.replace(/{CTA}/g, selectedTpl.cta || '👇 COMPRE AQUI:');
  text = text.replace(/{RODAPE}/g, selectedTpl.footer || '');

  whatsappPreview.innerText = text.trim();
}

templateSelect.addEventListener('change', updateGeneratedMessage);
affiliateUrlInput.addEventListener('input', updateGeneratedMessage);

// 5. Renderizar Modo 2: Lote / Vitrine de Ofertas
function renderBatchView(data) {
  currentBatchProducts = data.products;
  selectedProductIds = new Set(data.products.map((p) => p.id)); // seleciona todos por padrão

  loadingState.classList.add('hidden');
  emptyState.classList.add('hidden');
  singleProductView.classList.add('hidden');
  batchListingView.classList.remove('hidden');

  batchTitle.innerText = `${data.totalFound} Ofertas no ${data.marketplace}`;

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
          </div>
        </div>
      `;
    })
    .join('');

  // Adicionar listeners de clique nos cards e checkboxes
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

// Quick filter chips
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

function updateFilterChipActive(activeBtn) {
  [btnSelectAll, btnSelect40, btnSelect50, btnDeselectAll].forEach((b) => b.classList.remove('active'));
  activeBtn.classList.add('active');
}

// 6. Envio em Lote 100% Seguro (Anti-Ban com Jitter Progressivo)
async function sendBatchOffers(action) {
  const selectedItems = currentBatchProducts.filter((p) => selectedProductIds.has(p.id));
  if (selectedItems.length === 0) return;

  btnBatchAddToQueue.disabled = true;
  btnBatchSaveRadar.disabled = true;
  batchProgressContainer.classList.remove('hidden');

  let successCount = 0;
  const total = selectedItems.length;

  for (let i = 0; i < total; i++) {
    const item = selectedItems[i];
    const progress = Math.round(((i + 1) / total) * 100);
    batchProgressBar.style.width = `${progress}%`;
    batchProgressText.innerText = `Processando com segurança: ${i + 1} de ${total}...`;

    try {
      const payload = {
        title: item.title,
        originalPrice: item.originalPrice,
        currentPrice: item.currentPrice,
        imageUrl: item.imageUrl,
        url: item.url,
        affiliateUrl: item.url,
        marketplace: item.marketplace,
        coupon: null,
        shippingInfo: item.shippingInfo,
        action: action, // QUEUE ou RADAR
        templateId: batchTemplateSelect.value,
        groupIds: batchGroupSelect.value ? [batchGroupSelect.value] : [],
      };

      const res = await fetch(`${API_BASE}/api/extension/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) successCount++;
    } catch (err) {
      console.error(err);
    }

    // Intervalo de segurança anti-ban / anti-trava (250ms a 400ms)
    await sleep(250 + Math.random() * 150);
  }

  batchProgressContainer.classList.add('hidden');
  btnBatchAddToQueue.disabled = false;
  btnBatchSaveRadar.disabled = false;

  showFeedback(
    action === 'QUEUE'
      ? `⚡ ${successCount} ofertas adicionadas à Fila com sucesso!`
      : `🔥 ${successCount} ofertas salvas no Radar!`,
    'success'
  );
}

btnBatchAddToQueue.addEventListener('click', () => sendBatchOffers('QUEUE'));
btnBatchSaveRadar.addEventListener('click', () => sendBatchOffers('RADAR'));

// Ações no modo único
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
      templateId: templateSelect.value,
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

// Inicialização
(async function init() {
  await checkBackendConnection();
  await loadConfig();
  await extractFromCurrentTab();
})();
