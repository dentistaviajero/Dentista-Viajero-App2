# Dentista Viajero Clínica — Especificaciones funcionales acumuladas
Fecha de corte: 2026-11-13. Documento de diseño, NO implementación ni datos de pacientes.

## Infraestructura existente (pendiente de verificar despliegue)
GitHub dentistaviajero/Dentista-Viajero-App2 rama main; Cloudflare Worker dentista-viajero-clinica; D1 dv_clinica (conservar). ZIP anterior clinica-lista.zip, estructura raíz package.json, wrangler.jsonc, LEEME-INSTALAR.txt, migrations/0001_ampliacion.sql, public/styles.css, public/index.html, public/app.js, public/manifest.webmanifest, src/index.js. No reconstruir infraestructura. Acceso ADMIN_TOKEN propuesto, aún no implementado; no ingresar datos reales sin autorización funcional.

## Pantalla inicial
Portada Dentista Viajero con personajes oficiales Pippo, Peluche y Rumi. Cuatro botones: Pacientes, Escuelas, Respaldos, Saldos.

## Pacientes
Dentro de Pacientes: Buscar paciente y Nuevo registro. Buscar por nombre, folio o tutor y recuperar expediente. Posibilidad de eliminar con confirmación y respeto a retención legal; preferir baja lógica/archivo en vez de borrar historial. Estados: en tratamiento, pendiente de regresar, dado de alta. Seguimiento para recordatorio de tratamientos incompletos.

## Identificación
Folio secuencial automático con ceros iniciales 0001, 0002... no editable ni reutilizable. Nombre completo; fecha de nacimiento; edad calculada automáticamente en años y meses contra fecha actual (en bebés meses); padre/madre/tutor; parentesco; teléfono opcional; correo opcional; ciudad; colonia; médico pediatra o tratante. Contactabilidad: definir alternativa cuando no hay teléfono ni correo. Cómo conoció consultorio (selección múltiple): Facebook, Instagram, WhatsApp, recomendación, escuela, campaña de salud, evento, otro con texto. Escuela/campaña de contacto: texto.

## Historia clínica por paciente
Alertas visibles desde la ficha: alergias conocidas opcionales, clasificación verde (antecedente sin alerta destacada), amarillo (precaución), rojo (alerta clínica importante), asignación por profesional y no por palabra clave. Ejemplos de relevancia: anafilaxia, alergias medicamentosas, cardiopatías; condiciones neurodesarrollo registradas por adaptaciones requeridas sin alarma automática. Enfermedades importantes y antecedentes, medicamentos actuales, reacciones previas a anestesia/medicamentos/tratamientos, señales de alarma previas, texto.
Casillas múltiples antecedentes: sangrados frecuentes, epistaxis, asma, cirugías, convulsiones, diabetes, desmayos, problemas cardíacos, hospitalizaciones en cualquier época, dificultad respiratoria, otro con texto.
Patologías actuales o previas (multiselección): asma, varicela, sarampión, rubéola, viruela, paperas, diabetes, cardiopatías, neumonía, tuberculosis, dermatitis, otra con texto, observaciones.
Hábitos orales y hallazgos (multiselección): SRB respiración bucal, BX bruxismo, CL chupar labio, CD chupar dedo, frenillo corto, apoyar cara de un lado, mesiodens, hipoplasia molar, trastorno del sueño, manchas por temperaturas altas, observaciones.
Hábitos generales: deportes/actividad física texto; pasatiempos/hobbies/intereses texto; vitaminas/suplementos texto. Sueño multiselección: duerme bien, tranquilo, gira mucho en cama, ronca, despertares frecuentes, duerme con boca abierta, somnolencia diurna, otro con texto.
Higiene: técnica cepillado texto; frecuencia ocasional/1/2/3 veces al día; pasta dental texto; cantidad raspadita/arroz/chícharo/mucha; enjuague sí/no y frecuencia; hilo dental sí/no y frecuencia.
Nacimiento: fecha nacimiento y edad mostradas automáticamente desde ficha, sin duplicar captura; lugar nacimiento texto; médico o partera texto; vía de nacimiento vaginal/cesárea/instrumentado/otro; lugar domicilio/hospital o clínica/casa de partos/otro; semanas gestación numérico; observaciones texto.
Alimentación inicial: materna exclusiva/mixta/fórmula exclusiva; duración lactancia materna; duración fórmula; leche/fórmula; observaciones.
Motivo consulta: motivo principal con palabras del paciente o tutor; dolor sí/no; zona; desde cuándo; experiencias previas multiselección primera visita/positiva/negativa/miedo/tratamientos previos; observaciones.
Conducta por visita, dos registros separados al llegar y salir, llenados por profesional, multiselección: cooperador, tímido, ansioso, llanto, miedo, feliz, sonriente, quiere/no quiere regresar, saluda/no saluda, no interactúa, requiere adaptación conductual, otro; observaciones en cada fase. No sobrescribir consultas anteriores.
Riesgo caries bajo/medio/alto; riesgo ortopédico/respiratorio bajo/medio/alto; prioridades multiselección preventiva, restaurativa, dolor/urgencia, ortopedia, adaptación conductual, interconsulta médica; observaciones.
Notas de evolución por consulta: fecha, motivo, hallazgos/evolución, diagnóstico, procedimientos, indicaciones, próxima revisión, observaciones. Conservar cronología y trazabilidad de correcciones.

