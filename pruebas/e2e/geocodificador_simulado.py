"""Buscador de direcciones simulado (Nominatim) para que las pruebas no dependan de internet."""
import json, re, zlib
from urllib.parse import urlparse, parse_qs
BB=(-70.695,-33.405,-70.645,-33.365)  # aprox Conchalí
def street_line(name):
    h=zlib.crc32(name.lower().encode())
    t=(h%1000)/1000
    if h%2==0:  # horizontal
        lat=-33.398+t*0.026; return [[-70.69,lat],[-70.65,lat]]
    lng=-70.688+t*0.032; return [[lng,-33.40],[lng,-33.37]]
def _respuesta(route):
    u=urlparse(route.request.url); q={k:v[0] for k,v in parse_qs(u.query).items()}
    if u.path.endswith("/reverse"):
        body={"lat":q["lat"],"lon":q["lon"],"display_name":"Avenida Independencia 3499, Conchalí","address":{"road":"Avenida Independencia","house_number":"3499","neighbourhood":"Barrio Central","city":"Conchalí"}}
    elif "street" in q:
        body=[{"lat":"-33.38","lon":"-70.67","display_name":q["street"],"geojson":{"type":"LineString","coordinates":street_line(q["street"])}}]
    else:
        body=[{"lat":"-33.38445","lon":"-70.67065","display_name":"x","category":"place","address":{"road":"Avenida Independencia","house_number":"3499","neighbourhood":"Barrio Central","city":"Conchalí"}},
              {"lat":"-33.37900","lon":"-70.67100","display_name":"y","category":"highway","address":{"road":"Avenida Independencia","city":"Conchalí"}}]
    return dict(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"}, body=json.dumps(body))


async def manejar(route):
    await route.fulfill(**_respuesta(route))


def manejar_sync(route):
    route.fulfill(**_respuesta(route))
