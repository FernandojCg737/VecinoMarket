# CU08: sugerencia de categorías con CLIP de Replicate

## Modelo y configuración

El backend utiliza [cjwbw/clip-vit-large-patch14](https://replicate.com/cjwbw/clip-vit-large-patch14), fijado a la versión `566ab1f111e526640c5154e712d4d54961414278f89d36590f1425badc763ecb`. No requiere el servicio ni un token de Hugging Face, ni instalar un SDK nuevo: utiliza `requests`, ya incluido en el proyecto.

`REPLICATE_API_TOKEN` debe configurarse exclusivamente en el backend:

- Local: `Backend/.env`, que está excluido de Git.
- Producción: **Render → servicio del backend → Environment → REPLICATE_API_TOKEN**. Copiar allí el valor privado de `.env` antes del despliegue. Publicar el código no publica esa credencial.
- `Backend/render.yaml` declara la variable como `sync: false`. Si el servicio existente no se administra mediante Blueprint, agregarla manualmente en Environment.
- Vercel no necesita el token ni nuevas variables. Supabase no necesita migraciones para este cambio.

La configuración anterior `HUGGINGFACE_API_TOKEN` ya no se consulta. Puede eliminarse del entorno del servicio cuando se active esta versión.

## Flujo y contrato de la API

1. La empresa o el administrador guarda un producto y sube al menos una foto. Al editarlo, pulsa **Sugerir categoría con IA**. Para empresas, el plan debe incluir IA y el usuario debe tener permiso de gestionar productos.
2. Las vistas existentes comprueban los permisos y el tenant, eligen la primera imagen y consultan las categorías activas. La foto debe tener una URL pública accesible para Replicate, como las imágenes de Cloudinary del proyecto.
3. `apps/catalogo/ia.py` envía la URL y un descriptor por categoría a `POST https://api.replicate.com/v1/predictions`. Los descriptores de las diez categorías actuales están en inglés porque este modelo CLIP trabaja en ese idioma. Se seleccionan por nombre normalizado, sin depender de los IDs de Supabase.
4. Replicate devuelve una puntuación por descriptor, en el mismo orden de entrada. El backend conserva la asociación con cada instancia real de `Categoria` y devuelve la de mayor afinidad y hasta cinco alternativas en español.
5. La respuesta mantiene `categoria_sugerida`, `confianza` y `alternativas`; se conserva el registro en `CategorizacionIALog` y en la bitácora. No cambia automáticamente el producto. El botón **Usar** selecciona la categoría y el usuario guarda el formulario.

Las rutas continúan siendo:

- Administrador: `POST /api/catalogo/admin/productos/<id>/sugerir-categoria/`.
- Empresa/empleado autorizado: `POST /api/catalogo/mis-productos/<id>/sugerir-categoria/`.

El campo histórico `confianza` contiene afinidad relativa (puntuación de CLIP × 100); el frontend la presenta como **afinidad**. No es una probabilidad de acierto. CLIP siempre compara las opciones enviadas: incluso una foto ajena al catálogo puede tener una opción ganadora. La revisión humana sigue siendo necesaria.

Para categorías nuevas se utiliza el nombre y la descripción, limpiando el separador `|`. Conviene agregar un descriptor breve en inglés a `DESCRIPTORES` o una descripción breve en inglés a la categoría. Las categorías actuales ya están cubiertas; no se requiere modificar sus datos.

## Tiempo, saldo y repetición de consultas

- Una consulta crea una sola predicción. La creación no se reintenta automáticamente para evitar cobros duplicados.
- Se espera hasta 10 segundos en la creación y se consulta el mismo ID si sigue procesando. El análisis tiene un límite de 60 segundos, con `Cancel-After` y cancelación explícita cuando se conoce el ID. Los tiempos de conexión y de cancelación pueden añadir unos segundos. El frontend espera hasta 90 segundos.
- Los resultados válidos se guardan una hora en el caché de Django. La clave incluye versión, URL, IDs, nombres y descriptores. Cambiar la foto (URL/versionado) o las opciones invalida el resultado. No sobrescribir una imagen conservando exactamente la misma URL si se necesita un análisis nuevo inmediato.
- Una marca temporal impide duplicar una consulta simultánea al mismo caché. Con el caché predeterminado en memoria, ambos mecanismos son por proceso y se pierden al reiniciar; no garantizan ahorro compartido entre múltiples workers.
- Token inválido, saldo insuficiente, límite de solicitudes, fallos del modelo y errores de red producen mensajes controlados. No se exponen tokens ni los logs del proveedor. Las vistas conservan el HTTP 502 existente para errores de este servicio.
- Las cuentas con poco saldo pueden tener límites más estrictos. Ante un error de límite, esperar antes de volver a pulsar el botón. Ver [límites oficiales](https://replicate.com/docs/topics/predictions/rate-limits).

## Validación

Las pruebas de `apps/catalogo/tests/test_ia.py` simulan el proveedor y no consumen saldo. Cubren asociación de puntuaciones y categorías, caché, concurrencia, datos inválidos, errores del proveedor, polling y cancelación. En un entorno de desarrollo con las dependencias del proyecto:

```bash
python manage.py test apps.catalogo.tests.test_ia
```

Validación realizada el 8 de octubre de 2026:

- 18 pruebas automatizadas aprobadas en un entorno aislado de Django 5.0.14, sin conexión a la base de datos ni llamadas al proveedor.
- Compilación del frontend actual con Vite 8.2.2 aprobada; solo aparece el aviso de tamaño de chunks de la aplicación.
- Dos inferencias reales mediante la función nueva `sugerir_categoria`, con las diez categorías actuales y el token local:

| Imagen del catálogo | Categoría esperada y obtenida | Afinidad | Tiempo de consulta |
| --- | --- | --- | --- |
| Candado de seguridad reforzado | Ferretería | 99,86 % | 2,16 s |
| Torta de chocolate (porción familiar) | Panadería y repostería | 95,07 % | 1,47 s |

Repetir ambas consultas dentro del mismo proceso recuperó sus resultados desde caché, sin crear otras predicciones. Solo se crearon dos predicciones para esta validación; no se modificaron productos ni la base de datos de producción. Los porcentajes y tiempos de estas dos fotos no garantizan precisión ni latencia para todas las imágenes. La verificación a través de la web oficial queda para después del despliegue y la configuración del token en Render.
