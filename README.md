# 🎵 downMusic

Aplicación móvil (React Native + **Expo SDK 57**) para **buscar y descargar audio de YouTube**, inspirada en servicios tipo y2mate, pero con un flujo transparente:

1. **Busca** canciones (o pega la URL de un video).
2. Elige formato de audio: **MP3 320 kbps**, **MP3 128 kbps** o **M4A**.
3. **Descarga** el archivo directamente al teléfono con barra de progreso pausable.
4. Guárdalo en la galería, compártelo o reprodúcelo desde tu **biblioteca local**.

## Arquitectura

```
downMusic/
├─ App.tsx                  # Navegación de pestañas + pantalla de descarga
├─ src/
│  ├─ api.ts                # Cliente del backend (base URL auto-detectada)
│  ├─ settings.tsx          # Configuración global (URL del servidor)
│  ├─ storage.ts            # Persistencia de la biblioteca (AsyncStorage + FileSystem)
│  ├─ theme.ts / utils.ts /
│  ├─ screens/              # Búsqueda, descarga, biblioteca y ajustes
└─ backend/
   └─ server.js             # Express + yt-dlp (extracción y conversión a MP3/M4A)
```

> **¿Por qué un backend?** En React Native no se puede ejecutar `yt-dlp` (ni descifrar los
> streams de YouTube). El backend hace la extracción/conversión (igual que y2mate) y la app
> solo descarga el archivo resultante.

## Requisitos

| Herramienta | Cómo instalarla |
|---|---|
| Node.js ≥ 22 | https://nodejs.org |
| Expo SDK 57 + CLI | ya incluido en el proyecto (`npx expo`) |
| `yt-dlp` | `brew install yt-dlp` (macOS) o `pip install yt-dlp` |
| `ffmpeg` | `brew install ffmpeg` (**necesario para convertir a MP3**) |

## Puesta en marcha

### 1) Arranca el backend

Asegúrate de que `yt-dlp` y `ffmpeg` están en tu `PATH`:

```bash
cd backend
npm install
npm start            # escucha en 0.0.0.0:4000
```

Prueba rápida:

```bash
curl "http://localhost:4000/api/health"
curl "http://localhost:4000/api/search?q=queen+bohemian+rhapsody"
```

### 2) Arranca la app

```bash
npm install
npx expo start       # escanea el QR con Expo Go o lanza simulador
```

La app **detecta automáticamente** la IP de tu ordenador (la de Metro) y apunta al backend
en el puerto `4000`. Si vas a probar en un dispositivo físico, usa la pestaña **Ajustes** →
*Probar conexión* y, si hace falta, corrige la URL (mismo Wi‑Fi obligatorio).

## API del backend

| Endpoint | Descripción |
|---|---|
| `GET /api/health` | Estado del servicio |
| `GET /api/search?q=...&limit=12` | Búsqueda de videos de YouTube |
| `GET /api/info?url=...` | Metadatos detallados de un video |
| `GET /api/download?url=...&format=mp3\|m4a&quality=320&title=...` | Streaming del audio (MP3 convertido o M4A nativo) |

Variables de entorno del backend: `PORT` (por defecto `4000`), `HOST`, `YTDLP_BIN`.

## Permisos y configuración nativa

- **Android**: `usesCleartextTraffic` y permisos de audio/galería ya configurados en `app.json`.
- **iOS**: excepción ATS para red local (`NSAllowsLocalNetworking`) en `app.json`.

Para una **build de desarrollo** (`npx expo run:android` / `run:ios`) la configuración se
aplica automáticamente vía config plugins. En *Expo Go* funciona directamente, sin compilar.

## Aviso legal

Las herramientas de descarga de YouTube pueden violar sus **términos de servicio** y las
**leyes de copyright** según el país y el contenido. Usa esta app únicamente con material que
tengas derecho a descargar: **dominio público, licencias libres (Creative Commons, etc.) o
contenido de tu propia autoría o con permiso del titular**. El responsable del uso es quien
la usa, no la herramienta.