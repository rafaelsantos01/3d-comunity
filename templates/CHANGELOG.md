# Alterações nos modelos `.scad`

Os arquivos originais estão em `arquivos/` (mantidos como referência). As cópias usadas pelo app ficam em
`templates/<id>/modelo.scad`. A lógica geométrica **não foi alterada**. Para conferir:

```bash
git diff --no-index --ignore-cr-at-eol "arquivos/Letreiro simples.scad" templates/letreiro-1-linha/modelo.scad
git diff --no-index --ignore-cr-at-eol "arquivos/Letreiro 2 linhas.scad" templates/letreiro-2-linhas/modelo.scad
```

## letreiro-1-linha (`arquivos/Letreiro simples.scad`)

| Linha | Antes | Depois | Motivo |
|---|---|---|---|
| 3 | `fonte = "Arial Black";` | `fonte = "Archivo Black";` | Arial Black é proprietária e não pode ser distribuída. Archivo Black (OFL) é o equivalente livre mais próximo. |

## letreiro-2-linhas (`arquivos/Letreiro 2 linhas.scad`)

Sem alterações (cópia idêntica).

## Bugs encontrados

Nenhum. Observações (comportamento original, mantido):
- `parte = "letras_soltas"` desloca as letras em Y (`desloc`) para ficarem ao lado da base na mesa. É intencional no modo **Encaixe**.
- O app nunca usa `parte = "previa"`: a prévia renderiza `base` e `letras_fixas` separadamente para colorir cada peça, e a rotação "em pé" é feita no three.js.
