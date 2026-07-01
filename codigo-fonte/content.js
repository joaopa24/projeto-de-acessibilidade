const GEMINI_API_KEY = "chave-api";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const PROMPT = "Descreva esta imagem em uma frase curta e objetiva em português, adequada para uso como texto alternativo de acessibilidade. Responda apenas com a descrição, sem prefácio.";

let processando = false;
let indiceFoco = -1;
let overlayFocado = null;
let overlays = [];
let observer = null;
let atualizacaoAgendada = false;
let scrollProgramatico = false;
let timeoutScrollProgramatico = null;
const overlayParaImg = new WeakMap();
const imgParaOverlay = new WeakMap();

function falar(texto) {
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = "pt-BR";
  utterance.rate = 1.1;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function imagensSemAlt() {
  return Array.from(document.querySelectorAll("img")).filter(img => {
    const alt = img.getAttribute("alt");
    const semAlt = (alt === null || alt.trim() === "") && !img.dataset.altvisionProcessado;
    if (!semAlt) return false;

    if (img.naturalWidth > 0) return true;

    // ainda não carregou: registra listener (uma única vez) para
    // atualizar overlays assim que a imagem terminar de carregar
    if (!img.dataset.altvisionLoadListener) {
      img.dataset.altvisionLoadListener = "true";
      img.addEventListener("load", () => atualizarOverlaysDebounced(), { once: true });
      img.addEventListener("error", () => {
        console.warn("[AltVision] Falha ao carregar imagem:", img.src);
      }, { once: true });
    }
    return false;
  });
}

function imagemParaBase64(img) {
  return new Promise((resolve, reject) => {
    fetch(img.src)
      .then(resp => {
        if (!resp.ok) throw new Error(`Falha ao buscar imagem: ${resp.status}`);
        return resp.blob();
      })
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.onerror = () => reject(new Error("Falha ao ler blob da imagem."));
        reader.readAsDataURL(blob);
      })
      .catch(erroFetch => {
        // fallback: tenta via canvas (funciona se a imagem permitir CORS)
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png").split(",")[1]);
        } catch (erroCanvas) {
          reject(new Error(`${erroFetch.message} / ${erroCanvas.message}`));
        }
      });
  });
}

async function gerarAltText(base64) {
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: "image/png", data: base64 } }
        ]
      }]
    })
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(`${response.status}: ${erro?.error?.message || "erro desconhecido"}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
}

function criarBadge(texto) {
  const badge = document.createElement("span");
  badge.textContent = "✦ AltVision";
  badge.title = texto;
  badge.setAttribute("aria-hidden", "true");
  badge.dataset.altvisionOverlay = "true";
  badge.style.cssText = `
    position: absolute;
    top: 4px;
    left: 4px;
    background: #1a56db;
    color: white;
    font-size: 10px;
    font-family: sans-serif;
    padding: 2px 6px;
    border-radius: 4px;
    z-index: 9999;
    pointer-events: none;
  `;
  return badge;
}

async function processarImagem(img) {
  if (processando) {
    falar("Aguarde, ainda estou processando a imagem anterior.");
    return;
  }

  if (!img.complete || img.naturalWidth === 0) {
    falar("A imagem ainda não carregou completamente.");
    return;
  }

  processando = true;
  falar("Analisando imagem, aguarde.");

  try {
    const base64 = await imagemParaBase64(img);
    const altGerado = await gerarAltText(base64);

    img.setAttribute("alt", altGerado);
    img.setAttribute("aria-label", altGerado);
    img.dataset.altvisionProcessado = "true";

    const wrapper = document.createElement("span");
    wrapper.dataset.altvisionOverlay = "true";
    wrapper.style.cssText = "position: relative; display: inline-block;";
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);
    wrapper.appendChild(criarBadge(altGerado));

    falar(altGerado);
    console.log(`[AltVision] Alt gerado: "${altGerado}"`);

    overlays = overlays.filter(o => {
      if (overlayParaImg.get(o) === img) {
        if (overlayFocado === o) overlayFocado = null;
        o.remove();
        return false;
      }
      return true;
    });

    agendarAtualizacaoOverlays();
  } catch (e) {
    falar("Erro ao analisar a imagem. Tente novamente.");
    console.warn("[AltVision] Erro:", e.name, "-", e.message || "(sem mensagem)", e);
  } finally {
    processando = false;
  }
}

function criarOverlay(img) {
  const overlay = document.createElement("div");
  overlay.setAttribute("tabindex", "0");
  overlay.setAttribute("role", "button");
  overlay.setAttribute("aria-label", "Imagem sem descrição. Pressione Enter ou Ctrl+Shift+U para descrever. Use Tab ou Ctrl+Shift+Seta para avançar e retornar entre as imagens.");
  overlay.dataset.altvisionOverlay = "true";
  overlayParaImg.set(overlay, img);
  imgParaOverlay.set(img, overlay);

  const rect = img.getBoundingClientRect();
  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    z-index: 99998;
    outline: 2px dashed #1a56db;
    cursor: pointer;
    background: transparent;
  `;

  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || (e.ctrlKey && e.shiftKey && e.code === "KeyU")) {
      e.preventDefault();
      e.stopPropagation();
      processarImagem(img);
    }

    if (e.ctrlKey && e.shiftKey && e.code === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
      navegarOverlay(+1);
    }

    if (e.ctrlKey && e.shiftKey && e.code === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      navegarOverlay(-1);
    }
  });

  overlay.addEventListener("click", () => processarImagem(img));

  overlay.addEventListener("focus", () => {
    overlay.style.outline = "3px solid #1a56db";
    scrollProgramatico = true;
    img.scrollIntoView({ behavior: "smooth", block: "center" });
    clearTimeout(timeoutScrollProgramatico);
    timeoutScrollProgramatico = setTimeout(() => {
      scrollProgramatico = false;
    }, 600);
  });

  overlay.addEventListener("blur", () => {
    overlay.style.outline = "2px dashed #1a56db";
  });

  return overlay;
}

