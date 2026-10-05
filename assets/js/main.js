const SKY_CONFIG = {
  whatsappNumber: "",
  analyticsId: "preencher-com-id-oficial",
  crmEndpoint: "",
};

const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const getLeadOrigin = () => {
  const params = new URLSearchParams(window.location.search);
  const origin = {
    url: window.location.href,
    path: window.location.pathname,
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    referrer: document.referrer || "",
    createdAt: new Date().toISOString(),
  };
  sessionStorage.setItem("skyLeadOrigin", JSON.stringify(origin));
  return origin;
};

const leadOrigin = (() => {
  const saved = sessionStorage.getItem("skyLeadOrigin");
  if (!saved) return getLeadOrigin();
  try {
    return JSON.parse(saved);
  } catch {
    return getLeadOrigin();
  }
})();

const trackEvent = (eventName, params = {}) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...params, lead_origin: leadOrigin });
};

const getStoredLeads = () => JSON.parse(localStorage.getItem("skyLeads") || "[]");

const storeLead = (lead) => {
  const leads = getStoredLeads();
  const payload = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    status: "Novo lead",
    origem: leadOrigin,
    data: new Date().toISOString(),
    ...lead,
  };
  leads.unshift(payload);
  localStorage.setItem("skyLeads", JSON.stringify(leads.slice(0, 100)));
  trackEvent("lead_saved_local_demo", {
    service_interest: payload.servico || payload.interesse || "nao informado",
  });
  return payload;
};

const whatsappUrl = (message) => {
  const text = `${message}\n\nOrigem: ${leadOrigin.path}`;
  const phone = SKY_CONFIG.whatsappNumber.replace(/\D/g, "");
  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
};

const initNavigation = () => {
  const toggle = qs("[data-menu-toggle]");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
};

