# Diagnóstico y corrección de la restauración de respaldos

Fecha: 8 de octubre de 2026. Código de backup de referencia: GitHub `96c3cb3`; copia local alineada con `afb4bee`.
Destino de la corrección: frontend en Vercel, backend en Render y PostgreSQL en Supabase.

La restauración original se reprodujo con un respaldo real en una base aislada. Falló por una clave duplicada de `auditoria_logauditoria`, después de 9.827 consultas. La corrección cargó los 4.772 registros del archivo, conservando todos sus campos, con 324 consultas. No se ejecutaron restauraciones, migraciones ni escrituras en Supabase durante el diagnóstico.

## Qué contiene el JSON

El botón Descargar backup llama a `GET /api/core/backup/`. [BackupView](../Backend/apps/core/views.py) obtiene el contenido de [generar_backup_json](../Backend/apps/core/backup.py), que utiliza `dumpdata` de Django.

Cada elemento de la lista contiene `model`, `fields` y, cuando corresponde, `pk`. Se incluyen los datos de las aplicaciones del negocio: usuarios y sus roles, empresas, empleados, compradores, direcciones, catálogo, imágenes, inventario, carritos, compras, pagos, pedidos, entregas, chat, promociones, transmisiones, valoraciones, recomendaciones, auditoría, notificaciones, planes, suscripciones, facturas, comisiones e historial/configuración de respaldos.

