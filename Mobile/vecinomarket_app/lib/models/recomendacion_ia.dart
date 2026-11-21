import 'producto.dart';

/// Respuestas de /api/ia/ (ver apps/ia/views.py en el backend). El producto
/// viene con la misma forma que el catálogo, así que se reutiliza
/// Producto.fromJson y la misma tarjeta.

double? _aDouble(dynamic v) => v == null ? null : double.parse(v.toString());

/// CU1 (RF44): un producto de "Para ti" o de "Productos similares".
class ProductoRecomendado {
  ProductoRecomendado({required this.producto, required this.score, this.empresaReputacion});

  final Producto producto;
  final double score;

  /// La valoración del modelo es por EMPRESA (no hay valoración por producto).
  final double? empresaReputacion;

  factory ProductoRecomendado.fromJson(Map<String, dynamic> json) => ProductoRecomendado(
        producto: Producto.fromJson(json['producto'] as Map<String, dynamic>),
        score: _aDouble(json['score']) ?? 0,
        empresaReputacion: _aDouble(json['empresa_reputacion']?['promedio']),
      );
}

/// estrategia: 'personalizada' | 'popular' (Para ti) o 'hibrida' | 'categoria' (Similares).
class ListaRecomendada {
  ListaRecomendada({required this.estrategia, required this.productos});

  final String estrategia;
  final List<ProductoRecomendado> productos;

  /// Arranque en frío: sin historial se muestran los más vendidos de 30 días.
  bool get esPopular => estrategia == 'popular';

  factory ListaRecomendada.fromJson(Map<String, dynamic> json) => ListaRecomendada(
        estrategia: json['estrategia'] as String? ?? '',
        productos: (json['resultados'] as List<dynamic>? ?? [])
            .map((r) => ProductoRecomendado.fromJson(r as Map<String, dynamic>))
            .toList(),
      );
}

/// CU2 (RF45): sucursal cercana (con coordenadas para el mapa).
class SucursalCercana {
  SucursalCercana({
    required this.id,
    required this.nombre,
    required this.direccion,
    required this.lat,
    required this.lng,
    required this.distanciaKm,
  });

  final int id;
  final String nombre;
  final String direccion;
  final double lat;
  final double lng;
  final double distanciaKm;

  factory SucursalCercana.fromJson(Map<String, dynamic> json) => SucursalCercana(
        id: json['id'] as int,
        nombre: json['nombre'] as String? ?? '',
        direccion: json['direccion'] as String? ?? '',
        lat: _aDouble(json['lat'])!,
        lng: _aDouble(json['lng'])!,
        distanciaKm: _aDouble(json['distancia_km']) ?? 0,
      );
}

class ProductoCercano {
  ProductoCercano({required this.producto, required this.distanciaKm, required this.sucursal});

  final Producto producto;
  final double distanciaKm;
  final SucursalCercana sucursal;

  factory ProductoCercano.fromJson(Map<String, dynamic> json) => ProductoCercano(
        producto: Producto.fromJson(json['producto'] as Map<String, dynamic>),
        distanciaKm: _aDouble(json['distancia_km']) ?? 0,
        sucursal: SucursalCercana.fromJson(json['sucursal'] as Map<String, dynamic>),
      );
}

class EmprendedorCercano {
  EmprendedorCercano({
    required this.empresaId,
    required this.razonSocial,
    required this.ciudad,
    required this.distanciaKm,
    required this.productosCercanos,
    required this.sucursales,
    this.reputacion,
    this.categoriaPrincipal,
  });

  final int empresaId;
  final String razonSocial;
  final String ciudad;
  final double distanciaKm;
  final int productosCercanos;
  final List<SucursalCercana> sucursales;
  final double? reputacion;

  /// Empresa no tiene rubro: el backend usa la categoría más frecuente de sus productos cercanos.
  final String? categoriaPrincipal;

  factory EmprendedorCercano.fromJson(Map<String, dynamic> json) => EmprendedorCercano(
        empresaId: json['empresa']['id'] as int,
        razonSocial: json['empresa']['razon_social'] as String? ?? '',
        ciudad: json['empresa']['ciudad'] as String? ?? '',
        distanciaKm: _aDouble(json['distancia_km']) ?? 0,
        productosCercanos: json['productos_cercanos'] as int? ?? 0,
        reputacion: _aDouble(json['reputacion']?['promedio']),
        categoriaPrincipal: json['categoria_principal'] as String?,
        sucursales: (json['sucursales'] as List<dynamic>? ?? [])
            .map((s) => SucursalCercana.fromJson(s as Map<String, dynamic>))
            .toList(),
      );
}

class ResultadoCercanos {
  ResultadoCercanos({
    required this.lat,
    required this.lng,
    required this.fuente,
    required this.radioKm,
    required this.productos,
    required this.emprendedores,
  });

  final double lat;
  final double lng;

  /// 'dispositivo' (GPS) | 'ubicacion_default' | 'direccion_predeterminada'
  final String fuente;
  final double radioKm;
  final List<ProductoCercano> productos;
  final List<EmprendedorCercano> emprendedores;

  bool get usaGps => fuente == 'dispositivo';

  factory ResultadoCercanos.fromJson(Map<String, dynamic> json) => ResultadoCercanos(
        lat: _aDouble(json['ubicacion']['lat'])!,
        lng: _aDouble(json['ubicacion']['lng'])!,
        fuente: json['ubicacion']['fuente'] as String? ?? '',
        radioKm: _aDouble(json['radio_km']) ?? 5,
        productos: (json['productos'] as List<dynamic>? ?? [])
            .map((p) => ProductoCercano.fromJson(p as Map<String, dynamic>))
            .toList(),
        emprendedores: (json['emprendedores'] as List<dynamic>? ?? [])
            .map((e) => EmprendedorCercano.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

/// Formato boliviano: 0,6 km · 4,7
String formatoDecimal(double valor, [int decimales = 1]) => valor.toStringAsFixed(decimales).replaceAll('.', ',');

String formatoKm(double km) => '${formatoDecimal(km)} km';
