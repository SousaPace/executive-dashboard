# Executive Dashboard · Capital de Trabajo

Dashboard ejecutivo de Orion Castings (Saltillo) en carrusel, pensado para pantalla/TV, con tres vistas:

| Vista | KPIs |
| --- | --- |
| **Finanzas** | Collections, AR Aging, DSO, AP Aging, DPO |
| **Inventario** | Inventory (RM + WIP + FG), DIO, CCC |
| **Ventas** | Daily Sales, Open PO's |

Cada KPI muestra MTD, Day, Plan y % vs Plan, con estado **En plan / Cerca del plan / Fuera de plan**.

Los datos salen de un **Excel que se sube cada mañana** en `/cargar`. Mientras no se haya subido
ninguno, el dashboard muestra datos simulados con la etiqueta "Datos de ejemplo".

## Uso

```bash
pnpm install
echo "UPLOAD_PASSWORD=<contraseña>" > .env.local   # contraseña para subir el Excel
pnpm dev        # http://localhost:3100
pnpm test
pnpm typecheck
```

Pantallas (una por televisión):

| Ruta | Muestra |
| --- | --- |
| `/` | Inicio: elegir qué muestra esta pantalla |
| `/todos` | Carrusel con las tres vistas; rota cada 20 s, se pausa con el mouse encima, con foco de teclado o con el botón de pausa; ← / → cambian de vista |
| `/finanzas` | Solo Finanzas, fija |
| `/inventario` | Solo Inventario, fija |
| `/ventas` | Solo Ventas, fija |
- En WSL con el repo en `/mnt/c`, el servidor de desarrollo no siempre detecta cambios: reiniciar `pnpm dev`.

## Carga diaria del Excel

1. Descargar la plantilla en `/plantilla` (o desde el botón en `/cargar`).
2. Llenar las hojas:
   - **Diario**: una fila por día hábil del mes fiscal — Fecha, Collections, AR, AP, DPO (días),
     Inventario RM / WIP / FG, Venta diaria, Open POs.
   - **Plan**: metas del mes. Collections y Venta son el total del mes y se reparten entre los
     "Días de venta del mes" (Plan MTD = plan ÷ días × días transcurridos).
   - **AR Aging / AP Aging**: saldo por rango de antigüedad al día de corte.
3. Subirlo en `/cargar` con la contraseña (`UPLOAD_PASSWORD`).

También se acepta, como respaldo, una hoja con los KPIs en filas (Collections, AR Aging, …) y una
columna por día con la fecha como encabezado, más una columna "Plan". En ese formato MTD y % vs Plan
se ignoran y DSO / DIO / CCC se recalculan con su fórmula. Si en "Diario" no hay desglose de
inventario, la columna "Inventario total" se usa tal cual.

Reglas:

- Celda vacía = **sin dato**, nunca 0. El KPI se muestra "—" y la gráfica deja el hueco.
- Si el archivo tiene cualquier error (fecha inválida, texto en una columna numérica, fecha
  repetida) **no se aplica** y se listan los errores con hoja, fila y columna; el dashboard sigue
  con el archivo anterior.
- Se aceptan fechas de Excel o texto `DD/MM/AAAA`, montos con `$` y comas, y celdas con fórmula
  (se usa el resultado).
- Las pantallas abiertas revisan cada minuto si hay un archivo nuevo y se actualizan solas.
- El último archivo válido queda en `storage/current.json` y cada original en `storage/uploads/`
  (carpeta configurable con `DATA_DIR`, excluida de git).
- Si falta RM, Inventory/DIO/CCC se calculan con WIP + FG y la tarjeta dice "Incompleto: sin RM".

Código: plantilla y lectura en `src/data/excel.ts`, cálculo de KPIs en `src/domain/dashboard.ts`
(el mismo para el Excel y para el mock), fórmulas en `src/domain/kpis.ts`.

## Fórmulas

- DSO = AR / venta diaria promedio
- DIO = inventario total (RM + WIP + FG) / venta diaria promedio
- CCC = DSO + DIO − DPO
- % vs Plan = MTD / Plan

## Reglas pendientes de confirmar

- Ventana de la venta diaria promedio (mes fiscal en curso, 30/90 días; días hábiles o naturales).
- Denominador del DPO (compras o costo de ventas). Mientras tanto, el DPO se captura ya calculado en el Excel.
- MTD de saldos: promedio del mes vs. cierre.
- Umbrales En plan / Cerca / Fuera (hoy: lado favorable / ≤ 5 pts en contra / más) y dirección favorable de AP y Open PO's.
- Inventory: arriba del plan cuenta como favorable (decisión de Finanzas, 7-oct-2026); DIO y CCC siguen "menor es mejor".
- Si Metal Recon Billings cuenta dentro de Daily Sales.

## Fuentes de datos identificadas

| KPI | Fuente | Ubicación |
| --- | --- | --- |
| Daily Sales (Day / MTD / Budget MTD) | `SALT Daily Sales Report <mes>.xlsx` | hoja `Daily Sales Report.`, columnas F, G, J; Budget en Q4, días de venta en Q3 |
| Venta diaria promedio | mismo archivo | columna H "Average" |
| Inventory WIP + FG | `SALTILLO Phin90 - PACE SALTILLO <mmaaaa>.xlsm` | hoja por día de corte, columna R "Ext. Total Cost", fila de totales (WIP = subtotal) |
| DIO | calculado | inventario Phin90 / promedio diario de ventas |

Sin fuente todavía: Collections, AR Aging, AP Aging, Open PO's, inventario RM y planes de Inventory/DIO/DSO/DPO.
El mes es **fiscal** (octubre 2026 inicia el 28 de septiembre, 20 días de venta).
