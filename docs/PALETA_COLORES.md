# 🎨 Paleta de Colores — polaria.tech

Sistema visual **minimalista y de alto contraste**: base oscura casi negra, acento teal/cian de marca, y texto en blanco cálido. Todo se construye con 3 colores base más sus variantes de opacidad.

---

## Colores Principales (CSS Variables)

| Variable | Valor | Descripción | Uso |
|---|---|---|---|
| `--bg` | `#020609` | Casi negro azulado | Fondo principal |
| `--teal` | `#00e5cc` | Verde-teal brillante | Acento principal, textos destacados, barras |
| `--w` | `#f8f8f6` | Blanco cálido | Texto principal |

---

## Variantes con Opacidad (RGBA)

| Variable | Valor | Opacidad | Uso |
|---|---|---|---|
| `--t20` | `rgba(0, 229, 204, 0.20)` | 20% | Bordes, líneas decorativas |
| `--t08` | `rgba(0, 229, 204, 0.08)` | 8% | Fondos sutiles de tarjetas |
| `--w50` | `rgba(248, 248, 246, 0.50)` | 50% | Texto secundario / subtítulos |
| `--w20` | `rgba(248, 248, 246, 0.20)` | 20% | Texto terciario / labels inactivos |
| `--w08` | `rgba(248, 248, 246, 0.08)` | 8% | Separadores / bordes muy sutiles |

---

## Colores de Efectos y Gradientes

| Color | Valor | Uso |
|---|---|---|
| Negro puro | `#000` | Barras superior e inferior |
| Teal oscuro | `rgba(0, 165, 145, 0.24)` | Aurora animada — luz izquierda |
| Azul medio | `rgba(0, 85, 200, 0.17)` | Aurora animada — luz derecha |
| Azul profundo | `rgba(0, 45, 125, 0.13)` | Aurora animada — parte inferior |
| Teal glow | `rgba(0, 229, 204, 0.20)` | Drop-shadow del logo |
| Teal glow fuerte | `rgba(0, 229, 204, 0.35)` | Drop-shadow del copo de nieve |

---

## Gradiente del Texto Estadístico

```css
linear-gradient(135deg, #00e5cc 0%, rgba(0, 210, 250, 0.85) 100%)
```

Transición del verde-teal al azul-cian.

---

## Resumen Visual

La paleta combina:

- **Base oscura** (`#020609`) — fondo casi negro azulado.
- **Acento teal/cian** (`#00e5cc`) — color de marca para destacados y barras.
- **Blanco cálido** (`#f8f8f6`) — texto principal.

El resto del sistema deriva de estos 3 colores mediante variaciones de opacidad, manteniendo coherencia y alto contraste en toda la interfaz.
