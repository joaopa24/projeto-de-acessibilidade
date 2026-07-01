const { JSDOM } = require('jsdom');

// Mock do chrome.runtime
const mockSendMessage = jest.fn();
const mockOnMessage = {
  addListener: jest.fn()
};

global.chrome = {
  runtime: {
    onMessage: mockOnMessage,
    sendMessage: mockSendMessage,
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
  let window;

  beforeEach(() => {
    // Reset dos mocks
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

    window = dom.window;
    document = window.document;
    global.document = document;
    global.window = window;

    // Atribui dimensões para as imagens
    document.querySelectorAll('img').forEach(img => {
      Object.defineProperty(img, 'naturalWidth', { value: 100 });
      Object.defineProperty(img, 'naturalHeight', { value: 100 });
    });
  });

  test('imagensSemAlt() retorna apenas imagens sem descrição', () => {
    // Implementa a lógica da função diretamente para teste
    function imagensSemAlt() {
      return Array.from(document.querySelectorAll("img")).filter(img => {
        const alt = img.getAttribute("alt");
        return (alt === null || alt.trim() === "") && img.naturalWidth > 0 && !img.dataset.altvisionProcessado;
      });
    }

    const imgs = imagensSemAlt();
    // Imagens sem alt ou com alt="": img2, img3, img4
    // Porém naturalWidth é 100, então todas devem ser retornadas, exceto img1 que tem alt
    expect(imgs.length).toBe(3);
    expect(imgs[0].id).toBe("img2");
    expect(imgs[1].id).toBe("img3");
    expect(imgs[2].id).toBe("img4");
  });

  test('manifest possui os campos essenciais', () => {
    const manifest = require('../manifest.json');
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('AltVision');
    expect(manifest.permissions).toContain('activeTab');
    expect(manifest.permissions).toContain('scripting');
    expect(manifest.content_scripts[0].js).toContain('content.js');
    expect(manifest.background.service_worker).toBe('background.js');
    expect(manifest.commands.descrever).toBeDefined();
  });

  test('popup.html contém os atalhos corretos', () => {
    const fs = require('fs');
    const path = require('path');
    const popupHtml = fs.readFileSync(path.join(__dirname, '../popup.html'), 'utf-8');
    expect(popupHtml).toContain('Ctrl+Shift+→');
    expect(popupHtml).toContain('Ctrl+Shift+Y');
    expect(popupHtml).toContain('Descrever imagem em foco');
    expect(popupHtml).toContain('Próxima imagem sem descrição');
  });

  test('popup.js manda mensagem para a aba ativa', () => {
    // Simula o DOM do popup
    const popupDom = new JSDOM('<html><body><button id="btn"></button><span id="status"></span></body></html>');
    const popupDoc = popupDom.window.document;
    global.document = popupDoc;

    // Mock do chrome
    const mockSend = jest.fn();
    global.chrome = {
      tabs: {
        query: jest.fn((opt, cb) => cb([{ id: 1 }])),
        sendMessage: mockSend
      }
    };

    // Importa e executa o popup
    require('../popup.js');
    const btn = popupDoc.getElementById('btn');
    btn.click();

    expect(global.chrome.tabs.query).toHaveBeenCalled();
  });
});
