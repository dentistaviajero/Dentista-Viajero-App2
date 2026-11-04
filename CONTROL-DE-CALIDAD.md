# Lista de aceptación antes de uso clínico real

- [ ] D1 existente conectada mediante `DB`.
- [ ] Migración aplicada y todas las tablas presentes.
- [ ] `BOOTSTRAP_SECRET` configurado como secreto, no variable pública.
- [ ] Registro de Passkey probado en Android con verificación local.
- [ ] Acceso a `/api/pacientes` sin sesión devuelve 401.
- [ ] POST desde origen no autorizado devuelve 403.
- [ ] Sesión revocada al cerrar sesión.
- [ ] Bloqueo por intentos excesivos verificado.
- [ ] Prueba con registros ficticios: crear, leer y editar paciente.
- [ ] Historia clínica guardada y consultada correctamente.
- [ ] Toque doble del odontograma desactiva el hallazgo y conserva trazabilidad.
- [ ] Respaldo cifrado descargado, descifrado y restaurado en base de ensayo vacía.
- [ ] Recuperación de Passkey/dispositivo perdida definida.
- [ ] Políticas de privacidad, consentimiento y obligaciones de expediente clínico revisadas.
- [ ] Evaluación de riesgos y control de acceso terminados.
- [ ] Política de respaldos periódicos independientes implementada.
- [ ] Auditoría de seguridad externa o revisión técnica equivalente completada.
