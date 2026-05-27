# TFG

Proyecto con frontend Expo y backend Node/Express.

## Estructura

- `./` frontend Expo
- `./backend/` backend Express + MongoDB

## Credenciales demo

Solo para pruebas locales o demo. Estas cuentas se crean con el script de seed:

- Cliente
  - `cliente@constructplus.local`
  - `Demo1234`
- Capataz
  - `capataz@constructplus.local`
  - `Demo1234`
- Empleado
  - `empleado@constructplus.local`
  - `Demo1234`

## Variables de entorno backend

Usa `backend/.env.example` como referencia.

Ejemplo:

```env
PORT=3000
HOST=0.0.0.0
MONGODB_URI=mongodb://127.0.0.1:27017/tfg
JWT_SECRET=desarrollo_super_secreto
UPLOAD_DIR=./uploads
```

## Variables de entorno frontend

Usa `.env.example` en la raiz como referencia.

Ejemplo:

```env
EXPO_PUBLIC_API_URL=https://tu-backend.onrender.com
```

## Notas

- No se sube `backend/.env` real.
- No se suben archivos reales de `uploads/`, solo `backend/uploads/.gitkeep`.
- El frontend no debe apuntar a una IP local fija en despliegue. Usa `EXPO_PUBLIC_API_URL`.
- Si despliegas en Render y quieres conservar imagenes subidas, necesitas un disco persistente o mover esos archivos a almacenamiento externo.

## Puesta en marcha

### 1. Requisitos

- Node.js
- MongoDB local corriendo en `mongodb://127.0.0.1:27017/tfg`

### 2. Instalar dependencias

Desde la raiz del repo:

```bash
npm install
npm --prefix backend install
```

O con el script:

```bash
npm run setup
```

### 3. Configurar el backend

Crear `backend/.env` a partir de `backend/.env.example`.

Ejemplo minimo:

```env
PORT=3000
HOST=0.0.0.0
MONGODB_URI=mongodb://127.0.0.1:27017/tfg
JWT_SECRET=desarrollo_super_secreto
```

### 4. Cargar datos demo

```bash
npm run backend:seed
```

Esto crea:

- usuarios demo
- proyecto demo
- tareas demo
- materiales demo
- presupuestos demo
- factura demo

### 5. Arrancar backend y frontend

Backend:

```bash
npm run backend:start
```

Frontend Expo:

```bash
npm start
```

### 6. Probar en el movil

- Abrir Expo Go
- Escanear el QR de `npm start`
- Iniciar sesion con cualquiera de las cuentas demo

## Scripts utiles

- `npm run setup`
- `npm run backend:start`
- `npm run backend:dev`
- `npm run backend:seed`
- `npm start`
