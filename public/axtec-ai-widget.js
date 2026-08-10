/**
 * AXTEC AI — embeddable widget.
 * -------------------------------------------------------------------------
 * Drop this + axtec-ai-widget.css into any page:
 *
 *   <link rel="stylesheet" href="axtec-ai-widget.css">
 *   <script src="axtec-ai-widget.js" defer
 *           data-api-base="https://your-backend.example.com"
 *           data-whatsapp="5210000000000"></script>
 *
 * It talks ONLY to the backend's public API — it never calls the AI
 * provider directly and never sees any secret key.
 * -------------------------------------------------------------------------
 */
(function () {
  const scriptTag = document.currentScript;
  const API_BASE = (scriptTag && scriptTag.dataset.apiBase) || window.location.origin;
  const WHATSAPP_NUMBER = (scriptTag && scriptTag.dataset.whatsapp) || '';

  const STRINGS = {
    es: {
      title: 'AXTEC AI',
      launcher: 'AXTEC AI',
      greeting: 'Hola. ¿Qué estás pensando construir?',
      canHelp: 'Puedo ayudarte con:',
      orWrite: 'o escríbeme directamente...',
      placeholder: 'Escribe tu mensaje...',
      send: 'Enviar',
      quickOptions: [
        { label: '🌐 Página web', text: 'Quiero una página web.' },
        { label: '🛒 Tienda online', text: 'Quiero una tienda en línea.' },
        { label: '💻 Sistema', text: 'Necesito un sistema para mi negocio.' },
        { label: '⚙️ Automatización', text: 'Quiero automatizar procesos.' },
        { label: '🤖 IA', text: 'Me interesa incorporar inteligencia artificial.' },
        { label: '☁️ Cloud', text: 'Necesito ayuda con infraestructura en la nube.' },
      ],
      estimateTitle: 'ESTIMACIÓN AXTEC',
      investment: 'Inversión estimada',
      time: 'Tiempo aproximado',
      includes: 'Incluye:',
      disclaimer: 'Esta es una estimación preliminar y no representa una cotización definitiva. El precio final depende del alcance completo del proyecto.',
      requestQuote: 'Solicitar cotización',
      modifyProject: 'Modificar proyecto',
      talkToAxtec: 'Hablar con AXTEC',
      readyMsg: 'Ya tengo suficiente información para darte una estimación inicial.',
      leadFormIntro: 'Perfecto. Solo necesito un par de datos para enviarte esto y que el equipo de AXTEC te contacte.',
      name: 'Nombre',
      company: 'Empresa (opcional)',
      email: 'Correo',
      whatsapp: 'WhatsApp (opcional)',
      submit: 'Enviar solicitud',
      leadSuccess: 'Listo. Registramos tu proyecto y te enviamos un correo de confirmación. El equipo de AXTEC te va a contactar pronto.',
      leadError: 'No pudimos enviar tu solicitud. Intenta de nuevo o usa el formulario de contacto del sitio.',
      sideTitle: 'TU PROYECTO',
      type: 'Tipo',
      level: 'Nivel',
      features: 'Funciones',
      notEnough: 'Necesito un poco más de información para calcular un rango. Sigamos conversando.',
      unavailable: 'En este momento AXTEC AI no está disponible. Puedes solicitar una cotización mediante el formulario de contacto.',
    },
    en: {
      title: 'AXTEC AI',
      launcher: 'AXTEC AI',
      greeting: 'Hi. What are you thinking of building?',
      canHelp: 'I can help you with:',
      orWrite: 'or just write to me directly...',
      placeholder: 'Type your message...',
      send: 'Send',
      quickOptions: [
        { label: '🌐 Website', text: 'I want a website.' },
        { label: '🛒 Online store', text: 'I want an online store.' },
        { label: '💻 System', text: 'I need a system for my business.' },
        { label: '⚙️ Automation', text: 'I want to automate some processes.' },
        { label: '🤖 AI', text: "I'm interested in adding AI." },
        { label: '☁️ Cloud', text: 'I need help with cloud infrastructure.' },
      ],
      estimateTitle: 'AXTEC ESTIMATE',
      investment: 'Estimated investment',
      time: 'Approximate time',
      includes: 'Includes:',
      disclaimer: 'This is a preliminary estimate, not a final quote. The final price depends on the full scope of the project.',
      requestQuote: 'Request a quote',
      modifyProject: 'Modify project',
      talkToAxtec: 'Talk to AXTEC',
      readyMsg: "I now have enough information to give you an initial estimate.",
      leadFormIntro: "Great. I just need a couple of details to send you this and have the AXTEC team reach out.",
      name: 'Name',
      company: 'Company (optional)',
      email: 'Email',
      whatsapp: 'WhatsApp (optional)',
      submit: 'Send request',
      leadSuccess: "Done. We logged your project and sent you a confirmation email. The AXTEC team will reach out soon.",
      leadError: "We couldn't send your request. Try again or use the site's contact form.",
      sideTitle: 'YOUR PROJECT',
      type: 'Type',
      level: 'Level',
      features: 'Features',
      notEnough: "I need a bit more information to calculate a range. Let's keep going.",
      unavailable: "AXTEC AI isn't available right now. You can request a quote using the contact form.",
    },
  };

  let lang = (navigator.language || 'es').startsWith('en') ? 'en' : 'es';
  let conversationId = null;
  let projectData = {};
  let lastEstimate = null;

  // ---- DOM scaffold ------------------------------------------------
  const root = document.createElement('div');
  root.className = 'axai-root';
  root.innerHTML = `
    <button class="axai-launcher" id="axai-launcher">
      <span class="axai-dot">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1" fill="white"/><circle cx="15" cy="10" r="1" fill="white"/><path d="M8 14c1 1.2 2.4 1.8 4 1.8s3-.6 4-1.8" stroke-linecap="round"/></svg>
      </span>
      <span id="axai-launcher-label">AXTEC AI</span>
    </button>
    <div class="axai-panel" id="axai-panel">
      <div class="axai-head">
        <div class="axai-head-left"><span class="axai-status-dot"></span><b>AXTEC AI</b></div>
        <div class="axai-lang-toggle">
          <button data-lang="es">ES</button><button data-lang="en">EN</button>
        </div>
      </div>
      <div class="axai-body" id="axai-body"></div>
      <div class="axai-quick" id="axai-quick"></div>
      <div class="axai-side" id="axai-side" style="display:none;"></div>
      <div class="axai-inputrow">
        <input type="text" id="axai-input" placeholder="">
        <button id="axai-send"></button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const launcher = root.querySelector('#axai-launcher');
  const launcherLabel = root.querySelector('#axai-launcher-label');
  const panel = root.querySelector('#axai-panel');
  const body = root.querySelector('#axai-body');
  const quick = root.querySelector('#axai-quick');
  const side = root.querySelector('#axai-side');
  const input = root.querySelector('#axai-input');
  const sendBtn = root.querySelector('#axai-send');
  const langBtns = root.querySelectorAll('.axai-lang-toggle button');

  function t() { return STRINGS[lang]; }

  function refreshStaticText() {
    launcherLabel.textContent = t().launcher;
    input.placeholder = t().placeholder;
    sendBtn.textContent = t().send;
    langBtns.forEach((b) => b.classList.toggle('axai-active', b.dataset.lang === lang));
    renderSidePanel();
  }

  langBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      lang = btn.dataset.lang;
      refreshStaticText();
    });
  });

  let started = false;
  launcher.addEventListener('click', () => {
    panel.classList.toggle('axai-open');
    if (panel.classList.contains('axai-open') && !started) {
      started = true;
      refreshStaticText();
      addBotMessage(t().greeting);
      renderQuickOptions();
    }
  });

  function addUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'axai-msg axai-user';
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }
  function addBotMessage(text) {
    const div = document.createElement('div');
    div.className = 'axai-msg axai-bot';
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }
  function addTyping() {
    const div = document.createElement('div');
    div.className = 'axai-msg axai-bot axai-typing';
    div.id = 'axai-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }
  function removeTyping() {
    const el = document.getElementById('axai-typing');
    if (el) el.remove();
  }

  function renderQuickOptions() {
    quick.innerHTML = '';
    t().quickOptions.forEach((opt) => {
      const b = document.createElement('button');
      b.textContent = opt.label;
      b.onclick = () => sendMessage(opt.text);
      quick.appendChild(b);
    });
  }

  function renderSidePanel() {
    if (!projectData || !projectData.project_type) { side.style.display = 'none'; return; }
    side.style.display = 'block';
    const feats = (projectData.features || []).join(', ') || '-';
    const tier = lastEstimate ? lastEstimate.complexity : '-';
    side.innerHTML = `
      <div class="axai-side-title">${t().sideTitle}</div>
      <div class="axai-side-row"><span>${t().type}</span><b>${projectData.project_type}</b></div>
      <div class="axai-side-row"><span>${t().level}</span><b>${tier || '-'}</b></div>
      <div class="axai-side-row"><span>${t().features}</span><b style="text-align:right; max-width:180px;">${feats}</b></div>
    `;
  }

  async function sendMessage(text) {
    if (!text || !text.trim()) return;
    addUserMessage(text);
    quick.innerHTML = '';
    input.value = '';
    addTyping();

    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, message: text, lang }),
      });
      const data = await res.json();
      removeTyping();

      if (!res.ok) throw new Error(data.error || 'error');

      conversationId = data.conversation_id;
      projectData = data.project_data || projectData;
      renderSidePanel();

      addBotMessage(data.reply);

      if (data.ready_for_estimate && data.estimate && data.estimate.min_price != null) {
        lastEstimate = data.estimate;
        renderSidePanel();
        addBotMessage(t().readyMsg);
        renderEstimateCard(data.estimate);
      } else if (data.ready_for_estimate) {
        addBotMessage(t().notEnough);
      }

      if (data.degraded) {
        // AI is degraded/unavailable — still show the message returned but
        // make sure the visitor has a way forward.
        renderFallbackOptions();
      }
    } catch (err) {
      removeTyping();
      addBotMessage(t().unavailable);
      renderFallbackOptions();
    }
  }

  function renderFallbackOptions() {
    quick.innerHTML = '';
    const b = document.createElement('button');
    b.textContent = lang === 'en' ? 'Go to contact form' : 'Ir al formulario de contacto';
    b.onclick = () => { window.location.hash = '#contacto'; panel.classList.remove('axai-open'); };
    quick.appendChild(b);
  }

  function renderEstimateCard(estimate) {
    const card = document.createElement('div');
    card.className = 'axai-msg axai-bot';
    card.style.maxWidth = '100%';
    card.innerHTML = `
      <div class="axai-card">
        <div class="axai-card-eyebrow">${t().estimateTitle}</div>
        <div class="axai-card-title">${projectData.project_type || ''}${projectData.business_type ? ' — ' + projectData.business_type : ''}</div>
        <div class="axai-card-tier">${estimate.complexity}</div>
        <div class="axai-card-price">$${Number(estimate.min_price).toLocaleString()} – $${Number(estimate.max_price).toLocaleString()} ${estimate.currency}</div>
        <div class="axai-card-time">${t().time}: ${estimate.estimated_days_min}–${estimate.estimated_days_max} ${lang === 'en' ? 'days' : 'días'}</div>
        <div class="axai-card-features">
          ${(estimate.matched_rules || []).map((r) => `<span>✓ ${lang === 'en' ? r.label_en : r.label_es}</span>`).join('')}
        </div>
        <div class="axai-card-disclaimer">${t().disclaimer}</div>
        <div class="axai-card-actions">
          <button class="axai-btn axai-btn-primary" data-action="quote">${t().requestQuote}</button>
          <button class="axai-btn" data-action="modify">${t().modifyProject}</button>
          ${WHATSAPP_NUMBER ? `<button class="axai-btn" data-action="whatsapp">${t().talkToAxtec}</button>` : ''}
        </div>
      </div>
    `;
    body.appendChild(card);
    body.scrollTop = body.scrollHeight;

    card.querySelector('[data-action="quote"]').onclick = () => renderLeadForm(estimate);
    card.querySelector('[data-action="modify"]').onclick = () => {
      addBotMessage(lang === 'en' ? 'Sure — what would you like to add or change?' : 'Claro, ¿qué te gustaría agregar o cambiar?');
    };
    const waBtn = card.querySelector('[data-action="whatsapp"]');
    if (waBtn) {
      waBtn.onclick = () => {
        const msg = encodeURIComponent(lang === 'en'
          ? 'Hi AXTEC, I came from your website and I want info about a project.'
          : 'Hola AXTEC, vengo desde su sitio web y quiero información sobre un proyecto.');
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
      };
    }
  }

  function renderLeadForm(estimate) {
    const wrap = document.createElement('div');
    wrap.className = 'axai-msg axai-bot';
    wrap.style.maxWidth = '100%';
    const needName = !projectData.__lead_name;
    wrap.innerHTML = `
      <div>${t().leadFormIntro}</div>
      <form class="axai-form" id="axai-lead-form">
        <input required name="name" placeholder="${t().name}">
        <input name="company" placeholder="${t().company}">
        <input required type="email" name="email" placeholder="${t().email}">
        <input name="whatsapp" placeholder="${t().whatsapp}">
        <button class="axai-btn axai-btn-primary" type="submit">${t().submit}</button>
      </form>
    `;
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;

    wrap.querySelector('#axai-lead-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        name: fd.get('name'),
        company: fd.get('company') || undefined,
        email: fd.get('email'),
        phone: fd.get('whatsapp') || undefined,
        project_data: projectData,
        conversation_id: conversationId,
        source: 'AXTEC_AI',
        lang,
      };
      try {
        const res = await fetch(`${API_BASE}/api/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('lead_error');
        wrap.remove();
        addBotMessage(t().leadSuccess);
      } catch (err) {
        addBotMessage(t().leadError);
      }
    });
  }

  sendBtn.addEventListener('click', () => sendMessage(input.value));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(input.value); });
})();