En usuarios se incluye el hash de la contraseña, no su contraseña en texto plano. Los usuarios y grupos pueden identificarse por claves naturales —correo y nombre, respectivamente— en lugar de incluir una PK; las referencias a ellos también pueden usar esas claves. Es el comportamiento de `natural_foreign=True` y `natural_primary=True`. [Documentación oficial de Django](https://docs.djangoproject.com/en/5.0/ref/django-admin/#dumpdata).

No se incluyen sesiones, tokens JWT de la lista negra, permisos internos `auth.permission`, contenttypes ni el historial del administrador de Django. Sus exclusiones están en `_APPS_EXCLUIR`. Sí pueden incluirse los grupos de Django y las relaciones de usuarios con grupos/permisos.

Las imágenes, comprobantes, archivos y respaldos en Cloudinary se guardan como referencias de sus campos. El JSON no contiene los binarios de las fotos, las credenciales de `.env`, el esquema SQL, las funciones/triggers de PostgreSQL ni las migraciones. Para usarlo en otra base debe existir primero el esquema compatible creado por las migraciones. El JSON contiene datos personales y hashes de contraseña; debe tratarse como un archivo privado.

En el archivo real analizado había 4.772 registros y 3.589.887 bytes. Incluía 54 usuarios, 14 empresas, 22 productos, 25 imágenes de producto, 83 pedidos y 3.644 registros de auditoría, entre otros. Son las cantidades de esa instantánea; no deben interpretarse como las cantidades actuales de toda la base.

Tras generar el JSON, el endpoint registra la descarga en auditoría y guarda una copia en Cloudinary mediante `BackupLog`. Esas dos nuevas filas se crean después de obtener el contenido del archivo, por lo que no forman parte del mismo respaldo recién generado.

## Cómo funcionaba la carga y por qué fallaba

El frontend [Backup.jsx](../Frontend/frontend_web/src/pages/admin/Backup.jsx) enviaba el archivo con `FormData` a `POST /api/core/restore/`. [RestoreView](../Backend/apps/core/views.py) recibía `request.FILES['archivo']`; la implementación anterior escribía un archivo temporal y ejecutaba `loaddata` dentro de una transacción.

`loaddata` resuelve referencias y guarda cada objeto. Sus guardados raw no llaman al `save()` personalizado del modelo, pero las operaciones SQL siguen activando los triggers de PostgreSQL. [Documentación de fixtures de Django](https://docs.djangoproject.com/en/5.0/ref/django-admin/#loaddata), [documentación de triggers de PostgreSQL](https://www.postgresql.org/docs/current/sql-createtrigger.html).

Las inserciones/actualizaciones de datos comerciales disparaban `fn_auditoria_generica`; otros triggers podían cambiar fechas, estados de productos o crear referidos/comisiones/facturas. Además de alterar la instantánea, esos efectos creaban entradas nuevas de auditoría durante la carga. La inserción de IDs explícitos del JSON no avanzaba inmediatamente la secuencia de auditoría: su reajuste quedaba para el final de `loaddata`. Una escritura posterior del trigger intentaba utilizar un ID ya cargado del respaldo y fallaba con SQLSTATE `23505`, restricción `auditoria_logauditoria_pkey`.

La transacción se revertía, explicando que después de la espera no quedaran aplicados los datos. La prueba original hizo 9.827 consultas antes de fallar; la latencia entre Render y Supabase amplifica esa cantidad de viajes a la base. Se verificó en modo de solo lectura que la conexión de origen tenía `statement_timeout=2min` y 54 triggers de usuario. Ese timeout es por consulta, no por la duración completa del HTTP; no se atribuye a él, sin logs del intento, el error observado por otras personas.

## Corrección

- `backup.py` valida la lista, los modelos, campos e identificadores antes de cargar. El tamaño máximo predeterminado es 64 MiB, configurable mediante el setting `BACKUP_MAX_BYTES`.
- Guarda lotes de hasta 250 objetos con `INSERT ... ON CONFLICT` por PK. Usa el compilador de inserciones raw de Django 5.0 para conservar las fechas `auto_now` del archivo y evitar subidas nuevas de imágenes.
- Resuelve y reutiliza cada clave natural por correo/grupo/permisos, evitando repetir la misma consulta para cientos de entradas de auditoría. Restaura también las relaciones M2M automáticas.
- La nueva [migración 0005_contexto_restauracion](../Backend/apps/core/migrations/0005_contexto_restauracion.py) adapta diez funciones de triggers del proyecto. Durante la transacción marcada con `vecinomarket.restoring=on`, omiten únicamente sus efectos de negocio. No se usa `session_replication_role`, ni se desactivan triggers de claves foráneas.
- Un cerrojo transaccional evita restauraciones simultáneas. Se pausan las escrituras de las tablas afectadas en orden fijo, con espera máxima de cinco segundos por bloqueo; las lecturas permanecen disponibles. Esto protege los datos y las secuencias frente a escritores concurrentes. [Modos de bloqueo de PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html).
- Las claves foráneas se comprueban antes de confirmar. Se reajustan las secuencias, se restaura el contexto de la conexión y se devuelve el número de registros cargados.
- La carga y el registro `RESTORE_SISTEMA` están en una misma transacción. Un error revierte los cambios. La API distingue archivo inválido, restauración ya en curso, migración pendiente y bloqueo/timeout de la base; no expone valores de filas en los mensajes de error.
- El frontend muestra el resultado, actualiza el historial e impide descargar/restaurar simultáneamente. Espera hasta 120 segundos y, ante pérdida de conexión, informa que debe comprobarse la bitácora antes de repetir, porque perder la respuesta no prueba que la operación haya fallado.

La restauración mantiene el comportamiento anunciado en la interfaz: agrega o actualiza; no elimina filas ausentes del JSON. No se ejecuta `flush`.

## Verificación y límites

| Prueba con el mismo JSON real | Original | Corregida |
|---|---:|---:|
| Registros en el archivo | 4.772 | 4.772 |
| Consultas durante la carga | 9.827 | 324 |
| Resultado | Error de PK de auditoría; rollback | Carga completada |
| Campos distintos del JSON tras cargar | No completó | 0 |
| Entradas de auditoría restauradas | No completó | 3.644, sin entradas generadas por triggers |

Los tiempos locales fueron aproximadamente 4,75 s hasta el fallo original y 1,05–1,13 s para la carga corregida. No son una estimación del tiempo real de Render/Supabase. También se repitió la restauración del JSON completo sobre los datos ya cargados: completó correctamente, conservó todos los campos y no generó auditoría secundaria.

La colisión de PK se reprodujo al cargar una base vacía. Sin los logs del intento específico de producción no se afirma que ese sea el único motivo de su fallo; se corrigieron tanto ese defecto verificable como el volumen de consultas y los efectos secundarios de los triggers.

Se verificaron 14 casos de regresión en [test_backup.py](../Backend/apps/core/tests/test_backup.py): lotes, caché de referencias, contraseñas, conservación de filas adicionales, ausencia de auditoría secundaria, rollback por FK inválida, reajuste de secuencias, grupos/M2M con claves naturales, JSON/IDs inválidos, exclusión de restauraciones simultáneas, contexto exclusivo de la transacción, funcionamiento normal del trigger de fecha, reversibilidad de la migración, permisos de la API, respuesta ante JSON inválido y rollback si falla la auditoría final. También se comprobó la migración sobre copias de las diez definiciones reales de funciones de Supabase: es idempotente y su reversión devuelve las definiciones originales. El grafo de migraciones es válido y la compilación del frontend pasó.

El laboratorio utilizó PostgreSQL 18 y el código/modelos reales. Windows no dispone aquí de GDAL/PostGIS, por lo que únicamente los campos PointField se representaron como texto WKT para las pruebas. La validación geométrica y ejecución con PostGIS real no se probaron en este laboratorio. La API pública de producción no se usó para restaurar datos.

## Despliegue

La corrección está en la copia local basada en `afb4bee`. Durante el trabajo apareció ese nuevo commit, relativo a los correos de suscripciones, y se incorporó sin alterar el arreglo de backups. Se preservaron los cambios anteriores de `.gitignore` y del móvil, que no forman parte de este arreglo. No se hicieron commits ni push.

Al desplegar el backend en Render se debe aplicar `core.0005_contexto_restauracion`. El `Backend/start.sh` actual ya ejecuta `python manage.py migrate --noinput` antes de iniciar Daphne. Si el servicio usa otro comando de inicio, debe incluir ese paso. El frontend se publica mediante el despliegue habitual de Vercel. No hacen falta variables nuevas obligatorias.

Para ejecutar las pruebas en un entorno del proyecto con PostgreSQL/PostGIS dedicado a pruebas:

```powershell
cd "C:\SINSTEMA INFORMACION 2\VecinoMarket\Backend"
python manage.py test apps.core.tests.test_backup
```

La cuenta de la base debe poder crear la base de pruebas. Las pruebas de Django se ejecutan sobre su base de pruebas, no mediante el endpoint público de restauración.