## Odontograma — parte de historia clínica individual
Orden vertical: permanente superior, temporal superior, temporal inferior, permanente inferior. Numeración FDI. Cada diente dibujado como círculo dividido en cuatro sectores periféricos (mesial, distal, vestibular, palatino/lingual) y centro oclusal; cada superficie seleccionable y coloreable independientemente. Esperar foto del odontograma impreso del usuario para reproducir disposición visual exacta.
Paleta: rojo caries; azul restauración previa (propia o ajena); amarillo lesión de mancha blanca; morado/rosa cálculo o sarro. Símbolos: X extraído, RR resto radicular (separar por valor clínico), MS mesiodens, HM hipoplasia molar, M manchas, otras malformaciones/hallazgos y notas por diente. Palomita verde para tratamiento realizado. Estados por tratamiento: pendiente, en proceso, terminado; preservar historial diagnóstico y de procedimientos.
Conexión odontograma→diagnóstico→plan de tratamiento→cotización→pagos→saldo. Caries sugiere resina/ionómero según criterio profesional; mancha blanca sugiere valorar remineralización, MI Paste Plus solo si clínicamente adecuado. No generar cobro irrevocable por hallazgo; profesional confirma procedimiento, precio y cantidad. Evitar duplicar cobro por múltiples superficies del mismo diente. Permitir agregar manualmente procedimientos y cotizaciones por número FDI. Registrar abonos y saldos por paciente.

## Escuelas
Registro de planteles y campañas; futuro tamizaje por alumno, escuela, grado y grupo, reportes y seguimiento; revisar más adelante.

## Respaldos
Exportación y restauración controlada, respaldos cifrados; verificar funcionamiento antes de uso real.

## Saldos
Módulo principal de saldos; saldo por paciente y cotización derivada del odontograma más procedimientos agregados manualmente; abonos, estados de cuenta y pendientes.

## Imprimibles (pendiente diseño detallado)
Historia clínica completa; notas de evolución individuales o cronológicas; receta con marca, nombre, cédula profesional, teléfono, fecha, paciente e indicaciones (datos profesionales por confirmar); consentimiento informado con procedimientos, riesgos, alternativas y firmas. Diseñar después de odontograma.

## Pendientes antes de modificar ZIP
Recibir imagen del odontograma de papel y revisar diagramación y símbolos. Revisar saldos, imprimibles, escuelas y restantes módulos. Confirmar precios, reglas de presupuestación, estados y seguridad ADMIN_TOKEN. No subir datos reales hasta probar permisos, persistencia, respaldos y restauración.