const initHeroCanvas = () => {
  const canvas = qs("[data-network-canvas]");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let nodes = [];

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = width < 700 ? 32 : 54;
    nodes = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.38,
      vy: (Math.random() - 0.5) * 0.38,
      r: index % 7 === 0 ? 3.2 : 2,
    }));
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#08121f";
    ctx.fillRect(0, 0, width, height);
    nodes.forEach((node) => {
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
    });

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance < 160) {
          ctx.strokeStyle = `rgba(93, 209, 224, ${(1 - distance / 160) * 0.34})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    nodes.forEach((node) => {
      ctx.beginPath();
      ctx.fillStyle = node.r > 3 ? "rgba(139, 195, 74, 0.9)" : "rgba(142, 216, 255, 0.9)";
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(draw);
  };

  resize();
  draw();
  window.addEventListener("resize", resize);
};

const initWhatsApp = () => {
  const buttons = qsa("[data-whatsapp-toggle]");
  const panel = qs("[data-whatsapp-panel]");
  if (!buttons.length || !panel) return;
  const options = [
    "Olá, gostaria de solicitar um orçamento.",
    "Olá, preciso de internet para um evento.",
    "Olá, quero saber mais sobre internet dedicada.",
    "Olá, preciso de suporte.",
    "Olá, quero conhecer as soluções da SKY COMPANY.",
  ];
  const optionsBox = qs("[data-whatsapp-options]", panel);
  if (optionsBox) {
    optionsBox.innerHTML = options
      .map((message) => `<a href="${whatsappUrl(message)}" target="_blank" rel="noopener" data-track-whatsapp="${message}">${message}</a>`)
      .join("");
  }
  buttons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      panel.classList.toggle("is-visible");
      trackEvent("whatsapp_panel_opened");
    });
  });
  qsa("[data-panel-close]", panel).forEach((close) => close.addEventListener("click", () => panel.classList.remove("is-visible")));
  qsa("[data-track-whatsapp]").forEach((link) => link.addEventListener("click", () => trackEvent("whatsapp_click", { message: link.dataset.trackWhatsapp })));
};

const initForms = () => {
  qsa("[data-lead-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const lead = Object.fromEntries(formData.entries());
      const selectedNeeds = formData.getAll("necessidades");
      if (selectedNeeds.length) lead.necessidades = selectedNeeds.join(", ");
      storeLead(lead);
      form.reset();
      const success = qs("[data-form-success]", form.parentElement) || qs("[data-form-success]");
      if (success) success.classList.add("is-visible");
      trackEvent("form_submit", { form_name: form.dataset.leadForm || "lead" });
    });
  });
};

const initBudgetForm = () => {
  const select = qs("[data-service-select]");
  if (!select) return;
  const update = () => {
    const value = select.value;
    qsa("[data-dynamic-service]").forEach((group) => {
      const show = group.dataset.dynamicService === value;
      group.hidden = !show;
      qsa("input, select, textarea", group).forEach((input) => {
        input.disabled = !show;
      });
    });
  };
  select.addEventListener("change", update);
  update();
};

const initSolutionBuilder = () => {
  const builder = qs("[data-solution-builder]");
  if (!builder) return;
  const summary = qs("[data-builder-summary]");
  const list = qs("[data-builder-list]");
  const cta = qs("[data-builder-cta]");
  const update = () => {
    const type = qs('input[name="tipoCliente"]:checked', builder)?.value || "Empresa";
    const users = qs('input[name="usuarios"]:checked', builder)?.value || "ate 50";
    const needs = qsa('input[name="necessidades"]:checked', builder).map((item) => item.value);
    summary.textContent = "Com base nas suas necessidades, recomendamos uma solução personalizada com análise técnica, dimensionamento de rede e orçamento sob medida.";
    list.innerHTML = [`Tipo de projeto: ${type}`, `Faixa de usuários: ${users}`, needs.length ? `Itens: ${needs.join(", ")}` : "Itens: definir necessidades"].map((item) => `<li>${item}</li>`).join("");
    cta.href = `orcamento/?tipo=${encodeURIComponent(type)}&usuarios=${encodeURIComponent(users)}&necessidades=${encodeURIComponent(needs.join(","))}`;
  };
  qsa("input", builder).forEach((input) => input.addEventListener("change", update));
  update();
};

const initFilters = () => {
  const filters = qs("[data-filters]");
  if (!filters) return;
  const items = qsa("[data-filter-item]");
  qsa("button", filters).forEach((button) => {
    button.addEventListener("click", () => {
      qsa("button", filters).forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      const filter = button.dataset.filter;
      items.forEach((item) => {
        item.hidden = filter !== "todos" && item.dataset.filterItem !== filter;
      });
    });
  });
};

const initPortal = () => {
  const portal = qs("[data-client-portal]");
  if (!portal) return;
  const buttons = qsa("[data-portal-tab]", portal);
  const panels = qsa("[data-portal-panel]", portal);
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((item) => item.classList.remove("is-active"));
      panels.forEach((panel) => panel.classList.remove("is-active"));
      button.classList.add("is-active");
      qs(`[data-portal-panel="${button.dataset.portalTab}"]`, portal)?.classList.add("is-active");
    });
  });
};

const initChat = () => {
  const launcher = qs("[data-chat-launcher]");
  const panel = qs("[data-chat-panel]");
  const form = qs("[data-chat-form]");
  const input = qs("[data-chat-input]");
  const messages = qs("[data-chat-messages]");
  if (!launcher || !panel || !form || !input || !messages) return;
  const addMessage = (text, role = "bot") => {
    const item = document.createElement("div");
    item.className = `chat-bubble ${role === "user" ? "user" : ""}`;
    item.textContent = text;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  };
  const answer = (text) => {
    const value = text.toLowerCase();
    if (value.includes("evento")) return "A SKY COMPANY estrutura conectividade para eventos, incluindo planejamento, instalação, distribuição via cabo/Wi-Fi, monitoramento e suporte.";
    if (value.includes("orçamento") || value.includes("orcamento") || value.includes("preço") || value.includes("preco")) return "Para orçamento, informe tipo de serviço, cidade, data ou endereço, quantidade de usuários e necessidades técnicas.";
    if (value.includes("suporte") || value.includes("problema") || value.includes("chamado")) return "Para suporte, use a Central de Suporte ou fale com um atendente humano pelo WhatsApp.";
    if (value.includes("wifi") || value.includes("wi-fi")) return "A solução de Wi-Fi pode atender ambientes corporativos e eventos, com dimensionamento conforme usuários e áreas.";
    return "Posso ajudar com serviços, eventos, orçamento e suporte. Se a dúvida depender de informação oficial não cadastrada, encaminho para um especialista humano.";
  };
  launcher.addEventListener("click", () => panel.classList.add("is-visible"));
  qsa("[data-chat-close]").forEach((close) => close.addEventListener("click", () => panel.classList.remove("is-visible")));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, "user");
    input.value = "";
    setTimeout(() => addMessage(answer(text)), 180);
  });
};

const initCookieBanner = () => {
  const banner = qs("[data-cookie-banner]");
  if (!banner) return;
  if (localStorage.getItem("skyCookieConsent")) {
    banner.classList.add("is-hidden");
    return;
  }
  qsa("[data-cookie-action]", banner).forEach((button) => {
    button.addEventListener("click", () => {
      localStorage.setItem("skyCookieConsent", button.dataset.cookieAction);
      banner.classList.add("is-hidden");
      trackEvent("cookie_consent", { consent: button.dataset.cookieAction });
    });
  });
};

const initAdminPreview = () => {
  const tbody = qs("[data-leads-table]");
  if (!tbody) return;
  const leads = getStoredLeads();
  tbody.innerHTML = leads.length
    ? leads.map((lead) => `<tr><td>${lead.nome || "preencher"}</td><td>${lead.empresa || "preencher"}</td><td>${lead.telefone || "preencher"}</td><td>${lead.email || "preencher"}</td><td>${lead.servico || lead.interesse || "preencher"}</td><td>${lead.status}</td></tr>`).join("")
    : `<tr><td colspan="6">Nenhum lead salvo localmente nesta demonstração.</td></tr>`;
};

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initHeroCanvas();
  initWhatsApp();
  initForms();
  initBudgetForm();
  initSolutionBuilder();
  initFilters();
  initPortal();
  initChat();
  initCookieBanner();
  initAdminPreview();
});
