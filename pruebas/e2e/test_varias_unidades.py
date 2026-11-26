"""Despacho a varias unidades: un móvil a cargo y un punto fijo de apoyo; a cada uno le llega el aviso."""


def test_despacho_a_varias_unidades_y_avisos(pagina):
    p = pagina.page
    # Unidad 1: patrullero en Móvil 03.
    p.set_viewport_size({"width": 390, "height": 844})
    pagina.entrar("patrullero@demo.cl")
    p.select_option("#movil", "MOVIL-03")
    p.fill("#halcon", "12")
    p.fill("#km", "1000")
    p.click("text=Iniciar turno >> nth=-1")
    p.wait_for_timeout(600)
    # Unidad 2: punto fijo (en la demo cualquier cuenta puede abrir la app del patrullero).
    pagina.entrar("analista@demo.cl")
    pagina.ir("/halcones/patrulla", 800)
    p.fill("#nombre", "Patrullera Punto Fijo")
    p.click("text=Punto fijo")
    # Punto fijo lejano (Metro Cardenal Caro) para que el móvil quede a cargo por cercanía.
    p.select_option("#lugar", "pf-metro-cardenal-caro")
    p.click("text=Iniciar turno >> nth=-1")
    p.wait_for_timeout(600)

    # Central: elige todas las unidades libres.
    p.set_viewport_size({"width": 1440, "height": 950})
    pagina.entrar("operador@demo.cl")
    pagina.abrir_turno_central("Operadora Varias", "4")
    p.click("text=Nuevo procedimiento")
    p.fill("[role=combobox] >> nth=0", "robo")
    p.keyboard.press("Enter")
    p.click("#direccion")
    p.keyboard.type("Independencia 3499", delay=20)
    p.wait_for_timeout(2200)
    p.keyboard.press("Enter")
    p.wait_for_timeout(700)
    p.click("text=Elegir unidades")
    texto = p.text_content(".unidades")
    assert "Móvil 03" in texto and "Punto fijo" in texto, "Deben aparecer móviles y puntos fijos"
    p.click("text=Todas las unidades libres (2)")
    p.wait_for_timeout(300)
    asign = p.text_content(".asignacion")
    assert "A cargo" in asign and "Apoyo" in asign
    p.locator("button", has_text="Crear y despachar (2 unidades)").click()
    p.wait_for_timeout(800)

    # Detalle: ambas unidades enviadas, aviso sin confirmar.
    pagina.ir("/halcones/central/procedimientos", 800)
    p.locator("tr", has_text="67 · Robo").first.click()
    p.wait_for_timeout(500)
    detalle = p.text_content(".ui-modal")
    assert "Unidades enviadas (2)" in detalle and "aviso sin confirmar" in detalle, detalle

    # Punto fijo: aviso de apoyo, avanza y termina su apoyo.
    p.set_viewport_size({"width": 390, "height": 844})
    pagina.entrar("analista@demo.cl")
    pagina.ir("/halcones/patrulla", 800)
    assert "Te enviaron de apoyo" in pagina.texto(), pagina.texto()[:600]
    assert "Móvil 03" in pagina.texto()
    p.click("text=Entendido")
    p.wait_for_timeout(300)
    assert "De apoyo" in pagina.texto()
    for t in ["Voy en camino", "Llegué al lugar", "Terminé mi apoyo"]:
        p.click(f"text={t}")
        p.wait_for_timeout(400)
    assert "En servicio" in pagina.texto()

    # Móvil 03: aviso a cargo.
    pagina.entrar("patrullero@demo.cl")
    assert "Te despacharon" in pagina.texto() and "vas a cargo" in pagina.texto()
    p.click("text=Entendido")
    p.wait_for_timeout(300)
    assert "A cargo" in pagina.texto()

    # Central: agregar de nuevo al punto fijo, ahora libre.
    p.set_viewport_size({"width": 1440, "height": 950})
    pagina.entrar("operador@demo.cl")
    pagina.ir("/halcones/central/procedimientos", 800)
    p.locator("tr", has_text="67 · Robo").first.click()
    p.wait_for_timeout(400)
    assert "Unidades enviadas (1)" in p.text_content(".ui-modal")
    p.click("text=Agregar unidades")
    p.locator(".ui-modal").last.locator("text=Todas las unidades libres (1)").click()
    p.locator(".ui-modal button", has_text="Enviar 1 unidad").click()
    p.wait_for_timeout(600)
    assert "Unidades enviadas (2)" in p.text_content(".ui-modal")
    pagina.sin_errores()
