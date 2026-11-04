# Dentista Viajero Clínica 1.0.1

**Acceso sin contraseña propia:** requiere Cloudflare Access configurado en el Worker para los dos correos autorizados. No es seguro usar esta versión con expedientes reales hasta que Access esté configurado y probado.

1. Sustituir en GitHub los archivos del ZIP (mantener el mismo Worker y base D1).
2. En Cloudflare Zero Trust > Access > Applications, crear aplicación para la dirección del Worker. Política ALLOW con emails `dentistaviajero@gmail.com` y `parteraviajera@gmail.com`. Autenticación por código de un solo uso al correo. Asegurar que toda la ruta `/*` queda protegida y no hay rutas alternativas públicas.
3. En la aplicación de Access copiar Application AUD Tag. En el Worker > Variables y secretos configurar `ACCESS_AUD` con ese valor y `ACCESS_TEAM_DOMAIN` con el dominio de equipo (ejemplo `mi-equipo.cloudflareaccess.com`, sin https).
4. Ejecutar una vez las migraciones de D1 existentes: `npx wrangler d1 migrations apply dv_clinica --remote` (comprobar que la base es la correcta). Esto habilita escuelas y pagos.
5. Desplegar `npx wrangler deploy`. Comprobar que un navegador sin sesión no puede abrir `/` ni `/api/pacientes`; probar ambas cuentas autorizadas y una no autorizada antes de guardar datos reales.

La clave BOOTSTRAP_SECRET deja de usarse. El acceso lo controla Cloudflare Access, y el Worker además verifica la firma del JWT y limita el correo a las dos cuentas. No compartir expedientes ni usar sin configurar Access.
