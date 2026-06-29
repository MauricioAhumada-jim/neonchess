# ⚡ Guía de Configuración de Compras In-App (RevenueCat + Google Play)

Esta guía detalla los pasos necesarios para configurar y conectar los productos de pago integrado en la **Google Play Console** y el panel de **RevenueCat** para habilitar la suscripción Premium de por vida en **Neon Chess**.

---

## 📱 Paso 1: Configurar el Producto en Google Play Console

Para que los usuarios puedan realizar transacciones reales dentro de Android, debes dar de alta el producto en tu cuenta de desarrollador:

1. Ingresa a la [Google Play Console](https://play.google.com/console/) y selecciona tu aplicación **Neon Chess**.
2. En el menú lateral izquierdo, ve a la sección **Monetización** ➔ **Productos integrados en la aplicación** (In-app products).
3. Haz clic en el botón **Crear producto** (esquina superior derecha).
4. Configura los campos del producto exactamente con estos valores:
   - **ID de producto:** `neon_chess_premium_lifetime` *(Este ID es extremadamente crítico y debe coincidir exactamente en todos los paneles)*.
   - **Nombre de cara al público (Title):** `Neon Chess Premium - Lifetime Pass`.
   - **Descripción:** `Elimina toda la publicidad holográfica de por vida y desbloquea el flujo neural puro.`.
5. En la sección **Precio**, define la tarifa (por ejemplo, `$2.99 USD` o su equivalente local).
6. Presiona **Guardar** en la parte inferior.
7. **⚠️ MUY IMPORTANTE:** Una vez guardado, regresa a la lista de productos integrados, ubica el producto que acabas de crear y presiona el botón **Activar** en la parte superior derecha. Si no se activa, Google Play rechazará cualquier intento de pago.

---

## 🦊 Paso 2: Vincular Google Play con RevenueCat

RevenueCat requiere permisos de lectura/escritura en las APIs de Google Developer para validar los recibos de pago en tiempo real.

1. **Crear una Cuenta de Servicio (Service Account) en Google Cloud:**
   - Ve a la consola de Google Cloud linked a tu Google Play Console.
   - Crea una nueva cuenta de servicio con el rol **Administrador de aplicaciones financieras** o equivalente y genera una **clave privada en formato JSON**.
   - Descarga este archivo JSON de credenciales de forma segura.
2. **Conectar en RevenueCat:**
   - Inicia sesión en el panel de [RevenueCat](https://dashboard.revenuecat.com/).
   - Crea un nuevo proyecto (si no lo has hecho) y ve a **Project Settings** ➔ **Apps** ➔ **Add Android App**.
   - Introduce el Package Name de tu aplicación: `com.estampalos.neonchess`.
   - Sube el archivo **JSON de credenciales** que descargaste en el paso anterior. Esto habilitará la sincronización en segundo plano.

---

## 🛠️ Paso 3: Configurar Entitlements y Offerings en RevenueCat

Los derechos (Entitlements) y ofertas (Offerings) permiten desvincular el código fuente de los productos de las tiendas para realizar cambios de precios y paquetes dinámicamente en caliente.

### A. Crear el Entitlement (Derecho)
1. En el menú de RevenueCat, ve a **Entitlements** ➔ **New**.
2. Configura los valores:
   - **ID:** `premium` *(Debe ser exactamente en minúsculas para coincidir con la constante `ENTITLEMENT_ID` en `js/premium-service.js`)*.
   - **Description:** `Pase Premium sin Anuncios`.

### B. Registrar el Producto
1. Ve a **Products** ➔ **New**.
2. Selecciona **Play Store** como la tienda.
3. Introduce el ID del producto que creaste en la Play Console: `neon_chess_premium_lifetime`.
4. Vincula este producto al entitlement `premium` creado en el subpaso anterior.

### C. Crear el Offering y el Package
1. Ve a **Offerings** ➔ **New Offering**.
2. **ID:** `default` (o el nombre que prefieras).
3. Entra al Offering creado y presiona **New Package**.
4. Selecciona el tipo de paquete **Lifetime** (de por vida).
5. Asocia el producto `neon_chess_premium_lifetime` al paquete Lifetime que acabas de crear.

---

## 💻 Paso 4: Actualizar la API Key en el Código

Una vez configurado todo en el panel, debes actualizar la clave API pública de RevenueCat en el código del juego:

1. En el panel de RevenueCat, navega a **Project Settings** ➔ **API Keys**.
2. Copia tu **Public API Key** para Google Play.
3. Abre el archivo de configuración del juego en [js/premium-service.js](file:///c:/Users/yo/Desktop/deploy-695c24cf587043c10fc049bd/js/premium-service.js).
4. Reemplaza la clave de marcador de posición de la línea 9:
   ```javascript
   const GOOGLE_API_KEY = 'goog_placeholder_api_key_neon_chess'; 
   ```
   por tu clave real de RevenueCat:
   ```javascript
   const GOOGLE_API_KEY = 'goog_tu_clave_publica_real_de_revenuecat';
   ```
5. Guarda el archivo y compila nuevamente:
   ```powershell
   npm run build
   npx cap sync android
   ```

---

## 🧪 Pruebas locales y restablecimiento de estado simulado

Durante la etapa de desarrollo local o web, puedes resetear la simulación del estado Premium de forma instantánea usando la consola de desarrollador (F12) en tu navegador:

* **Para eliminar el Premium y ver los anuncios de nuevo:**
  ```javascript
  localStorage.removeItem('neon_premium_user');
  location.reload();
  ```
* **Para activar el Premium manualmente (Simular Compra):**
  Abre el Paywall en la aplicación, haz clic en **`ADQUIRIR ACCESO PREMIUM`** y la simulación guardará el estado en el almacenamiento interno de manera persistente.
