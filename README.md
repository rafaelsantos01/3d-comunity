# Letreiros 3D

Web app para personalizar letreiros 3D direto no navegador. O usuário escolhe um modelo, edita texto,
fontes, tamanhos, base e cores, vê a prévia 3D e baixa STL/3MF prontos para imprimir.
A geometria vem dos arquivos OpenSCAD originais, executados no navegador pelo **OpenSCAD WASM** num
Web Worker. Nada roda em servidor.

Stack: Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · Radix UI · react-three-fiber/drei ·
Zustand · zod · JSZip · Vitest + Testing Library · Playwright + axe.

## Como rodar

Requisitos: Node 20+ (testado com Node 24).

```bash
npm install          # o postinstall copia o OpenSCAD WASM para public/openscad/
npm run dev          # http://localhost:3000 (o predev gera o catálogo de templates)
```

| Comando | O que faz |
|---|---|
| `npm run build` / `npm start` | build de produção (gera o catálogo antes) |
| `npm run lint` · `npm run typecheck` | ESLint · `tsc --noEmit` |
| `npm test` | testes unitários, incluindo renders reais com o WASM em Node |
| `npm run test:e2e` | Playwright em chromium, firefox, webkit e Pixel 7 (`npx playwright install` antes) |
| `npm run templates:build` | valida os templates e gera `src/generated/` + `public/templates/` |
| `npm run poc -- "<arquivo.scad>\|<parte>\|<fn>\|manifold2\|k=v"` | mede o tempo de render em Node |
| `npm run referencias` | regenera `tests/fixtures/referencias-bbox.json` (ver "Dimensões de referência") |
| `npm run fontes:baixar` | baixa de novo as fontes (os TTFs já estão versionados) |

**Deploy (Vercel):** importe o repositório. O `vercel.json` usa `npm ci` + `npm run build`. Não há headers COOP/COEP
porque o build do OpenSCAD é single-thread. Os headers de cache ficam no `next.config.ts`.

## Doações (Pix)

A página `/apoie` ("Me pague um café ☕", link "Apoie" no header) mostra um QR Code Pix estático **sem valor**
(quem doa escolhe o valor no app do banco), a chave Pix e o código copia e cola. Não há integração com banco nem
confirmação de pagamento, e nada do doador é coletado. A configuração fica em `src/config/doacao.ts`, lida das
variáveis abaixo (modelo em `.env.example`):

| Variável | Obrigatória | Regras |
|---|---|---|
| `NEXT_PUBLIC_PIX_CHAVE` | sim | e-mail, telefone (`+55…`), CPF/CNPJ ou chave aleatória; até 77 caracteres, sem espaços |
| `NEXT_PUBLIC_PIX_NOME` | sim | nome do beneficiário; acentos e símbolos são removidos e o texto é cortado em 25 caracteres |
| `NEXT_PUBLIC_PIX_CIDADE` | sim | mesma normalização, cortada em 15 caracteres |
| `NEXT_PUBLIC_PIX_TXID` | não | até 25 letras/números; padrão `***` |

- O payload (BR Code com CRC16) é montado em `src/lib/pix/br-code.ts` e o QR é gerado **no build** (lib `qrcode`).
  Na Vercel, cadastre as variáveis no projeto e faça um **novo deploy** sempre que trocar algum valor.
- Sem chave, nome ou cidade válidos (ou com txid inválido), o build continua funcionando e a página mostra
  "As doações estão temporariamente indisponíveis".
- Os e2e de `/apoie` que dependem do QR são pulados sem configuração. Para rodá-los, use um build de teste:

```bash
NEXT_PUBLIC_PIX_CHAVE=123e4567-e12b-12d1-a456-426655440000 NEXT_PUBLIC_PIX_NOME="Fulano de Tal" \
  NEXT_PUBLIC_PIX_CIDADE=BRASILIA npm run build
npm run test:e2e
```

## Como adicionar um novo template

