# Consultas sintéticas para los reportes de VecinoMarket

El asistente de CU18 y CU19 clasifica preguntas en español. A partir del tipo de reporte y de las fechas interpretadas por Django, consulta la base de VecinoMarket con los permisos del usuario. El clasificador se ejecuta en el backend local con un archivo de parámetros JSON. La voz usa el reconocimiento del navegador y entrega su transcripción al mismo flujo que la entrada escrita.

## Datos

| Archivo | Filas | Uso |
| --- | ---: | --- |
| entrenamiento.csv | 7.098 | Ajuste del vectorizador TF-IDF y de la regresión logística |
| validacion.csv | 520 | Selección del umbral y el margen de clasificación |
| prueba.csv | 520 | Evaluación con familias de frases separadas |
| metricas.json | | Resultado de la evaluación y huella SHA-256 del modelo |

Cada fila contiene el texto, la intención, la familia de frases y el origen sintético. Las variaciones combinan formulaciones redactadas manualmente, prefijos conversacionales y periodos. El corpus contiene 12 intenciones de reportes y una clase de consultas fuera de alcance. La familia base permanece en una sola partición. El modelo no se entrenó con registros, ventas ni conversaciones reales.

## Reentrenar

Desde la raíz de VecinoMarket, con Python 3.12:

```powershell
python -m pip install -r DATOS_MACHINE_LEARNING/requirements.txt
python DATOS_MACHINE_LEARNING/entrenar.py
```

El script genera los CSV, entrena el modelo y comprueba que la inferencia en Django reproduce las puntuaciones de scikit-learn. Exporta los parámetros a `Backend/apps/reportes/modelo_reportes.json` y escribe las métricas en esta carpeta. El servidor solo necesita sus dependencias habituales porque carga los pesos desde JSON.

## Usar el asistente

En el dashboard administrativo o en los reportes personalizados, **Machine Learning** cambia el motor para la siguiente consulta escrita o por voz. El botón se puede pulsar otra vez para volver al asistente de reglas. Por ejemplo, «Ventas de ayer» selecciona el reporte de ventas y aplica el periodo de ayer en la zona horaria de la aplicación. Una consulta ambigua o ajena a los reportes puede pedir una reformulación.

La precisión indicada en `metricas.json` corresponde a las frases sintéticas de prueba. Para medirla en uso real hacen falta consultas representativas revisadas por personas.

- [TF-IDF en scikit-learn](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html)
- [Regresión logística en scikit-learn](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html)
