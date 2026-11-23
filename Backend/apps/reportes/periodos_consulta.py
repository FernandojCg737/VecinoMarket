"""Periodos de los reportes interpretados en la fecha local de la aplicación."""

import re
from calendar import monthrange
from datetime import date, timedelta

from .clasificador_reportes import normalizar


MESES = {
    nombre: i for i, nombre in enumerate((
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
        'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ), 1)
}
MESES['setiembre'] = 9
MES = '|'.join(MESES)
FECHA = r'(?:\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{4})'


def _fecha(texto):
    if '/' in texto:
        dia, mes, anio = map(int, texto.split('/'))
        return date(anio, mes, dia)
    return date.fromisoformat(texto)


def _validar(inicio, fin):
    if inicio > fin:
        raise ValueError('La fecha inicial debe ser anterior o igual a la final.')
    return inicio, fin


def _mes_completo(anio, mes):
    return date(anio, mes, 1), date(anio, mes, monthrange(anio, mes)[1])


def reconocer_periodo(pregunta, hoy):
    texto = normalizar(pregunta)
    fechas = re.findall(rf'(?<!\d){FECHA}(?!\d)', texto)
    if fechas:
        if len(fechas) > 2 or (len(fechas) == 1 and re.search(r'\b(?:desde|hasta|entre)\b', texto)):
            raise ValueError('Indica una fecha o un rango con dos fechas.')
        try:
            dias = [_fecha(fecha) for fecha in fechas]
        except ValueError as exc:
            raise ValueError('Hay una fecha inválida. Usa el formato AAAA-MM-DD.') from exc
        return _validar(dias[0], dias[-1])

    rango_extendido = re.search(
        rf'\b(?:del?|desde(?: el)?|entre) (\d{{1,2}}) de ({MES})(?: de(?:l)? (\d{{4}}))? '
        rf'(?:al|a|y|hasta(?: el)?) (\d{{1,2}}) de ({MES})(?: de(?:l)? (\d{{4}}))?\b',
        texto,
    )
    if rango_extendido:
        dia_inicio, mes_inicio, anio_inicio, dia_fin, mes_fin, anio_fin = rango_extendido.groups()
        try:
            inicio = date(int(anio_inicio or anio_fin or hoy.year), MESES[mes_inicio], int(dia_inicio))
            fin = date(int(anio_fin or anio_inicio or hoy.year), MESES[mes_fin], int(dia_fin))
        except ValueError as exc:
            raise ValueError('El rango contiene una fecha inválida.') from exc
        return _validar(inicio, fin)

    rango = re.search(
        rf'\b(?:del?|entre) (\d{{1,2}}) (?:al|a|y|hasta el) (\d{{1,2}}) de ({MES})(?: de(?:l)? (\d{{4}}))?\b',
        texto,
    )
    if rango:
        inicio, fin, mes, anio = rango.groups()
        try:
            fechas_rango = (date(int(anio or hoy.year), MESES[mes], int(inicio)),
                            date(int(anio or hoy.year), MESES[mes], int(fin)))
        except ValueError as exc:
            raise ValueError('El rango contiene un día inválido.') from exc
        return _validar(*fechas_rango)

    puntual = re.search(rf'\b(?:del?|en el) (\d{{1,2}}) de ({MES})(?: de(?:l)? (\d{{4}}))?\b', texto)
    if puntual:
        dia, mes, anio = puntual.groups()
        try:
            fecha = date(int(anio or hoy.year), MESES[mes], int(dia))
        except ValueError as exc:
            raise ValueError('La fecha indicada es inválida.') from exc
        return fecha, fecha

    ultimos = re.search(r'\bultim[oa]s? (\d+) dias?\b', texto)
    if ultimos:
        dias = int(ultimos[1])
        if not 1 <= dias <= 3660:
            raise ValueError('Indica un rango de 1 a 3660 días.')
        return hoy - timedelta(days=dias - 1), hoy

    if re.search(r'\b(?:anteayer|ayer|hoy)\b', texto):
        dias = 2 if 'anteayer' in texto else 1 if 'ayer' in texto else 0
        dia = hoy - timedelta(days=dias)
        return dia, dia

    lunes = hoy - timedelta(days=hoy.weekday())
    if re.search(r'\bsemana (?:pasada|anterior)\b', texto):
        return lunes - timedelta(days=7), lunes - timedelta(days=1)
    if re.search(r'\bultima semana\b', texto):
        return hoy - timedelta(days=6), hoy
    if re.search(r'\bsemana\b', texto):
        return lunes, hoy

    primer_dia = hoy.replace(day=1)
    if re.search(r'\bmes (?:pasado|anterior)\b', texto):
        ultimo = primer_dia - timedelta(days=1)
        return ultimo.replace(day=1), ultimo
    if re.search(r'\bultimo mes\b', texto):
        return hoy - timedelta(days=29), hoy
    mes_concreto = re.search(rf'\b(?:en|del?|durante) ({MES})(?: de(?:l)? (\d{{4}}))?\b', texto)
    if mes_concreto:
        mes, anio = mes_concreto.groups()
        return _mes_completo(int(anio or hoy.year), MESES[mes])
    if re.search(r'\bmes\b', texto):
        return primer_dia, hoy

    if re.search(r'\bano (?:pasado|anterior)\b', texto):
        return date(hoy.year - 1, 1, 1), date(hoy.year - 1, 12, 31)
    anio = re.search(r'\b(?:de|del|en|durante) (?:el ano )?(20\d{2})\b', texto)
    if anio:
        numero = int(anio[1])
        return date(numero, 1, 1), date(numero, 12, 31)
    if re.search(r'\bano\b', texto):
        return date(hoy.year, 1, 1), hoy
    if re.search(r'\b(?:trimestre|semestre)\b|\b(?:desde|hasta) (?:el )?\d', texto):
        raise ValueError('Indica el periodo con fechas, por ejemplo del 1 al 15 de octubre.')
    return None, None