1. Crie a pasta `templates/<id>/` (`id` com letras minúsculas, números e hífen).
2. Coloque o **`modelo.scad`** com os parâmetros no formato do Customizer do OpenSCAD:
   - seções `/* [Nome da seção] */`; tudo a partir de `/* [Hidden] */` é ignorado;
   - `nome = "texto";`, `nome = 12;`, `nome = 1.5;`, `nome = true;`;
   - lista: `estilo = "a"; // [a, b, c]` (ou `[a:Rótulo A, b:Rótulo B]`); faixa: `// [0:10]` ou `// [0:0.5:10]`;
   - qualquer outro comentário na linha (ou na linha de cima) vira o texto de ajuda;
   - o modelo precisa de um parâmetro de **peça** com as opções usadas na prévia e na exportação
     (ex.: `parte = "base"; // [base, letras_fixas, letras_soltas, base_unica]`).
3. Coloque um **`thumbnail`** (svg/png/webp).
4. Crie o **`template.json`**:

```jsonc
{
  "nome": "Meu letreiro",                 // aparece na galeria
  "descricao": "Para que serve.",
  "thumbnail": "thumbnail.svg",
  "ordem": 3,                             // posição na galeria (opcional)
  "papeis": {                             // o que cada parâmetro significa para o app
    "parte": "parte",                     // parâmetro que escolhe a peça
    "emPe": "previa_em_pe",               // (opcional) fica oculto
    "corBase": "cor_base", "corLetras": "cor_letras",   // viram color pickers
    "espessuraBase": "base_espessura",    // altura da troca de cor = isto + 1 camada
    "slug": ["texto"]                     // textos que formam o nome dos arquivos
  },
  "secoes": { "Exportação": { "rotulo": "Cores" }, "Modo das letras": { "oculta": true } },
  "parametros": {                         // complementos por parâmetro (todos opcionais)
    "texto":   { "rotulo": "Texto", "grupo": "basico", "fonte": "fonte" },   // "fonte": checagem de glifos
    "fonte":   { "rotulo": "Fonte", "widget": "fonte", "grupo": "basico" },
    "tamanho": { "rotulo": "Tamanho", "min": 5, "max": 80, "step": 0.5, "unidade": "mm",
                 "ajuda": "Altura das letras.", "grupo": "basico" },
    "estilo":  { "widget": "cards", "opcoes": { "a": { "rotulo": "Opção A", "icone": "retangulo" } } }
  },
  "previa": {                             // as 2 peças coloridas da prévia
    "base":   { "parte": "base",         "overrides": { "letras_fixas": true } },
    "letras": { "parte": "letras_fixas", "overrides": { "letras_fixas": true } }
  },
  "exportacao": {                         // os 3 modos do modal "Baixar"
    "multicor": { "overrides": { "letras_fixas": true },
                  "partes": [{ "parte": "base", "cor": "base" }, { "parte": "letras_fixas", "cor": "letras" }] },
    "unico":    { "overrides": { "letras_fixas": true },  "partes": [{ "parte": "base_unica", "cor": "base" }] },
    "encaixe":  { "overrides": { "letras_fixas": false },
                  "partes": [{ "parte": "base", "cor": "base" }, { "parte": "letras_soltas", "cor": "letras" }] }
  }
}
```

- `widget`: `texto`, `numero` (slider + campo), `booleano` (toggle), `select`, `cor`, `fonte`, `cards`.
  Sem `widget`, o tipo do `.scad` decide.
- `grupo`: `basico` aparece direto; `avancado` fica na área "Avançado" da seção. Parâmetro sem entrada vai para avançado.
- `icone` dos cards: `contorno`, `retangulo`, `degrau`, `circulo` (sem ícone, aparece a inicial do rótulo).
- `oculto: true` esconde um parâmetro. `parte` e `emPe` já ficam ocultos.

5. Rode `npm run templates:build`. Se algo estiver errado, o build para com o caminho do campo
   (ex.: `parametros.tamanho: padrão 100 fora de [5, 80]`). O modelo aparece na galeria sem mexer em nenhum componente.
   Há um template fictício em `tests/fixtures/templates/fixture-teste` coberto por teste.

## Fontes e licenças

Só fontes livres, todas **SIL Open Font License 1.1**, TTF estático baixado do Google Fonts. A licença de cada
uma está em `public/fontes/<familia>/OFL.txt`.

