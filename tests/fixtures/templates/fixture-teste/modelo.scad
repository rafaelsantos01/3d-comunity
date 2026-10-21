// Template fictício usado nos testes: prova que um modelo novo funciona só com .scad + template.json.
/* [Forma] */
rotulo = "Teste";
forma = "quadrado"; // [quadrado, redondo]
altura = 10;
extra = 1.5;
fixas = true;

/* [Cores] */
parte = "base"; // [base, letras_fixas, base_unica, letras_soltas]
cor = "#FF0000";
cor2 = "#00FF00";
espessura = 2;

/* [Hidden] */
$fn = 32;

module peca(){ if (forma == "quadrado") cube([altura, altura, espessura]); else cylinder(r=altura/2, h=espessura); }
if (parte == "base" || parte == "base_unica") peca();
if (parte == "letras_fixas" || parte == "letras_soltas") translate([0,0,espessura]) linear_extrude(1) text(rotulo, size=3);
