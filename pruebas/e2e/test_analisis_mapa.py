"""Datos de ejemplo: análisis, patrones, terreno, mapa y ubicación automática de recintos sin errores."""


def test_analisis_y_mapa_con_ejemplo(pagina):
    p = pagina.page
    pagina.entrar("admin@demo.cl")
    pagina.abrir_turno_central("Admin Prueba", "1")
    pagina.ir("/halcones/central/ajustes", 700)
    p.click("text=Cargar datos de ejemplo")
    p.locator(".ui-modal button").last.click()
    p.wait_for_timeout(1500)
    for ruta, esperado in [
        ("/analisis/panel", "Cumplimiento de meta"),
        ("/analisis/patrones", "Qué está aprendiendo el sistema"),
        ("/analisis/terreno", "¿Patrullamos donde está el conflicto?"),
        ("/analisis/informes", "Informes"),
        ("/georreferenciado/mapa", "Recintos y puntos del municipio"),
        ("/georreferenciado/historico", "Histórico"),
    ]:
        pagina.ir(ruta, 1800)
        assert esperado in pagina.texto(), f"{ruta}: falta «{esperado}»"
    assert "Brecha de cobertura" in (pagina.ir("/analisis/terreno", 1500) or pagina.texto())
    import re
    pagina.ir("/georreferenciado/mapa", 1500)
    faltan = lambda: int(re.search(r"(\d+) sin ubicar", pagina.texto()).group(1))
    antes = faltan()
    p.locator("button", has_text="automáticamente").click()
    p.wait_for_function("() => !document.body.innerText.includes('Ubicando ')", timeout=60000)
    p.wait_for_timeout(500)
    texto = pagina.texto()
    assert "sin ubicar" not in texto or faltan() < antes, "La ubicación automática no ubicó ningún recinto"
    pagina.sin_errores()
