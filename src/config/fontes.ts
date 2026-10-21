// Fontes empacotadas (todas SIL Open Font License 1.1). Os arquivos ficam em public/fontes/<pasta>/.
// `valor` é a string que o OpenSCAD recebe em `font=`.

export interface FonteDisponivel {
  valor: string;
  rotulo: string;
  arquivo: string;
  cssFamily: string;
  cssWeight: number;
  licenca: string;
}

const f = (valor: string, rotulo: string, pasta: string, arq: string, cssFamily: string, cssWeight: number): FonteDisponivel => ({
  valor,
  rotulo,
  arquivo: `/fontes/${pasta}/${arq}`,
  cssFamily,
  cssWeight,
  licenca: "OFL-1.1",
});

export const FONTES: FonteDisponivel[] = [
  f("Archivo Black", "Archivo Black", "archivoblack", "ArchivoBlack-400.ttf", "Archivo Black", 400),
  f("Montserrat", "Montserrat", "montserrat", "Montserrat-400.ttf", "Montserrat", 400),
  f("Montserrat:style=Bold", "Montserrat Bold", "montserrat", "Montserrat-700.ttf", "Montserrat", 700),
  f("Montserrat:style=Black", "Montserrat Black", "montserrat", "Montserrat-900.ttf", "Montserrat", 900),
  f("Playfair Display", "Playfair Display", "playfairdisplay", "PlayfairDisplay-400.ttf", "Playfair Display", 400),
  f("Playfair Display:style=Bold", "Playfair Display Bold", "playfairdisplay", "PlayfairDisplay-700.ttf", "Playfair Display", 700),
  f("Poppins", "Poppins", "poppins", "Poppins-400.ttf", "Poppins", 400),
  f("Poppins:style=Bold", "Poppins Bold", "poppins", "Poppins-700.ttf", "Poppins", 700),
  f("Cinzel", "Cinzel", "cinzel", "Cinzel-400.ttf", "Cinzel", 400),
  f("Cinzel:style=Bold", "Cinzel Bold", "cinzel", "Cinzel-700.ttf", "Cinzel", 700),
  f("Pacifico", "Pacifico", "pacifico", "Pacifico-400.ttf", "Pacifico", 400),
  f("Bebas Neue", "Bebas Neue", "bebasneue", "BebasNeue-400.ttf", "Bebas Neue", 400),
];

export const VALORES_FONTES = FONTES.map((x) => x.valor);

export function buscarFonte(valor: string): FonteDisponivel | undefined {
  return FONTES.find((x) => x.valor === valor);
}