function reposicionarOverlays() {
  for (const overlay of overlays) {
    const img = overlayParaImg.get(overlay);
    if (!img || !img.isConnected) continue;
    const rect = img.getBoundingClientRect();
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }
}

function atualizarOverlays() {
  // desconecta o observer antes de manipular o DOM, pra não reagir às próprias mudanças
  if (observer) observer.disconnect();

  const imagensAtuais = imagensSemAlt().filter(img => {
    const rect = img.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  // imagensAtuais já vem na ordem do DOM, pois imagensSemAlt() usa querySelectorAll("img")

  const overlaysAntigos = new Set(overlays);
  const overlaysAtuais = [];

  for (const img of imagensAtuais) {
    let overlay = imgParaOverlay.get(img);
    if (overlay && overlaysAntigos.has(overlay)) {
      overlaysAntigos.delete(overlay); // marca como reaproveitado
    } else {
      overlay = criarOverlay(img);
      document.body.appendChild(overlay);
    }
    overlaysAtuais.push(overlay);
  }

  // remove overlays que sobraram (imagem não existe mais / já processada / saiu da tela)
  for (const overlaySobrando of overlaysAntigos) {
    overlaySobrando.remove();
  }

  // overlaysAtuais já está na ordem exata do DOM, garantida pela ordem de imagensAtuais
  overlays = overlaysAtuais;

  if (observer) observer.observe(document.body, { childList: true, subtree: true });
}

const atualizarOverlaysDebounced = debounce(atualizarOverlays, 200);
const reposicionarOverlaysDebounced = debounce(reposicionarOverlays, 50);

function agendarAtualizacaoOverlays() {
  if (atualizacaoAgendada) return;
  atualizacaoAgendada = true;
  requestAnimationFrame(() => {
    atualizacaoAgendada = false;
    atualizarOverlaysDebounced();
  });
}

function navegarOverlay(direcao) {
  if (overlays.length === 0) {
    falar("Nenhuma imagem sem descrição encontrada.");
    return;
  }

  // resincroniza o índice com base no overlay que estava focado antes
  // (comparação por referência de objeto, nunca por src, já que src pode se repetir)
  if (overlayFocado) {
    const indiceAtual = overlays.indexOf(overlayFocado);
    if (indiceAtual !== -1) indiceFoco = indiceAtual;
  }

  indiceFoco = indiceFoco + direcao;
  if (indiceFoco < 0) indiceFoco = overlays.length - 1;
  if (indiceFoco >= overlays.length) indiceFoco = 0;

  overlayFocado = overlays[indiceFoco];
  overlayFocado.focus();
  const direcaoTexto = direcao > 0 ? "Avançando" : "Retornando";
  falar(`${direcaoTexto}. Imagem ${indiceFoco + 1} de ${overlays.length} sem descrição. Pressione Enter para descrever.`);
}

// listener global como fallback
document.addEventListener("keydown", (e) => {
  if (!e.ctrlKey || !e.shiftKey) return;

  if (e.code === "ArrowRight") {
    e.preventDefault();
    navegarOverlay(+1);
  }

  if (e.code === "ArrowLeft") {
    e.preventDefault();
    navegarOverlay(-1);
  }

  if (e.code === "KeyU") {
    e.preventDefault();

    if (overlays.length === 0) {
      falar("Nenhuma imagem sem descrição encontrada.");
      return;
    }

    // se nenhuma navegação foi feita ainda, assume a primeira imagem
    if (indiceFoco < 0 || indiceFoco >= overlays.length) {
      indiceFoco = 0;
      overlays[indiceFoco].focus();
    }

    const overlay = overlays[indiceFoco];
    const img = overlayParaImg.get(overlay);
    if (img) processarImagem(img);
  }
});

// reposiciona os overlays existentes ao rolar a página ou redimensionar (leve, não recria)
window.addEventListener("scroll", reposicionarOverlaysDebounced, { passive: true });
window.addEventListener("resize", () => {
  reposicionarOverlaysDebounced();
  atualizarOverlaysDebounced(); // resize pode revelar/esconder imagens, então recalcula tudo também
}, { passive: true });

// observa mudanças no DOM, mas ignora as inseridas pelo próprio AltVision
observer = new MutationObserver((mutations) => {
  const mudancaRelevante = mutations.some(mutation => {
    const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
    return nodes.some(node => {
      if (node.nodeType !== 1) return true; // não é elemento (ex: texto), considera relevante
      return node.dataset?.altvisionOverlay !== "true";
    });
  });

  if (mudancaRelevante) {
    atualizarOverlaysDebounced();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.acao === "descrever" || msg.acao === "processar") {
    const overlay = overlays[indiceFoco];
    if (overlay) {
      const img = overlayParaImg.get(overlay);
      if (img) processarImagem(img);
    }
  }
});

// inicia
atualizarOverlays();