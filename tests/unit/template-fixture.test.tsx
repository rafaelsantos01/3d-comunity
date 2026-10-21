// @vitest-environment jsdom
// Crit. 5: um template novo (só .scad + template.json) aparece na galeria e gera o formulário, sem código de UI novo.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Galeria } from "@/components/galeria/Galeria";
import { PainelControles } from "@/components/editor/PainelControles";
import { construirCatalogo } from "@/lib/templates/construir-catalogo";
import { padroes } from "@/lib/templates/validador-params";

const { templates } = construirCatalogo("tests/fixtures/templates");
const t = templates[0];

beforeAll(() => {
  // Radix Slider usa ResizeObserver, que o jsdom não tem
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe("template fixture", () => {
  it("aparece na galeria com link para o editor", () => {
    render(<Galeria templates={templates} />);
    const card = screen.getByRole("listitem");
    expect(within(card).getByRole("heading", { name: "Modelo Fixture" })).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Personalizar Modelo Fixture" })).toHaveAttribute("href", "/editor/fixture-teste");
  });

  it("gera o formulário a partir do schema", async () => {
    const onChange = vi.fn();
    render(<PainelControles template={t} params={padroes(t)} onChange={onChange} />);
    expect(screen.getByRole("textbox", { name: "Rótulo" })).toHaveValue("Teste");
    expect(screen.getByRole("spinbutton", { name: "Altura" })).toHaveValue(10);
    expect(screen.getByRole("slider", { name: "Altura" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Quadrado" })).toBeChecked();
    expect(screen.getByLabelText("Cor principal")).toHaveAttribute("type", "color");
    expect(screen.getByRole("button", { name: "Cores e peças" })).toBeInTheDocument();
    // parte é oculto; "extra" (sem entrada no json) vai para Avançado; "fixas" é booleano
    expect(screen.queryByLabelText(/parte/i)).toBeNull();
    expect(screen.getByText("Avançado (2)")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Fixas" })).toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "Redondo" }));
    expect(onChange).toHaveBeenCalledWith("forma", "redondo");
  });
});
