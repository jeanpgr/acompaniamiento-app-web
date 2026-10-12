# Product

<!-- impeccable:product-schema 1 -->

> Inferido del código, CLAUDE.md y GUIA-IMPECCABLE-FRONTEND.md; supuestos confirmados por el equipo el 2026-09-27.

## Platform

web

## Users

- **Personal administrativo de la empresa de servicios para adultos mayores** ("gestor"). Trabaja en escritorio durante la jornada, con el panel abierto muchas horas seguidas. Su trabajo: dar de alta servicios y catálogo, asignar personal y vehículos a los agendamientos, seguir el estado de cada acompañamiento, gestionar la tienda (categorías, productos, cupones, ventas) y responder a la calidad del servicio (reseñas).
- Distintos roles con permisos por módulo (tabla `role`, JSONB de permisos). Los usuarios no son técnicos; son coordinadores operativos.

## Product Purpose

Panel de operación del Acompañamiento App: la contraparte administrativa de la app ServiMayor que usan los adultos mayores y sus familias. Éxito = que cada solicitud de un cliente quede atendida (asignada, en ruta, completada) sin errores de coordinación, y que el catálogo que ve el cliente esté siempre correcto.

## Operating Context

- Servicios: acompañamiento (con traslado), turismo, capacitación, guardería, y una tienda de productos.
- Flujo típico: el cliente agenda en la app → aparece "PENDIENTE" → el gestor asigna personal/vehículo → "EN CURSO" → "COMPLETADO" → reseña.
- Idioma de toda la interfaz: español (es-CO para fechas y moneda).
- Uso principal en monitores de escritorio/portátil; tablet ocasional.

## Capabilities and Constraints

- React 19 + Vite + Tailwind v4, sin librería de componentes externa; iconos `lucide-react`.
- Backend único `/api/v1`, sobre (`{ success, data }`) desenvuelto por el cliente axios.
- Módulos "Ajustes" y "Ayuda" aún no implementados (placeholders).
- No hay suite de pruebas; `pnpm build` es la verificación.

## Brand Commitments

- Nombre visible en el panel: **Acompáñame** (panel admin). La app cliente se llama **ServiMayor**. Son la misma empresa; ningún nombre debe cambiarse sin confirmación.
- Diseños de origen en Penpot; la paleta navy/naranja del panel es la identidad actual y se preserva.

## Evidence on Hand

- Datos reales vienen del backend (reseñas, servicios, agendamientos, ventas). No existen métricas publicables: el panel no debe mostrar cifras inventadas.

## Product Principles

1. **El estado de cada servicio se lee de un vistazo.** Pendiente / en curso / completado es la información más importante del panel.
2. **Nada destructivo sin una confirmación clara y reversible cuando sea posible.**
3. **Consistencia antes que novedad:** el mismo control se ve y se comporta igual en todos los módulos.
4. **Datos reales o estado vacío honesto**, nunca números de relleno.

## Accessibility & Inclusion

WCAG 2.2 AA: contraste, navegación completa por teclado, foco visible, etiquetas asociadas a los campos.
