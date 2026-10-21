/* [Texto] */
texto = "JP Personalizados";
fonte = "Arial Black";
tamanho = 16;             // atenção ao tamanho da mesa da impressora (ver nota abaixo)
espacamento = 1;          // espaçamento entre letras (1 = normal)

/* [Modo das letras] */
letras_fixas = true;      // true = já sai em cima da base | false = peças com pino pra encaixar

/* [Placa] */
margem_horizontal = 4;   // espaço entre o texto e as laterais da placa
margem_vertical = 4;      // espaço entre o texto e o topo/fundo da placa
raio_canto = 4;           // arredondamento dos cantos da placa
base_espessura = 12;      // também é a "profundidade" do pé na mesa

/* [Letras] */
altura_letra = 4;
profundidade_encaixe = 2.5;
folga = 0.3;

/* [Exportação] */
parte = "previa"; // [previa, base, letras_fixas, letras_soltas, base_unica]
previa_em_pe = true;
cor_base   = "#2B4C7E";
cor_letras = "#FFFFFF";

/* [Hidden] */
$fn = 80;
L = 2000;
desloc = tamanho * 3 + 40;

// =============================
// TEXTO 2D
// =============================
module texto_2d(d=0){
    offset(r=d)
        text(texto, size=tamanho, font=fonte, spacing=espacamento,
             halign="center", valign="center");
}

// =============================
// CAIXA DELIMITADORA DO TEXTO (retângulo exato)
// =============================
module caixa_texto(){
    intersection(){
        // faixa com a largura do texto
        scale([1, 2*L]) translate([0, 0.5])
            hull() projection() rotate([90, 0, 0])
                linear_extrude(1) texto_2d();
        // faixa com a altura do texto
        scale([2*L, 1]) translate([-0.5, 0])
            hull() projection() rotate([0, 90, 0])
                linear_extrude(1) texto_2d();
    }
}

// =============================
// PLACA RETANGULAR
// =============================
module placa_2d(){
    offset(r=raio_canto)
        minkowski(){
            caixa_texto();
            square([2*max(margem_horizontal - raio_canto, 0.01),
                    2*max(margem_vertical   - raio_canto, 0.01)], center=true);
        }
}

// =============================
// PEÇAS
// =============================
module base(){
    difference(){
        linear_extrude(height=base_espessura)
            placa_2d();

        if (!letras_fixas)
            translate([0, 0, base_espessura - profundidade_encaixe])
                linear_extrude(height=profundidade_encaixe + 0.1)
                    texto_2d(folga);
    }
}

module letras_em_cima(){
    translate([0, 0, base_espessura])
        linear_extrude(height=altura_letra)
            texto_2d();
}

module letras_com_pino(){
    linear_extrude(height=profundidade_encaixe + altura_letra)
        texto_2d();
}

module base_unica(){
    base();
    translate([0, 0, base_espessura - 0.01])
        linear_extrude(height=altura_letra + 0.01)
            texto_2d();
}

// =============================
// EXPORT
// =============================
module montado(){
    color(cor_base) base();
    color(cor_letras)
        if (letras_fixas) letras_em_cima();
        else translate([0, 0, base_espessura - profundidade_encaixe]) letras_com_pino();
}

if (parte == "previa"){
    if (previa_em_pe) rotate([90, 0, 0]) montado();
    else montado();
}
if (parte == "base")          base();
if (parte == "letras_fixas")  letras_em_cima();
if (parte == "letras_soltas") translate([0, desloc, 0]) letras_com_pino();
if (parte == "base_unica")    base_unica();