| Fonte | Pesos | Licença |
|---|---|---|
| Archivo Black | Regular | OFL 1.1 |
| Montserrat | Regular, Bold, Black | OFL 1.1 |
| Playfair Display | Regular, Bold | OFL 1.1 |
| Poppins | Regular, Bold | OFL 1.1 |
| Cinzel | Regular, Bold | OFL 1.1 |
| Pacifico | Regular | OFL 1.1 |
| Bebas Neue | Regular | OFL 1.1 |

A **Arial Black** (padrão original do letreiro de 1 linha) é proprietária e foi substituída por **Archivo Black**.
Uma URL antiga com uma fonte que não está na lista volta para a fonte padrão do template, com aviso.
Para adicionar uma fonte: coloque o TTF e a licença em `public/fontes/`, registre em `src/config/fontes.ts` e rode
`npm test` (o teste de fontes confere se o OpenSCAD resolve o nome).

## Alterações nos `.scad`

Ver [`templates/CHANGELOG.md`](templates/CHANGELOG.md). Resumo: só a fonte padrão do 1 linha mudou, de Arial Black
para Archivo Black. A geometria é idêntica à original (os originais continuam em `arquivos/`).

## Dimensões de referência (QA sem slicer)

`tests/unit/openscad-wasm.test.ts` renderiza cada peça de cada modo com os parâmetros padrão e $fn=80, e compara
a bounding box com `tests/fixtures/referencias-bbox.json` (±0,1 mm). Também verifica se `letras_fixas` fica
dentro da base em X/Y e apoiada no topo dela (alinhamento multicor).

A fixture atual foi gerada com o próprio WASM (`"origem": "wasm"`), porque o OpenSCAD desktop não estava instalado.
Para gerar a referência contra o **OpenSCAD desktop 2025.01.19**:

```bash
OPENSCAD_BIN="/caminho/para/openscad" npm run referencias
# por peça, roda: OPENSCADFONTPATH=public/fontes openscad templates/<id>/modelo.scad --backend=manifold \
#   -o x.stl --export-format=binstl -D '$fn=80' -D 'parte="base"' -D '<overrides do modo>' ...
```

## Arquitetura (resumo)

- **Templates como dados:** `parser.ts` lê os comentários do Customizer, `merge.ts` junta com o `template.json`
  (zod) e o build gera `src/generated/catalogo.json`. A UI não conhece nomes de parâmetros: tudo que tem
  significado especial vem de `papeis`, `previa` e `exportacao`.
- **Render:** `RenderClient` (thread principal) faz debounce de 600 ms, cancela um render obsoleto (encerra e recria o
  worker), aplica timeout de 30 s e guarda um cache LRU por hash(template + .scad + params + parte + $fn).
  O worker cria uma instância nova do OpenSCAD por render, monta só as fontes usadas em `/fonts` e passa os
  parâmetros por `-D` com **whitelist de nomes** e literais escapados (`toScadLiteral`). Um valor vindo da URL
  não consegue injetar código.
- **Prévia:** dois renders (base e letras) em dois workers paralelos, com $fn=24. Cada STL vira um mesh com a sua cor.
  "Em pé/Deitado" é rotação no three.js.
- **Exportação:** $fn=80, um worker em sequência. O modo escolhido sobrepõe as flags das letras. O 3MF é gerado em
  JS com as peças como `components` de um objeto.
- Configuração central: `src/config/render.ts` (`fnPrevia`, `fnExportacao`, `debounceMs`, `timeoutMs`).

## Limitações conhecidas

- **3MF:** gerado em JS (o export 3MF do WASM não foi usado, para controlar componentes e cores). A abertura no
  Bambu Studio, OrcaSlicer e PrusaSlicer precisa de validação manual: cada slicer interpreta `components`/cores do seu jeito.
- **Fonte desconhecida no OpenSCAD não gera erro** (o fontconfig cai em outra fonte). O app evita isso validando a lista.
- **Glifos:** a checagem usa o cmap das fontes. Caracteres combinados raros podem passar.
- **Safari/iOS:** o e2e roda no WebKit do Playwright. A validação em aparelhos físicos fica para a revisão humana.
  O binário WASM tem 11 MB (≈3 MB comprimido) e é baixado uma vez e guardado na Cache API.
- A troca de cor com um bico assume a altura de camada informada no modal (padrão 0,2 mm). Camada inicial
  diferente pode deslocar a camada exata da troca no slicer.
