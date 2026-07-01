# AltVision - Extensão de Acessibilidade Visual

## Descrição

O AltVision é uma extensão para o navegador Google Chrome desenvolvida com o objetivo de melhorar a acessibilidade visual na web para pessoas com deficiência visual. O projeto utiliza inteligência artificial com visão computacional para gerar automaticamente textos alternativos (atributo `alt`) para imagens que não possuem descrição em páginas web.

## Estrutura do Projeto

```
entrega-altvision/
├── codigo-fonte/          # Código-fonte da extensão
│   ├── manifest.json      # Manifesto da extensão (Manifest V3)
│   ├── content.js         # Script de conteúdo principal
│   ├── background.js      # Service worker
│   ├── popup.html         # Interface do popup
|   ├── teste-altvision.html # Página com imagens para testes práticos
│   └── popup.js           # Controlador do popup
├── testes/                # Testes unitários
│   ├── altvision.test.js  # Código dos testes (Jest)
│   ├── package.json       # Dependências para testes
│   └── resultado-testes.txt # Resultados dos testes
├── documentacao/          # Documentação do projeto
│   └── relatorio.docx       # Relatório descritivo completo
├── avaliacao/             # Planilhas de avaliação detalhadas
│   ├── 01_avaliacao_funcional.csv
│   ├── 02_avaliacao_acessibilidade.csv
│   ├── 03_avaliacao_compatibilidade.csv
│   ├── 04_avaliacao_desempenho.csv
│   ├── 05_avaliacao_usabilidade.csv
│   └── 06_resumo_geral.csv
└── README.md              # Este arquivo
```

## Instalação da Extensão

### Pré-requisitos

- Google Chrome (versão 88 ou superior)
- Chave de API do Google Gemini (obtida em https://aistudio.google.com/apikey)

### Passo a Passo

1. **Obter a chave de API do Gemini:**
   - Acesse https://aistudio.google.com/apikey
   - Crie uma chave de API
   - Abra o arquivo `codigo-fonte/content.js`
   - Substitua `"CHAVE-API"` pela sua chave de API real (linha 1)

2. **Carregar a extensão no Chrome:**
   - Abra o Chrome e acesse `chrome://extensions/`
   - Ative o "Modo desenvolvedor" (toggle no canto superior direito)
   - Clique em "Carregar extensão sem empacotamento"
   - Selecione a pasta `codigo-fonte`

3. **Configurar atalhos de teclado (opcional):**
   - Acesse `chrome://extensions/shortcuts`
   - Localize "AltVision"
   - Configure o atalho para "Descrever imagem em foco" (padrão: Ctrl+Shift+Y)

## Uso

### Navegação por Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl+Shift+→` ou `↓` | Próxima imagem sem descrição |
| `Ctrl+Shift+←` ou `↑` | Imagem anterior sem descrição |
| `Enter` ou `Ctrl+Shift+Y` | Descrever imagem em foco |

### Interface do Popup

1. Clique no ícone da extensão na barra de ferramentas
2. Clique no botão "Processar imagens da página"
3. As descrições serão geradas e lidas em voz alta

### Fluxo de Uso

1. A extensão escaneia automaticamente a página e identifica imagens sem descrição
2. Overlays azuis tracejados são criados sobre as imagens identificadas
3. Use `Ctrl+Shift+→`/`←` para navegar entre as imagens
4. Ao chegar na imagem desejada, pressione `Enter` ou `Ctrl+Shift+Y`
5. A descrição será gerada pela IA e lida em voz alta
6. O atributo `alt` da imagem será atualizado automaticamente

## Tecnologias Utilizadas

- **JavaScript** - Linguagem de programação
- **Manifest V3** - Arquitetura de extensões do Chrome
- **Gemini 2.5 Flash API** - IA para geração de descrições
- **Canvas API** - Conversão de imagens para base64
- **Web Speech API** - Síntese de voz em português brasileiro

## Testes

Para executar os testes unitários:

```bash
cd testes
npm install
npx jest --verbose
```

## Funcionalidades

- Identificação automática de imagens sem atributo `alt`
- Geração de descrições via IA (Gemini 2.5 Flash)
- Navegação completa via teclado
- Leitura das descrições em voz alta (pt-BR)
- Atualização automática ao rolar a página
- Compatibilidade com leitores de tela (NVDA, JAWS)

## Licença

Projeto acadêmico para fins de estudo.
