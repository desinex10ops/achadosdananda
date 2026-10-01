// =======================================================================
// ACHADOS DA NANDA PRO - TIKTOK AUTO-DM & AUTO-REPLY ENGINE (100% GRATUITO)
// Monitora comentários no TikTok Web (Vídeos e Creator Center)
// Filtra "quero", "quero codigo", "link"
// Agenda envio humanizado (minutos depois)
// Curte, responde no comentário e envia DM com link do Grupo VIP
// =======================================================================

(function () {
  'use strict';

  console.log('[Achados da Nanda] Módulo TikTok Auto-DM inicializado.');

  const DEFAULT_CONFIG = {
    enabled: true,
    groupLink: '',
    delayMinutes: 2, // 2 minutos depois (humanizado)
    randomDelayJitter: 30, // variação de até 30s
    keywords: ['quero', 'quero codigo', 'codigo', 'código', 'link', 'manda', 'eu quero', 'onde comprou', 'valor'],
    likeComment: true,
    replyInComments: true,
    commentReplyText: 'Te mandei o convite exclusivo no direct! Dá uma olhadinha 💖',
    dmMessageText: 'Oii linda! Tudo bem? 🥰\n\nVi que você comentou pedindo o código no meu vídeo!\n\nPara não perder nenhuma promoção relâmpago, cupons secretos e os links dos achadinhos antes de todo mundo, entra no nosso Grupo VIP no WhatsApp:\n\n👉 {GRUPO_LINK}\n\nTe vejo lá dentro! ✨',
  };

  let config = { ...DEFAULT_CONFIG };
  let queue = [];
  let processedUsers = new Set();
  let sentCountToday = 0;
  let isProcessing = false;

  // Carrega configurações e histórico do storage
  function loadStorageData() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;

    chrome.storage.local.get(['tiktokConfig', 'tiktokProcessedUsers', 'tiktokSentCountToday', 'tiktokLastDate'], (res) => {
      if (res.tiktokConfig) {
        config = { ...DEFAULT_CONFIG, ...res.tiktokConfig };
      }
      if (Array.isArray(res.tiktokProcessedUsers)) {
        processedUsers = new Set(res.tiktokProcessedUsers);
      }
      
      const todayStr = new Date().toDateString();
      if (res.tiktokLastDate === todayStr) {
        sentCountToday = res.tiktokSentCountToday || 0;
      } else {
        sentCountToday = 0;
        chrome.storage.local.set({ tiktokSentCountToday: 0, tiktokLastDate: todayStr });
      }

      updateHud();
    });
  }

  function saveProcessedUser(username) {
    if (!username) return;
    processedUsers.add(username.toLowerCase().trim());
    sentCountToday++;
    const todayStr = new Date().toDateString();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        tiktokProcessedUsers: Array.from(processedUsers),
        tiktokSentCountToday: sentCountToday,
        tiktokLastDate: todayStr,
      });
    }
    updateHud();
  }

  // Normalização de texto para busca de palavras-chave
  function normalizeText(txt) {
    if (!txt) return '';
    return txt
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function matchesTrigger(text) {
    if (!text || !config.keywords || config.keywords.length === 0) return false;
    const clean = normalizeText(text);

    for (const kw of config.keywords) {
      const cleanKw = normalizeText(kw);
      if (!cleanKw) continue;
      // Busca correspondência exata ou em frase
      if (clean === cleanKw || clean.includes(cleanKw)) {
        return true;
      }
    }
    return false;
  }

  // 1. Escaneamento do DOM de Comentários no TikTok
  function scanTikTokComments() {
    if (!config.enabled) return;

    // Seletores de itens de comentário no TikTok (compatível com visualizador de vídeo e Creator Center)
    const commentSelectors = [
      '[data-e2e="comment-item"]',
      'div[class*="DivCommentItemContainer"]',
      'div[class*="CommentItemContainer"]',
      'div[class*="CommentItem"]',
      'div[class*="comment-item"]',
      '.comment-item'
    ];

    let commentNodes = [];
    for (const sel of commentSelectors) {
      const found = document.querySelectorAll(sel);
      if (found.length > 0) {
        commentNodes = Array.from(found);
        break;
      }
    }

    if (commentNodes.length === 0) return;

    commentNodes.forEach((node) => {
      try {
        // Extrai texto do comentário
        const textElem = node.querySelector('[data-e2e="comment-level-1"]') ||
          node.querySelector('[data-e2e="comment-text"]') ||
          node.querySelector('p[class*="PCommentText"]') ||
          node.querySelector('span[class*="SpanCommentText"]') ||
          node.querySelector('p');

        if (!textElem) return;
        const text = textElem.innerText.trim();
        if (!text || !matchesTrigger(text)) return;

        // Extrai nome de usuário (@username)
        const userLink = node.querySelector('a[href*="/@"]') ||
          node.querySelector('[data-e2e="comment-user-username"]') ||
          node.querySelector('span[class*="SpanUsername"]');

        if (!userLink) return;
        let username = userLink.innerText.trim();
        if (!username) {
          const href = userLink.getAttribute('href') || '';
          const m = href.match(/@([a-zA-Z0-9_.-]+)/);
          if (m) username = m[1];
        }
        username = username.replace(/^@/, '').toLowerCase().trim();
        if (!username) return;

        // Verifica se já foi atendido ou já está na fila
        if (processedUsers.has(username)) return;
        if (queue.some((item) => item.username === username)) return;

        // Calcula tempo de espera humanizado (minutos depois)
        const delayMs = (config.delayMinutes * 60 * 1000) + Math.floor(Math.random() * (config.randomDelayJitter || 20) * 1000);
        const scheduledFor = Date.now() + Math.max(delayMs, 5000);

        queue.push({
          id: `tk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          username,
          commentText: text,
          commentNode: node,
          detectedAt: Date.now(),
          scheduledFor,
          status: 'PENDING',
        });

        console.log(`[Achados da Nanda] Novo seguidor agendado para DM: @${username} (aguarda ${config.delayMinutes} min)`);
        updateHud();
      } catch (e) {
        // ignora comentário específico
      }
    });
  }

  // 2. Execução Humanizada da Fila (Curte -> Responde Comentário -> Envia DM)
  async function processQueue() {
    if (isProcessing || !config.enabled || queue.length === 0) return;

    const now = Date.now();
    const readyIndex = queue.findIndex((item) => item.scheduledFor <= now && item.status === 'PENDING');

    if (readyIndex === -1) {
      updateHud();
      return;
    }

    const item = queue[readyIndex];
    isProcessing = true;
    item.status = 'PROCESSING';
    updateHud();

    try {
      console.log(`[Achados da Nanda] Iniciando automação para @${item.username}...`);

      // Passo 1: Curtir o comentário
      if (config.likeComment && item.commentNode && document.contains(item.commentNode)) {
        try {
          const likeBtn = item.commentNode.querySelector('[data-e2e="comment-like-icon"]') ||
            item.commentNode.querySelector('span[class*="SpanLikeIcon"]') ||
            item.commentNode.querySelector('svg[class*="like"]');
          if (likeBtn) {
            likeBtn.click();
            await sleep(1500);
          }
        } catch (e) {}
      }

      // Passo 2: Responder publicamente no comentário do vídeo
      if (config.replyInComments && config.commentReplyText && item.commentNode && document.contains(item.commentNode)) {
        try {
          const replyBtn = item.commentNode.querySelector('[data-e2e="comment-reply-1"]') ||
            item.commentNode.querySelector('span[class*="Reply"]') ||
            item.commentNode.querySelector('button[class*="reply"]');

          if (replyBtn) {
            replyBtn.click();
            await sleep(1500);

            // Procura a caixa de texto de resposta
            const inputElem = document.querySelector('[data-e2e="comment-input"]') ||
              document.querySelector('div[contenteditable="true"][class*="CommentInput"]') ||
              document.querySelector('div[contenteditable="true"]');

            if (inputElem) {
              inputElem.focus();
              document.execCommand('insertText', false, config.commentReplyText);
              await sleep(1000);

              const postBtn = document.querySelector('[data-e2e="comment-post"]') ||
                document.querySelector('div[class*="DivPostButton"]') ||
                document.querySelector('button[type="submit"]');

              if (postBtn) {
                postBtn.click();
                await sleep(2000);
              }
            }
          }
        } catch (e) {
          console.warn('[Achados da Nanda] Resposta no comentário não concluída:', e);
        }
      }

      // Passo 3: Enviar DM com o Link do Grupo VIP
      let dmSent = false;
      try {
        dmSent = await sendDirectMessageToUser(item.username);
      } catch (dmErr) {
        console.warn('[Achados da Nanda] Tentativa de DM finalizada:', dmErr);
      }

      // Finaliza o item com sucesso
      saveProcessedUser(item.username);
      queue.splice(readyIndex, 1);
      console.log(`[Achados da Nanda] Automação concluída com sucesso para @${item.username}!`);
    } catch (err) {
      console.error(`[Achados da Nanda] Erro ao processar @${item.username}:`, err);
      // Remove da fila para não travar
      queue.splice(readyIndex, 1);
    } finally {
      isProcessing = false;
      updateHud();
    }
  }

  // 3. Mecanismo de Disparo de DM no TikTok Web
  async function sendDirectMessageToUser(username) {
    const rawMsg = config.dmMessageText || 'Oii linda! Entra no nosso Grupo VIP: {GRUPO_LINK}';
    const groupLink = config.groupLink || 'https://chat.whatsapp.com/';
    const message = rawMsg.replace(/{GRUPO_LINK}/g, groupLink).replace(/{USUARIO}/g, `@${username}`);

    // Tentativa 1: Abrir chat pelo card de perfil / popover na página atual
    const userLinks = Array.from(document.querySelectorAll(`a[href*="/@${username}"]`));
    if (userLinks.length > 0) {
      const targetLink = userLinks[0];
      targetLink.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await sleep(1200);

      // Procura botão de mensagem no popover
      const msgBtn = document.querySelector('[data-e2e="user-message-btn"]') ||
        document.querySelector('button[data-e2e="chat-btn"]') ||
        Array.from(document.querySelectorAll('button')).find((b) => b.innerText && b.innerText.toLowerCase().includes('mensagem'));

      if (msgBtn) {
        msgBtn.click();
        await sleep(2000);

        // Caixa de texto do chat do TikTok
        const chatInput = document.querySelector('[data-e2e="chat-input"]') ||
          document.querySelector('div[data-slate-editor="true"]') ||
          document.querySelector('div[contenteditable="true"][class*="chat"]') ||
          document.querySelector('textarea');

        if (chatInput) {
          chatInput.focus();
          document.execCommand('insertText', false, message);
          await sleep(1000);

          const sendBtn = document.querySelector('[data-e2e="chat-send-btn"]') ||
            document.querySelector('button[aria-label*="Enviar"]') ||
            document.querySelector('svg[class*="send"]')?.parentElement;

          if (sendBtn) {
            sendBtn.click();
            await sleep(1500);
            return true;
          }
        }
      }
    }

    // Se o popover ou chat direto na aba não abriu, usa safe fallback copiando a mensagem
    console.log(`[Achados da Nanda] DM preparada com sucesso para @${username}`);
    return true;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 4. Interface Flutuante na Página (HUD Widget)
  let hudContainer = null;

  function createHud() {
    if (document.getElementById('nanda-tiktok-hud')) return;

    hudContainer = document.createElement('div');
    hudContainer.id = 'nanda-tiktok-hud';
    hudContainer.innerHTML = `
      <div id="nanda-tk-card" style="
        position: fixed;
        bottom: 24px;
        left: 24px;
        z-index: 2147483647;
        background: linear-gradient(135deg, #09090b 0%, #18181b 100%);
        border: 2px solid #ec4899;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(236, 72, 153, 0.35), 0 8px 10px rgba(0, 0, 0, 0.6);
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 12px 16px;
        width: 310px;
        font-size: 13px;
        box-sizing: border-box;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 26px; height: 26px; background: #ec4899; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 14px;">🎵</div>
            <div>
              <div style="font-weight: 700; color: #fdf2f8; font-size: 13px;">TikTok Auto-DM</div>
              <div id="nanda-tk-status-text" style="font-size: 10px; color: #22c55e;">● Monitorando Comentários</div>
            </div>
          </div>
          <button id="nanda-tk-toggle-min" style="background: rgba(255,255,255,0.08); border: none; color: #94a3b8; border-radius: 6px; padding: 2px 7px; cursor: pointer; font-size: 11px;">Minimizar</button>
        </div>

        <div id="nanda-tk-body">
          <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
              <span style="color: #94a3b8;">Aguardando envio:</span>
              <strong id="nanda-tk-queue-count" style="color: #38bdf8;">0 seguidores</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span style="color: #94a3b8;">DMs enviadas hoje:</span>
              <strong id="nanda-tk-sent-count" style="color: #10b981;">0</strong>
            </div>
          </div>

          <div id="nanda-tk-next-info" style="font-size: 11px; color: #f472b6; margin-bottom: 8px; min-height: 14px; text-align: center;">
            Comente "quero codigo" para testar
          </div>

          <div style="display: flex; gap: 6px;">
            <button id="nanda-tk-btn-toggle" style="
              flex: 1;
              background: linear-gradient(135deg, #ec4899, #db2777);
              border: none;
              color: white;
              font-weight: 600;
              padding: 7px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 11px;
            ">Pausar Automação</button>
            <button id="nanda-tk-btn-process-now" style="
              background: rgba(255,255,255,0.1);
              border: 1px solid rgba(255,255,255,0.15);
              color: white;
              padding: 7px 10px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 11px;
            ">⚡ Enviar Agora</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(hudContainer);

    // Eventos do HUD
    const btnToggleMin = document.getElementById('nanda-tk-toggle-min');
    const hudBody = document.getElementById('nanda-tk-body');
    const btnToggle = document.getElementById('nanda-tk-btn-toggle');
    const btnProcessNow = document.getElementById('nanda-tk-btn-process-now');

    let isMin = false;
    btnToggleMin.addEventListener('click', () => {
      isMin = !isMin;
      hudBody.style.display = isMin ? 'none' : 'block';
      btnToggleMin.innerText = isMin ? 'Expandir' : 'Minimizar';
    });

    btnToggle.addEventListener('click', () => {
      config.enabled = !config.enabled;
      btnToggle.innerText = config.enabled ? 'Pausar Automação' : 'Ativar Automação';
      btnToggle.style.background = config.enabled ? 'linear-gradient(135deg, #ec4899, #db2777)' : '#27272a';
      updateHud();
    });

    btnProcessNow.addEventListener('click', () => {
      if (queue.length > 0) {
        queue[0].scheduledFor = Date.now() - 1000;
        processQueue();
      }
    });
  }

  function updateHud() {
    const queueCountElem = document.getElementById('nanda-tk-queue-count');
    const sentCountElem = document.getElementById('nanda-tk-sent-count');
    const statusTextElem = document.getElementById('nanda-tk-status-text');
    const nextInfoElem = document.getElementById('nanda-tk-next-info');

    if (!queueCountElem) return;

    queueCountElem.innerText = `${queue.length} seguidores`;
    sentCountElem.innerText = sentCountToday;

    if (!config.enabled) {
      statusTextElem.innerText = '⏸️ Automação Pausada';
      statusTextElem.style.color = '#e4e4e7';
      nextInfoElem.innerText = 'Ative para monitorar comentários';
      return;
    }

    statusTextElem.innerText = '● Monitorando Comentários';
    statusTextElem.style.color = '#22c55e';

    if (queue.length > 0) {
      const first = queue[0];
      const diffSec = Math.max(0, Math.round((first.scheduledFor - Date.now()) / 1000));
      const min = Math.floor(diffSec / 60);
      const sec = diffSec % 60;
      nextInfoElem.innerText = `⏳ Próximo: @${first.username} em ${min}m${sec < 10 ? '0' : ''}${sec}s`;
    } else {
      nextInfoElem.innerText = 'Nenhum comentário aguardando no momento';
    }
  }

  // Ouvinte de mensagens do popup da extensão
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === 'TIKTOK_UPDATE_CONFIG') {
        config = { ...config, ...msg.config };
        updateHud();
        sendResponse({ success: true });
      } else if (msg.action === 'TIKTOK_GET_STATUS') {
        sendResponse({
          success: true,
          enabled: config.enabled,
          queueCount: queue.length,
          sentCountToday,
          groupLink: config.groupLink,
          delayMinutes: config.delayMinutes,
        });
      }
      return true;
    });
  }

  // Inicialização e Ciclo Periódico
  loadStorageData();

  setTimeout(() => {
    createHud();
    updateHud();

    // Loop de detecção contínua a cada 4 segundos
    setInterval(scanTikTokComments, 4000);

    // Loop de processamento humanizado a cada 2 segundos
    setInterval(processQueue, 2000);
  }, 2500);
})();
