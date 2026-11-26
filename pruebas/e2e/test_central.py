"""Turno de la Central: inicio con nombre y halcón, registro de acciones, corrección, cancelación, cierre y entrega."""


def crear_procedimiento(pagina, clave, direccion_texto="Independencia 3499", despachar=True):
    p = pagina.page
    p.click("text=Nuevo procedimiento")
    p.wait_for_timeout(500)
    p.fill("[role=combobox] >> nth=0", str(clave))
    p.keyboard.press("Enter")
    p.click("#direccion")
    p.keyboard.type(direccion_texto, delay=20)
    p.wait_for_timeout(2200)
    p.keyboard.press("Enter")
    p.wait_for_timeout(800)
    p.fill("#descripcion", "Prueba automática")
    boton = p.locator("button", has_text="Crear y despachar") if despachar else p.locator("button", has_text="Crear sin despachar")
    boton.first.click()
    p.wait_for_timeout(900)


def test_turno_central_completo(pagina):
    p = pagina.page
    pagina.entrar("operador@demo.cl")
    texto = pagina.texto()
    assert "Inicio de turno en la Central" in texto
    assert "No hay un turno anterior cerrado" in texto
    # No deja entrar sin halcón.
    p.fill("#tc-nombre", "Camila Rojas")
    p.click("text=Iniciar turno en la Central")
    p.wait_for_timeout(300)
    assert "número de halcón" in pagina.texto()
    p.fill("#tc-halcon", "3")
    p.click("text=Iniciar turno en la Central")
    p.wait_for_timeout(800)
    assert "Halcón 3" in pagina.texto()

    crear_procedimiento(pagina, 67, despachar=False)
    crear_procedimiento(pagina, 57, despachar=False)

    # Corregir el primero y cancelar el segundo.
    pagina.ir("/halcones/central/procedimientos", 800)
    p.locator("tr", has_text="67 · Robo").first.click()
    p.wait_for_timeout(500)
    p.click("text=Corregir datos")
    p.fill("#editar-dir", "Avenida Independencia 3501")
    p.fill("#editar-motivo", "vecino corrige el número")
    p.click("text=Guardar corrección")
    p.wait_for_timeout(600)
    assert "Cambios registrados" in pagina.texto()
    assert "vecino corrige el número" in pagina.texto()

    p.keyboard.press("Escape")
    p.wait_for_timeout(300)
    p.locator("tr", has_text="57 ·").first.click()
    p.wait_for_timeout(400)
    p.locator(".ui-modal button", has_text="Cancelar procedimiento").first.click()
    p.wait_for_timeout(300)
    p.locator(".ui-modal textarea").last.fill("llamado duplicado")
    p.locator(".ui-modal button", has_text="Cancelar procedimiento").last.click()
    p.wait_for_timeout(300)
    p.keyboard.press("Escape")
    p.wait_for_timeout(600)

    # Cerrar el turno: resumen en pantalla y guardado.
    p.locator("button", has_text="Cerrar turno").first.click()
    p.wait_for_timeout(600)
    modal = p.text_content(".ui-modal")
    assert "Quiénes estuvieron en la Central" in modal and "Camila Rojas" in modal
    assert "Modificó" in modal and "Canceló" in modal
    p.fill("#tc-entrega", "Queda el robo de Independencia sin móvil")
    p.click("text=Cerrar turno y guardar")
    p.wait_for_timeout(900)
    texto = pagina.texto()
    assert "Turno cerrado y guardado" in texto
    assert "Resumen de tu turno" in texto

    # El siguiente operador recibe la entrega.
    pagina.entrar("supervisor@demo.cl")
    texto = pagina.texto()
    assert "Camila Rojas" in texto and "Halcón 3" in texto
    assert "Queda el robo de Independencia sin móvil" in texto
    assert "Procedimientos activos que siguen (1)" in texto
    pagina.abrir_turno_central("Pedro Soto", "5")
    pagina.ir("/halcones/central/turnos", 900)
    texto = pagina.texto()
    assert "Camila Rojas" in texto and "Pedro Soto" in texto
    pagina.sin_errores()
