"""Un solo ingreso y después «¿Cómo deseas iniciar?»: Central o patrullero, según el rol."""
from conftest import CONTRASENA


def _ingresar(pagina, correo):
    p = pagina.page
    pagina.ir("/halcones/ingreso", 200)
    p.evaluate("localStorage.removeItem('plataforma.sesion.v1'); sessionStorage.clear()")
    pagina.ir("/halcones/ingreso", 400)
    p.fill("#correo", correo)
    p.fill("#contrasena", CONTRASENA)
    p.click("button[type=submit]")
    p.wait_for_timeout(1200)
    assert "¿Cómo deseas iniciar?" in pagina.texto()


def test_elegir_segun_rol(pagina):
    p = pagina.page
    p.set_viewport_size({"width": 390, "height": 844})
    # El patrullero no puede entrar como Central.
    _ingresar(pagina, "patrullero@demo.cl")
    p.click(".elegir__opcion[data-modo=central]")
    assert "no permite iniciar como Central" in pagina.texto()
    p.click(".elegir__opcion[data-modo=patrulla]")
    p.wait_for_timeout(800)
    assert "/patrulla" in p.url
    # El operador no puede entrar como patrullero.
    _ingresar(pagina, "operador@demo.cl")
    p.click(".elegir__opcion[data-modo=patrulla]")
    assert "no permite iniciar como patrullero" in pagina.texto()
    # El supervisor puede las dos.
    _ingresar(pagina, "supervisor@demo.cl")
    p.click(".elegir__opcion[data-modo=central]")
    p.wait_for_timeout(800)
    assert "/central" in p.url
    pagina.sin_errores()
