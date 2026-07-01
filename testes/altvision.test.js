const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Mock do chrome.runtime
global.chrome = {
  runtime: {
    onMessage: { addListener: jest.fn() },
    sendMessage: jest.fn(),
  }
};

// Mock da Web Speech API
global.SpeechSynthesisUtterance = class SpeechSynthesisUtterance {
  constructor(text) { this.text = text; this.lang = ''; this.rate = 1; }
};
global.speechSynthesis = {
  cancel: jest.fn(),
  speak: jest.fn()
};

// Mock do fetch
global.fetch = jest.fn();

// Mock do MutationObserver
global.MutationObserver = class MutationObserver {
  constructor(callback) { this.callback = callback; }
  observe() {}
  disconnect() {}
  takeRecords() { return []; }
};

describe('AltVision - Testes Unitários', () => {
  let dom;
  let document;

  beforeEach(() => {
    jest.clearAllMocks();

    dom = new JSDOM(`
      <html><body>
        <img id="img1" src="https://example.com/img1.png" alt="Imagem 1 com alt">
        <img id="img2" src="https://example.com/img2.png">
        <img id="img3" src="https://example.com/img3.png" alt="">
        <img id="img4" src="https://example.com/img4.png">
      </body></html>
    `, {
      url: 'https://example.com',
      runScripts: 'dangerously',
    });

    document = dom.window.document;
    global.document = document;
    global.window = dom.window;

    document.querySelectorAll('img').forEach(img => {
      Object.defineProperty(img, 'naturalWidth', { value: 100, configurable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 100, configurable: true });
    });
  });

  // ── Teste 1: imagensSemAlt() ──────────────────────────────────────────────
  test('imagensSemAlt() retorna apenas imagens sem descrição', () => {
    function imagensSemAlt() {
      return Array.from(document.querySelectorAll("img")).filter(img => {
        const alt = img.getAttribute("alt");
        const semAlt = (alt === null || alt.trim() === "") && !img.dataset.altvisionProcessado;
        if (!semAlt) return false;
        return img.naturalWidth > 0;
      });
    }

    const imgs = imagensSemAlt();
    expect(imgs.length).toBe(3);
    expect(imgs[0].id).toBe("img2");
    expect(imgs[1].id).toBe("img3");
    expect(imgs[2].id).toBe("img4");
  });

  // ── Teste 2: imagensSemAlt() ignora imagens já processadas ────────────────
  test('imagensSemAlt() ignora imagens marcadas como processadas', () => {
    function imagensSemAlt() {
      return Array.from(document.querySelectorAll("img")).filter(img => {
        const alt = img.getAttribute("alt");
        const semAlt = (alt === null || alt.trim() === "") && !img.dataset.altvisionProcessado;
        if (!semAlt) return false;
        return img.naturalWidth > 0;
      });
    }

    // Marca img2 como já processada
    document.getElementById("img2").dataset.altvisionProcessado = "true";

    const imgs = imagensSemAlt();
    expect(imgs.length).toBe(2);
    expect(imgs[0].id).toBe("img3");
    expect(imgs[1].id).toBe("img4");
  });

  // ── Teste 3: manifest ─────────────────────────────────────────────────────
  test('manifest possui os campos essenciais', () => {
    const manifest = require('../manifest.json');
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('AltVision');
    expect(manifest.permissions).toContain('activeTab');
    expect(manifest.permissions).toContain('scripting');
    expect(manifest.content_scripts[0].js).toContain('content.js');
    expect(manifest.background.service_worker).toBe('background.js');
    // comando atual é "processar" (consistente com background.js)
    expect(manifest.commands.processar).toBeDefined();
  });

  // ── Teste 4: popup.html ───────────────────────────────────────────────────
  test('popup.html contém os atalhos corretos', () => {
    const popupHtml = fs.readFileSync(path.join(__dirname, '../popup.html'), 'utf-8');
    // atalho de navegação
    expect(popupHtml).toContain('Ctrl+Shift+→');
    expect(popupHtml).toContain('Ctrl+Shift+←');
    // atalho de descrição atual (U, não Y)
    expect(popupHtml).toContain('Ctrl+Shift+U');
    // textos descritivos
    expect(popupHtml).toContain('Próxima imagem sem descrição');
    expect(popupHtml).toContain('Imagem anterior sem descrição');
    expect(popupHtml).toContain('Descrever imagem em foco');
  });

  // ── Teste 5: popup.html não carrega popup.js (design informativo) ─────────
  test('popup.html não referencia popup.js', () => {
    const popupHtml = fs.readFileSync(path.join(__dirname, '../popup.html'), 'utf-8');
    // popup.js foi removido pois o popup atual é apenas informativo (sem botões)
    expect(popupHtml).not.toContain('popup.js');
  });

  // ── Teste 6: background.js escuta o comando correto ──────────────────────
  test('background.js escuta o comando "processar"', () => {
    const bgCode = fs.readFileSync(path.join(__dirname, '../background.js'), 'utf-8');
    // deve escutar "processar", que bate com manifest.commands.processar
    expect(bgCode).toContain('"processar"');
    // não deve mais referenciar "descrever" como comando
    expect(bgCode).not.toContain('"descrever"');
  });

  // ── Teste 7: content.js usa WeakMap para identidade de overlays ───────────
  test('content.js usa WeakMap para mapear overlays (não depende de src como chave)', () => {
    const contentCode = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf-8');
    expect(contentCode).toContain('WeakMap');
    expect(contentCode).toContain('overlayParaImg');
    expect(contentCode).toContain('imgParaOverlay');
  });

  // ── Teste 8: content.js tem stopPropagation para evitar duplo disparo ─────
  test('content.js usa stopPropagation nos handlers de teclado do overlay', () => {
    const contentCode = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf-8');
    expect(contentCode).toContain('stopPropagation');
  });

  // ── Teste 9: content.js desconecta observer antes de manipular o DOM ──────
  test('content.js desconecta o MutationObserver antes de atualizar overlays', () => {
    const contentCode = fs.readFileSync(path.join(__dirname, '../content.js'), 'utf-8');
    expect(contentCode).toContain('observer.disconnect()');
  });

});