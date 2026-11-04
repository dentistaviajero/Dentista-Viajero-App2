
Publicación inicial v1.0.0.

**Proyecto real para Cloudflare Workers + D1, no una maqueta visual.** Contiene código ejecutable para pacientes, historia clínica, consultas, odontograma táctil, escuelas, pagos, inicio de sesión con Passkeys y respaldos cifrados. La publicación por sí sola NO habilita su uso con pacientes reales. Primero deben completarse y documentarse las pruebas de seguridad, privacidad, respaldo, restauración y cumplimiento.

## Infraestructura existente que reutiliza

- Worker: `dentista-viajero-clinica`.
- D1: `dv_clinica`.
- Enlace de D1: `DB`.
- Tablas existentes: `pacientes`, `consultas`, `odontograma_hallazgos`, `historias_clinicas`.

**No borres las cuatro tablas existentes.** La migración `0001_ampliacion.sql` añade tablas sin destruirlas.

## Lo que incluye

- Autenticación WebAuthn / Passkeys del celular, validada en el servidor mediante `@simplewebauthn/server`.
- Sesión con cookie `HttpOnly`, `Secure`, `SameSite=Strict`, caducidad de 7 días; comprobación de origen en cambios de datos.
- Alta inicial del administrador protegida por `BOOTSTRAP_SECRET`, que se configura como secreto del Worker, nunca en GitHub ni en el ZIP.
- Pacientes, consultas, historia clínica, odontograma temporal táctil, escuelas y pagos.
- Exportación JSON, CSV y respaldo cifrado AES-256-GCM mediante una contraseña local.
- Importación JSON o respaldo cifrado **solo si la base de pacientes está vacía**, para evitar sobreescrituras peligrosas.
- Registro de auditoría de cambios y acceso.

## Límites que aún requieren actualización

- El odontograma incluye dentición temporal y permanente con botones por superficie; faltan gráficos anatómicos y periodontograma.
- La historia clínica incluye casillas rápidas y campos libres; faltan algunos formularios especializados y lógica condicional por edad.
- Escuelas: registro de planteles; el formulario de tamizajes masivos y estadísticas requiere una actualización.
- Pagos: registro de abonos; faltan planes de ortopedia, recibos y facturación.
- Los archivos adjuntos y radiografías requieren R2 privado y controles adicionales.
- No hay copias automáticas programadas todavía; las descargas son manuales.
- No hay acceso sin conexión ni sincronización offline.
- La creación de una segunda cuenta profesional requiere ampliar la interfaz de administración y las políticas de autorización. Por ahora esta versión registra la cuenta inicial del dentista y sus Passkeys. La futura app de partería tendrá base separada.
- El almacenamiento de historias clínicas requiere evaluación legal y técnica de privacidad, consentimientos, retención y seguridad antes de producción.

## Instalación sin escribir código a mano

**Advertencia:** Cloudflare Workers no instala este proyecto completo con solo subir un ZIP a la sección de Pages. El ZIP es el código fuente listo para desplegar mediante un repositorio conectado a Workers, o con Wrangler. Desde un celular, el camino más práctico es GitHub conectado a Cloudflare. Se requiere una configuración inicial en el panel.

1. Extrae el ZIP en tu teléfono (Android > Archivos > Extraer).
2. Crea un repositorio **privado** nuevo en GitHub, por ejemplo `dentista-viajero-clinica-2` (no uses el repo de la aplicación anterior).
3. Sube el contenido de la carpeta extraída, **no el ZIP sin extraer**. Conserva las carpetas `src`, `public`, `migrations` y los archivos `package.json` y `wrangler.jsonc`.
4. En Cloudflare > D1 > `dv_clinica` > Configuración, copia el **ID de la base de datos** (UUID).
5. Edita el archivo `wrangler.jsonc` en GitHub: sustituye `REEMPLAZAR_POR_ID_DE_D1` por ese UUID. No cambies el nombre `DB`.
6. En Cloudflare > Workers y Pages > Worker `dentista-viajero-clinica`, configura la integración de GitHub / compilación. Usa este repositorio y el comando de compilación `npm install && npx wrangler d1 migrations apply dv_clinica --remote && npx wrangler deploy`. Si la interfaz de Cloudflare no permite integrar un repositorio al Worker ya creado, **no crees un Worker público duplicado sin revisar**: solicita ayuda para elegir la vía de despliegue correcta.
7. En el Worker > Configuración > Variables y secretos, agrega el secreto `BOOTSTRAP_SECRET` con una contraseña aleatoria de 24 o más caracteres. No la envíes por chat ni la guardes en GitHub. Debe estar configurada antes de registrar el primer dispositivo.
8. Verifica que el Worker siga teniendo el enlace D1 `DB`, que la URL es la misma y que no hay datos reales.
9. Abre la URL desde tu celular, introduce la clave de instalación una sola vez y registra la Passkey. Luego cierra sesión y verifica que no se puede acceder a `/api/pacientes` sin autenticación.
10. Crea un paciente **ficticio**, una consulta, un hallazgo de odontograma y un respaldo cifrado. Prueba restauración en una base de ensayo independiente antes de cualquier uso real.

La integración de compilación y despliegue de Cloudflare cambia según la interfaz y el tipo de proyecto. El paso 6 se deberá verificar en el panel antes de aplicarlo.

## Seguridad operativa

- No uses datos reales hasta que la autenticación, permisos, auditoría, respaldo y restauración estén validados.
- No compartas la clave de instalación. Una vez registrado el administrador, las solicitudes de registro adicionales requieren una sesión administrativa.
- Las Passkeys pueden sincronizarse entre dispositivos mediante el proveedor del teléfono; **no garantizan por sí solas que solo un dispositivo físico pueda entrar**.
- No pierdas la clave del respaldo cifrado: no existe mecanismo para recuperarla.
- No compartas respaldos JSON o CSV sin cifrar.
- La aplicación usa servicios gratuitos de Cloudflare, pero el despliegue y las cuotas dependen de las condiciones vigentes.

## Actualizaciones

Incrementa `version` en `package.json`, agrega migraciones SQL nuevas sin borrar las existentes y conserva respaldos antes de cada despliegue. No hagas cambios manuales en `worker.js` del panel cuando el repositorio se convierta en fuente de verdad.
