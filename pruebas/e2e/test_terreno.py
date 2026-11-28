"""Procedimiento que le sale al patrullero en la calle: lo inicia, la Central lo ve, y al terminar completa el reporte."""


def test_procedimiento_iniciado_en_terreno(pagina):
    p = pagina.page
    p.set_viewport_size({"width": 390, "height": 844})
    pagina.entrar("patrullero@demo.cl")
    p.select_option("#movil", "MOVIL-07")
    p.fill("#halcon", "07")
    p.fill("#km", "5000")
    p.click("text=Iniciar turno >> nth=-1")
    p.wait_for_timeout(700)

    # Sin despacho de la Central: el patrullero inicia el procedimiento.
    p.locator("button", has_text="Iniciar procedimiento").click()
    p.fill(".ui-modal [role=combobox] >> nth=0", "robo")
    p.keyboard.press("Enter")
    p.fill("#dir-terreno", "")
    p.click("#dir-terreno")
    p.keyboard.type("Independencia 3499", delay=20)
    p.wait_for_timeout(1500)
    p.keyboard.press("Enter")
    p.wait_for_timeout(500)
    p.locator(".ui-modal button", has_text="Crear y avisar a la Central").click()
    p.wait_for_timeout(700)
    assert "Iniciado en terreno" in pagina.texto()

    # Lo finaliza y se abre solo el reporte con los datos del procedimiento.
    p.click("text=Finalizar procedimiento")
    p.click("text=Se coordina con Carabineros")
    p.locator(".ui-modal button", has_text="Finalizar").last.click()
    p.wait_for_timeout(700)
    assert "iniciado en terreno" in p.text_content(".proc-reporte")
    p.fill("#obs-rep", "Se detiene a un individuo y se entrega a Carabineros.")
    p.click("text=Enviar a la Central")
    p.wait_for_timeout(600)
    assert "PROCEDIMIENTO" in p.text_content(".texto-compartir")
    p.click("text=Listo")

    # Central: lo ve marcado como iniciado en terreno, con su reporte.
    p.set_viewport_size({"width": 1440, "height": 950})
    pagina.entrar("operador@demo.cl")
    pagina.abrir_turno_central("Operadora Terreno", "4")
    pagina.ir("/halcones/central/reportes", 800)
    assert "Halcón 07 · Móvil 07" in pagina.texto()
    p.click("text=Halcón 07 · Móvil 07")
    p.wait_for_timeout(400)
    assert "Se detiene a un individuo" in pagina.texto()
    pagina.sin_errores()
