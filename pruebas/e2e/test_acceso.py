"""Regla de la demo: cualquier cuenta entra a los tres sistemas y a todas las pantallas, sin «Sin acceso»."""
import pytest
from conftest import USUARIOS

PANTALLAS = [
    ("/halcones/central", "Central de Operaciones"),
    ("/halcones/central/procedimientos", "Procedimientos"),
    ("/halcones/central/moviles", "Móviles"),
    ("/halcones/central/reportes", "Reportes de terreno"),
    ("/halcones/central/bitacora", "Bitácora"),
    ("/halcones/central/turnos", "Turnos de la Central"),
    ("/halcones/central/claves", "Claves"),
    ("/halcones/central/ajustes", "Ajustes de la demo"),
    ("/halcones/patrulla", "Inicio de turno"),
    ("/georreferenciado/mapa", "Mapa en vivo"),
    ("/georreferenciado/historico", "Histórico"),
    ("/georreferenciado/muro", ""),
    ("/analisis/panel", "Panel de jefatura"),
    ("/analisis/patrones", "Patrones"),
    ("/analisis/terreno", "Trabajo en terreno"),
    ("/analisis/informes", "Informes"),
]


@pytest.mark.parametrize("correo", USUARIOS)
def test_cada_cuenta_entra_a_todo(pagina, correo):
    for sistema in ("halcones", "georreferenciado", "analisis"):
        pagina.entrar(correo, sistema)
        assert "/ingreso" not in pagina.page.url, f"{correo} no pudo entrar a {sistema}: {pagina.texto()[:300]}"
    for ruta, titulo in PANTALLAS:
        pagina.ir(ruta, 900)
        if ruta.startswith("/halcones/central"):
            pagina.abrir_turno_central(halcon="9")
        texto = pagina.texto()
        assert "Sin acceso" not in texto, f"{correo} vio «Sin acceso» en {ruta}"
        assert "/ingreso" not in pagina.page.url, f"{correo} fue enviado al ingreso desde {ruta}"
        if titulo:
            assert titulo in texto, f"{ruta}: no aparece «{titulo}» para {correo}"
    pagina.sin_errores()


def test_patrullero_llega_a_su_app_y_puede_ir_a_la_central(pagina):
    pagina.entrar("patrullero@demo.cl")
    assert "/patrulla" in pagina.page.url
    pagina.page.click("text=Ir a la Central")
    pagina.page.wait_for_timeout(800)
    assert "Inicio de turno en la Central" in pagina.texto()
    pagina.sin_errores()


def test_contrasena_incorrecta_no_entra(pagina):
    pagina.ir("/halcones/ingreso", 300)
    pagina.page.fill("#correo", "operador@demo.cl")
    pagina.page.fill("#contrasena", "otra")
    pagina.page.click("button[type=submit]")
    pagina.page.wait_for_timeout(900)
    assert "incorrectos" in pagina.texto()
    assert "/ingreso" in pagina.page.url
