# Executive Dashboard · Capital de Trabajo

Dashboard ejecutivo de Orion Castings (Saltillo) en carrusel, pensado para pantalla/TV, con tres vistas:

| Vista | KPIs |
| --- | --- |
| **Finanzas** | Collections, AR Aging, DSO, AP Aging, DPO |
| **Inventario** | Inventory (RM + WIP + FG), DIO, CCC |
| **Ventas** | Daily Sales, Open PO's |

Cada KPI muestra MTD, Day, Plan y % vs Plan, con estado **En plan / Cerca del plan / Fuera de plan**.

> **Todos los datos son simulados** (`src/data/mock.ts`). Para conectar datos reales, reemplazar
> `getFinanceDashboard` por una consulta que regrese la misma forma `FinanceDashboard`.
> Las fórmulas y reglas están en `src/domain/kpis.ts`.

## Uso

```bash
pnpm install
pnpm dev        # http://localhost:3100
pnpm test
pnpm typecheck
```

- Rota cada 20 s; se pausa con el mouse encima, con foco de teclado o con el botón de pausa. ← / → cambian de vista.
- `?vista=finanzas | inventario | ventas` abre una vista específica (útil para fijar una pantalla).
- En WSL con el repo en `/mnt/c`, el servidor de desarrollo no siempre detecta cambios: reiniciar `pnpm dev`.

## Fórmulas

- DSO = AR / venta diaria promedio
- DIO = inventario total (RM + WIP + FG) / venta diaria promedio
- CCC = DSO + DIO − DPO
- % vs Plan = MTD / Plan

## Reglas pendientes de confirmar

- Ventana de la venta diaria promedio (mes fiscal en curso, 30/90 días; días hábiles o naturales).
- Denominador del DPO (compras o costo de ventas).
- MTD de saldos: promedio del mes vs. cierre.
- Umbrales En plan / Cerca / Fuera (hoy: lado favorable / ≤ 5 pts en contra / más) y dirección favorable de AP y Open PO's.
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
