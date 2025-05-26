# Valuation Shot

Herramienta estática (HTML + CSS + JS) para que inversores profesionales consulten de un vistazo las métricas esenciales de cualquier empresa cotizada.

## Instalación
1. Clona o descarga este repo.
2. Copia `js/config.example.js` a `js/config.js` y añade tus claves de **Finnhub** y **Financial Modeling Prep**.
3. Abre `index.html` en tu navegador preferido.

## Endpoints usados
| Origen   | Endpoint                                   | Descripción                                 |
|----------|--------------------------------------------|---------------------------------------------|
| Finnhub  | `/quote`                                   | Precio actual + 52 w High/Low               |
| FMP      | `/income-statement`                        | Estados de resultados últimos 5 años        |
| FMP      | `/balance-sheet-statement`                 | Balance últimos 5 años                      |
| FMP      | `/cash-flow-statement`                     | Flujo de caja últimos 5 años                |

## Uso
1. Escribe el ticker y pulsa **Servir datos**.
2. Revisa la tabla. Filas coloreadas según margen de seguridad.
3. Pulsa **Añadir a watchlist** para guardarlo localmente.
4. Exporta CSV o copia al portapapeles según necesites.

> **Disclaimer**: Herramienta informativa, no consejo de inversión.
