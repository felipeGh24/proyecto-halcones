"""
Pruebas de punta a punta en el navegador (Playwright + pytest).

Requisitos: la demo construida y servida (npm run build && npm run demo, o node scripts/servir-demo.mjs).
  pip install pytest playwright && playwright install chromium
  pytest pruebas/e2e -q
Variables: PLATAFORMA_URL (por defecto http://localhost:4173), CHROME (ruta a un Chrome ya instalado, opcional).
El buscador de direcciones se simula: las pruebas no dependen de internet.
"""
import os
import pytest
from playwright.sync_api import sync_playwright

from geocodificador_simulado import manejar_sync

URL = os.environ.get("PLATAFORMA_URL", "http://localhost:4173").rstrip("/")
CONTRASENA = "demo2026"
USUARIOS = ["admin@demo.cl", "jefatura@demo.cl", "supervisor@demo.cl", "operador@demo.cl", "patrullero@demo.cl", "analista@demo.cl"]


@pytest.fixture(scope="session")
def navegador():
    with sync_playwright() as p:
        opciones = {"args": ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]}
        if os.environ.get("CHROME"):
            opciones["executable_path"] = os.environ["CHROME"]
        b = p.chromium.launch(**opciones)
        yield b
        b.close()


class Pagina:
    """Página con utilidades comunes y registro de errores de JavaScript."""

    def __init__(self, page):
        self.page = page
        self.errores = []
        page.on("pageerror", lambda e: self.errores.append(str(e)))

    def ir(self, ruta, espera=600):
        self.page.goto(URL + ruta)
        self.page.wait_for_timeout(espera)

    def vaciar(self):
        self.ir("/halcones/ingreso", 200)
        self.page.evaluate("localStorage.clear(); sessionStorage.clear(); indexedDB.deleteDatabase('plataforma-adjuntos')")

    def entrar(self, correo, sistema="halcones"):
        self.ir(f"/{sistema}/ingreso", 200)
        self.page.evaluate("localStorage.removeItem('plataforma.sesion.v1'); sessionStorage.clear()")
        self.ir(f"/{sistema}/ingreso", 400)
        self.page.fill("#correo", correo)
        self.page.fill("#contrasena", CONTRASENA)
        self.page.click("button[type=submit]")
        self.page.wait_for_timeout(1500)
        # Halcones: después del ingreso se elige cómo iniciar (Central o patrullero) según el rol.
        if sistema == "halcones" and self.page.locator(".elegir").count():
            modo = "patrulla" if correo.startswith(("patrullero", "analista")) else "central"
            self.page.click(f".elegir__opcion[data-modo={modo}]")
            self.page.wait_for_timeout(800)

    def abrir_turno_central(self, nombre="Operador de Prueba", halcon="3"):
        if self.page.locator("text=Inicio de turno en la Central").count():
            self.page.fill("#tc-nombre", nombre)
            self.page.fill("#tc-halcon", halcon)
            self.page.click("text=Iniciar turno en la Central")
            self.page.wait_for_timeout(700)

    def texto(self):
        # textContent: el texto real, sin mayúsculas aplicadas por CSS.
        return self.page.text_content("body") or ""

    def sin_errores(self):
        assert self.errores == [], f"Errores de JavaScript: {self.errores}"


@pytest.fixture
def pagina(navegador):
    ctx = navegador.new_context(viewport={"width": 1440, "height": 950}, locale="es-CL", timezone_id="America/Santiago")
    ctx.route("**/nominatim.openstreetmap.org/**", manejar_sync)
    p = Pagina(ctx.new_page())
    p.vaciar()
    yield p
    ctx.close()


@pytest.fixture
def foto(tmp_path):
    import struct, zlib
    def png(w, h):
        raw = b"".join(b"\x00" + bytes([200, 60, 60]) * w for _ in range(h))
        c = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
        return b"\x89PNG\r\n\x1a\n" + c(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + c(b"IDAT", zlib.compress(raw)) + c(b"IEND", b"")
    f = tmp_path / "foto.png"
    f.write_bytes(png(120, 80))
    return str(f)
