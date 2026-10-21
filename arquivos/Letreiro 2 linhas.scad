/* [Texto] */
linha1 = "JP";
linha2 = "PERSONALIZADOS";   // deixe vazio "" para letreiro de uma linha só
fonte1 = "Playfair Display:style=Bold";
fonte2 = "Playfair Display:style=Bold";
tamanho1 = 55;
tamanho2 = 11;
espacamento1 = 1;
espacamento2 = 1.00;
espaco_linhas = 4;

/* [Modo das letras] */
linha1_fixa = true;
linha2_fixa = true;

/* [Estilo da base] */
estilo_base = "retangulo"; // [contorno, retangulo, degrau]
base_espessura = 12;    // também é a "profundidade" do pé na mesa
raio_canto = 4;         // cantos arredondados (retangulo e degrau)

/* [Retângulo / linha 2 do degrau] */
margem_horizontal = 10;
margem_vertical = 6;

/* [Degrau: bloco do JP] */
margem_jp_horizontal = 8;   // diminua/aumente para deixar o bloco mais quadrado
margem_jp_vertical = 6;
raio_juncao = 4;            // arredonda o "cantinho" onde os dois blocos se encontram

/* [Contorno] */
borda = 6;
fechamento = 10;
corte = 3;
altura_pe = 8;

/* [Letras] */
altura_letra = 5;
profundidade_encaixe = 2.5;
folga = 0.3;

/* [Exportação] */
parte = "previa"; // [previa, base, letras_fixas, letras_soltas, base_unica]
previa_em_pe = true;
cor_base   = "#F5EFE6";
cor_letras = "#6B3E26";

/* [Hidden] */
$fn = 80;
desloc = tamanho1 + tamanho2 + 40;
L = 2000;
y_letras = (linha2 == "") ? 0 : -espaco_linhas - tamanho2;
y_fundo  = y_letras - borda + corte;

// =============================
// TEXTOS 2D
// =============================
module l1_2d(d=0){
    offset(r=d)
        text(linha1, size=tamanho1, font=fonte1, spacing=espacamento1,
             halign="center", valign="baseline");
}

module l2_2d(d=0){
    if (linha2 != "")
        offset(r=d)
            translate([0, -espaco_linhas])
                text(linha2, size=tamanho2, font=fonte2, spacing=espacamento2,
                     halign="center", valign="top");
}

module tudo_2d()      { l1_2d(); l2_2d(); }
module fixas_2d()     { if (linha1_fixa)  l1_2d();  if (linha2_fixa)  l2_2d(); }
module soltas_2d(d=0) { if (!linha1_fixa) l1_2d(d); if (!linha2_fixa) l2_2d(d); }

// =============================
// FERRAMENTAS
// =============================
// retângulo exato em volta do que estiver dentro (children)
module caixa(){
    intersection(){
        scale([1, 2*L]) translate([0, 0.5])
            hull() projection() rotate([90, 0, 0]) linear_extrude(1) children();
        scale([2*L, 1]) translate([-0.5, 0])
            hull() projection() rotate([0, 90, 0]) linear_extrude(1) children();
    }
}

// retângulo arredondado com margens em volta do conteúdo
module placa_em_volta(mh, mv){
    offset(r=raio_canto)
        minkowski(){
            caixa() children();
            square([2*max(mh - raio_canto, 0.01),
                    2*max(mv - raio_canto, 0.01)], center=true);
        }
}

// =============================
// ESTILOS DE BASE (2D)
// =============================
module base_contorno_2d(){
    module silhueta(){
        offset(r=-fechamento) offset(r=borda + fechamento) tudo_2d();
    }
    intersection(){
        union(){
            silhueta();
            hull() intersection(){
                silhueta();
                translate([-L/2, y_fundo - L]) square([L, L + altura_pe]);
            }
        }
        translate([-L/2, y_fundo]) square([L, L]);
    }
}

module base_retangulo_2d(){
    placa_em_volta(margem_horizontal, margem_vertical) tudo_2d();
}

module base_degrau_2d(){
    offset(r=-raio_juncao) offset(r=raio_juncao)   // suaviza a junção
    union(){
        placa_em_volta(margem_jp_horizontal, margem_jp_vertical) l1_2d();
        if (linha2 != "")
            placa_em_volta(margem_horizontal, margem_vertical) l2_2d();
    }
}

module base_2d(){
    if (estilo_base == "contorno")  base_contorno_2d();
    if (estilo_base == "retangulo") base_retangulo_2d();
    if (estilo_base == "degrau")    base_degrau_2d();
}

// =============================
// PEÇAS
// =============================
module base(){
    difference(){
        linear_extrude(height=base_espessura) base_2d();

        translate([0, 0, base_espessura - profundidade_encaixe])
            linear_extrude(height=profundidade_encaixe + 0.1)
                soltas_2d(folga);
    }
}

module letras_fixas(){
    translate([0, 0, base_espessura])
        linear_extrude(height=altura_letra)
            fixas_2d();
}

module letras_soltas(){
    linear_extrude(height=profundidade_encaixe + altura_letra)
        soltas_2d();
}

module base_unica(){
    base();
    translate([0, 0, base_espessura - 0.01])
        linear_extrude(height=altura_letra + 0.01)
            fixas_2d();
}

// =============================
// EXPORT
// =============================
module montado(){
    color(cor_base)   base();
    color(cor_letras) letras_fixas();
    color(cor_letras)
        translate([0, 0, base_espessura - profundidade_encaixe])
            letras_soltas();
}

if (parte == "previa"){
    if (previa_em_pe)
        rotate([90, 0, 0])
            translate([0, estilo_base == "contorno" ? -y_fundo : 0, 0])
                montado();
    else montado();
}
if (parte == "base")          base();
if (parte == "letras_fixas")  letras_fixas();
if (parte == "letras_soltas") translate([0, desloc, 0]) letras_soltas();
if (parte == "base_unica")    base_unica();