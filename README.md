# AltVision — Extensão de Acessibilidade Visual

Extensão para o Google Chrome que gera automaticamente textos alternativos (`alt`) para imagens sem descrição, utilizando a API Gemini 2.5 Flash do Google. Desenvolvida como projeto acadêmico para a disciplina GCC223 — Acessibilidade na Web (UFLA).

---

## Estrutura do Projeto

```
entrega-altvision/
├── codigo-fonte/
│   ├── manifest.json          # Manifesto da extensão (Manifest V3)
│   ├── content.js             # Script de conteúdo principal
│   ├── background.js          # Service worker (gerencia comandos de teclado)
│   ├── popup.html             # Interface do popup (atalhos disponíveis)
|   ├── popup.js               # Javascript do popup
│   └── teste-altvision.html   # Página com imagens para testes práticos
├── testes/
│   ├── altvision.test.js      # Testes unitários (Jest)
│   ├── package.json           # Dependências para testes
│   └── resultado-testes.txt   # Resultados da última execução
├── documentacao/
│   └── relatorio.docx         # Relatório descritivo completo
├── avaliacao/
│   ├── 01_avaliacao_funcional.csv
│   ├── 02_avaliacao_acessibilidade.csv
│   ├── 03_avaliacao_compatibilidade.csv
│   ├── 04_avaliacao_desempenho.csv
│   ├── 05_avaliacao_usabilidade.csv
│   └── 06_resumo_geral.csv
└── README.md
```

---

## Instalação

### Pré-requisitos

- Google Chrome (versão 88 ou superior)
- Chave de API do Google Gemini — obtenha em https://aistudio.google.com/apikey

### Passo a Passo

1. **Configure a chave de API:**
   - Abra `codigo-fonte/content.js`
   - Na linha 1, substitua o valor de `GEMINI_API_KEY` pela sua chave

2. **Carregue a extensão no Chrome:**
   - Acesse `chrome://extensions/`
   - Ative o **Modo desenvolvedor** (toggle no canto superior direito)
   - Clique em **Carregar extensão sem empacotamento**
   - Selecione a pasta `codigo-fonte/`

3. **(Opcional) Personalize os atalhos:**
   - Acesse `chrome://extensions/shortcuts`
   - Localize **AltVision** e ajuste os atalhos conforme preferência

---

## Uso

### Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl+Shift+→` | Avançar para a próxima imagem sem descrição |
| `Ctrl+Shift+←` | Retornar para a imagem anterior sem descrição |
| `Enter` ou `Ctrl+Shift+U` | Descrever a imagem em foco |
| `Tab` / `Shift+Tab` | Navegar entre imagens (alternativa nativa) |

> A navegação é linear e sequencial, seguindo a ordem das imagens no documento, sem depender de orientação espacial na tela — adequado para uso com leitores de tela.

### Fluxo de Uso

1. Ao carregar qualquer página, a extensão escaneia automaticamente o DOM e identifica imagens sem `alt`
2. Overlays azuis tracejados são criados sobre cada imagem identificada, com `tabindex="0"` e `role="button"`
3. Use `Ctrl+Shift+→` / `←` (ou `Tab` / `Shift+Tab`) para navegar entre as imagens
4. Ao chegar na imagem desejada, pressione `Enter` ou `Ctrl+Shift+U`
5. A descrição é gerada pela API Gemini 2.5 Flash e lida em voz alta em português brasileiro
6. O atributo `alt` e `aria-label` da imagem são atualizados automaticamente no DOM

### Popup

Clique no ícone **✦ AltVision** na barra de ferramentas para ver um resumo dos atalhos disponíveis.

---

## Tecnologias

| Tecnologia | Finalidade |
|------------|------------|
| Manifest V3 | Arquitetura moderna de extensões Chrome |
| API Gemini 2.5 Flash | Geração de descrições de imagens via IA |
| Fetch API + FileReader | Conversão de imagens para base64 (contorna limitações de CORS do Canvas) |
| Web Speech API | Síntese de voz nativa em pt-BR |
| MutationObserver | Detecção de imagens inseridas dinamicamente no DOM |
| WeakMap | Mapeamento de overlays por referência de elemento DOM (evita conflito com imagens de URL duplicada) |

---

## Testes

Para executar os testes unitários:

```bash
cd testes
npm install
npx jest --verbose
```

Os testes cobrem: identificação de imagens sem `alt`, validação do manifest, conteúdo do popup, consistência dos comandos no `background.js`, e verificação das correções de bugs críticos (loop infinito no MutationObserver, navegação com imagens duplicadas, duplo disparo de eventos).

---

## Funcionalidades

- Identificação automática de imagens sem `alt` ou com `alt` vazio
- Suporte a imagens carregadas dinamicamente via JavaScript
- Geração de descrições em português brasileiro via Gemini 2.5 Flash
- Navegação linear por teclado, sem dependência de orientação espacial
- Leitura das descrições em voz alta (Web Speech API, pt-BR)
- Reposicionamento automático dos overlays ao rolar a página ou redimensionar a janela
- Compatibilidade com leitores de tela (NVDA, JAWS)

---

## Licença

Projeto acadêmico para fins de estudo — GCC223, UFLA, 2026.