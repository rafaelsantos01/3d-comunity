# Plano e POC: Letreiros 3D

## OpenSCAD WASM escolhido

| Opção | Situação |
|---|---|
| **`openscad-wasm-prebuilt@1.2.0`** (npm) | **Escolhido.** Empacota o build oficial **OpenSCAD 2025.01.19** com backend **Manifold** (`--backend=manifold`). É um módulo ES único com o `.wasm` embutido (11 MB, ~3 MB com gzip/brotli). **Single-thread**: não exige COOP/COEP. Versão fixa no `package.json`, copiado para `public/openscad/2025.01.19/` pelo `postinstall`. |
| Build oficial do openscad-playground (files.openscad.org) | Mais novo, mas sem pacote npm versionado. Na sessão de desenvolvimento só o registro npm estava liberado. Fica como upgrade futuro: basta trocar `scripts/fetch-openscad.mjs` e `OPENSCAD_VERSAO`. |
| `openscad-wasm` (DSchroer) | Antigo, sem Manifold. Descartado. |

**Threads/COOP/COEP:** não são necessários (build single-thread). O `next.config.ts` só define `Cache-Control: immutable` para `/openscad/*` e `/fontes/*`.

**Carregamento sob demanda + cache:** o worker só é criado dentro do editor (`import()` dinâmico de `criar-cliente.ts`). O `openscad.js` é buscado com a **Cache API** (`letreiros-2025.01.19`), então a segunda visita não baixa o binário de novo. O mesmo vale para as fontes e o `.scad`.

## Tempos medidos (POC)

Medidos com `npm run poc` (Node 24, OpenSCAD WASM 2025.01.19, Windows 11, desktop). Cada render usa uma **instância nova** do módulo (~17–50 ms de instanciação, já incluída no total abaixo só como "init").

| Caso | $fn | Backend | Render |
|---|---|---|---|
| 1 linha, `base` (placa com `projection()`+`hull()`+`minkowski()`) | 24 | Manifold | **78 ms** |
| 1 linha, `letras_fixas` | 24 | Manifold | 16 ms |
| 1 linha, `base` | 80 | Manifold | 48 ms |
| 1 linha, `base` | 24 | CGAL | 65 ms |
| 2 linhas, `base` retângulo | 24 | Manifold | 45 ms |
| 2 linhas, `base` contorno | 24 | Manifold | 157 ms |
| 2 linhas, `base` contorno | 80 | Manifold | 604 ms |
| 2 linhas, `base` contorno | 80 | CGAL | 1091 ms |
| 2 linhas, `base` degrau | 80 | Manifold | 97 ms |
| 2 linhas, `letras_fixas` | 80 | Manifold | 41 ms |

**Conclusão sobre o `projection()`:** o risco não se confirmou. O `caixa_texto()`/`caixa()` opera em 2D, e a placa inteira sai em menos de 100 ms. O caso mais caro é o estilo **contorno** (offsets grandes) com $fn=80, ~0,6 s com Manifold (1,1 s com CGAL). O Manifold fica ativo sempre (`FLAGS_OPENSCAD` em `src/lib/render/args.ts`).

**No navegador (e2e Playwright, `next build` + `next start`, letreiro 1 linha):** tempo do texto editado até a prévia atualizada (dimensões novas na tela), **com os 600 ms de debounce incluídos**:

| Projeto | Tempo |
|---|---|
| Chromium | 1.293–1.362 ms |
| Firefox | 949–980 ms |
| WebKit | 930–1.008 ms |
| Mobile (Pixel 7 emulado) | 529–672 ms (o cronômetro começa depois de fechar o sheet, então parte do debounce já passou) |

O teste `e2e/fluxo-principal.spec.ts` falha se passar de 600 ms + 3 s e imprime o tempo em cada execução.

## Riscos: o que a POC confirmou

| Risco | Resultado |
|---|---|
| Desempenho do `projection()` | Não se confirmou (ver tabela). |
| Fontes e `:style=` no fontconfig do WASM | Funciona com TTFs estáticos montados em `/fonts` + `fonts.conf`. **Fonte desconhecida não dá erro**: o fontconfig cai em outra fonte em silêncio. Por isso o app valida a fonte contra a lista empacotada (`validarParams`) e o teste `openscad-wasm.test.ts` exige que as 12 fontes gerem 12 larguras distintas. |
| Glifo ausente (`.notdef` silencioso) | Mitigado: o build extrai o cmap de cada TTF (`src/generated/cobertura-fontes.json`), e a UI avisa antes de renderizar ("Fonte não suporta este caractere... não tem: ✿"). |
| Worker + Emscripten no bundler | Ok no `next build` (Turbopack): o worker carrega o `openscad.js` por blob URL com `import(/* webpackIgnore */)`. |
| 3MF | Gerado em JS (`src/lib/export/threemf.ts`), com 2 meshes como `components` de um objeto e cores via `basematerials`. Falta validar a abertura no Bambu/Orca/Prusa (revisão humana). |
| Fixture de referência (crit. 28) | O OpenSCAD desktop não estava instalado no ambiente. A fixture atual foi gerada com o **próprio WASM** (`"origem": "wasm"`). Para gerar a referência oficial: `OPENSCAD_BIN=/caminho/openscad npm run referencias`, com o desktop **2025.01.19**. |

## Estrutura de pastas

```
templates/<id>/{modelo.scad, template.json, thumbnail.svg}   # templates como dados
templates/CHANGELOG.md                                        # alterações nos .scad
public/fontes/<familia>/*.ttf + OFL.txt                       # fontes livres (versionadas)
public/openscad/<versao>/openscad.js                          # copiado no postinstall (gitignored)
scripts/  build-templates.ts · fetch-openscad.mjs · fetch-fontes.mjs · gerar-referencias.ts · poc-render.mjs
src/app/  page.tsx (galeria) · editor/[template]/page.tsx · not-found.tsx
src/components/  galeria/ · editor/ (Editor, PainelControles, CampoParametro, CampoFonte, PainelInfo, usePrevia) · previa/Previa3D · exportar/ModalBaixar
src/config/  fontes.ts · render.ts
src/lib/templates/  parser · schema (zod) · merge · validador-params · construir-catalogo · catalogo
src/lib/render/  render.worker · cliente (debounce/cancelamento/timeout/cache) · executar · args · erros · cache
src/lib/  export/{modos,threemf} · geometria/bbox · slug · mesa · cobertura · persistencia
src/store/editor.ts                                           # Zustand: params + desfazer/refazer
tests/unit/*.test.ts(x) · tests/fixtures/ · e2e/*.spec.ts
```
