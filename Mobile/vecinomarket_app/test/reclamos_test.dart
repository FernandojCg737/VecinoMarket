import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:vecinomarket_app/screens/reclamos_screen.dart';

void main() {
  testWidgets('El comprador debe completar motivo, descripción y foto', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(home: NuevoReclamoScreen(pedido: 4, numero: 'VM-4')),
    );
    expect(find.text('VM-4'), findsOneWidget);
    await tester.tap(find.text('Enviar reclamo'));
    await tester.pumpAndSettle();
    expect(find.text('Selecciona un motivo.'), findsOneWidget);
    expect(find.text('Describe lo ocurrido.'), findsOneWidget);

    await tester.tap(find.byType(DropdownButtonFormField<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Producto dañado').last);
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byType(TextFormField),
      'El producto llegó roto.',
    );
    await tester.ensureVisible(find.text('Enviar reclamo'));
    await tester.tap(find.text('Enviar reclamo'));
    await tester.pumpAndSettle();
    expect(find.text('Adjunta una foto de evidencia.'), findsOneWidget);
  });

  testWidgets('La evidencia se adjunta y se envía al endpoint del pedido', (
    tester,
  ) async {
    FlutterSecureStorage.setMockInitialValues({'access': 'jwt-de-prueba'});
    final foto = File('build/cu29-widget-evidencia.png');
    foto.parent.createSync(recursive: true);
    foto.writeAsBytesSync(
      base64Decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      ),
    );
    addTearDown(() => foto.deleteSync());
    const selector = MethodChannel('plugins.flutter.io/image_picker');
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      selector,
      (_) async => foto.absolute.path,
    );
    addTearDown(
      () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        selector,
        null,
      ),
    );
    http.Request? enviado;

    await http.runWithClient(
      () async {
        await tester.pumpWidget(
          const MaterialApp(
            home: NuevoReclamoScreen(pedido: 4, numero: 'VM-4'),
          ),
        );
        await tester.tap(find.byType(DropdownButtonFormField<String>));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Pedido incompleto').last);
        await tester.pumpAndSettle();
        await tester.enterText(
          find.byType(TextFormField),
          'Faltó un artículo.',
        );
        await tester.runAsync(() async {
          await tester.tap(find.text('Elegir foto'));
          await Future<void>.delayed(const Duration(milliseconds: 100));
        });
        await tester.pumpAndSettle();
        expect(
          find.bySemanticsLabel('Vista previa de evidencia'),
          findsOneWidget,
        );
        await tester.ensureVisible(find.text('Enviar reclamo'));
        await tester.runAsync(() async {
          await tester.tap(find.text('Enviar reclamo'));
          await Future<void>.delayed(const Duration(milliseconds: 100));
        });
        await tester.pumpAndSettle();
        expect(enviado, isNotNull);
        expect(enviado!.method, 'POST');
        expect(enviado!.url.path, endsWith('/pedidos/reclamos/crear/'));
        expect(enviado!.headers['authorization'], 'Bearer jwt-de-prueba');
        final multipart = latin1.decode(enviado!.bodyBytes);
        expect(multipart, contains('name="evidencia"'));
        expect(multipart, contains('INCOMPLETO'));
      },
      () => MockClient((request) async {
        enviado = request;
        return http.Response('{"id": 8}', 201);
      }),
    );
  });

  testWidgets(
    'SuperAdmin puede resolver y recargar el reclamo con la foto privada',
    (tester) async {
      FlutterSecureStorage.setMockInitialValues({'access': 'jwt-superadmin'});
      final foto = base64Decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      );
      Map<String, dynamic>? resolucion;
      var lecturasDeFoto = 0;
      await http.runWithClient(
        () async {
          await tester.pumpWidget(
            const MaterialApp(home: DetalleReclamoScreen(id: 8)),
          );
          await tester.pumpAndSettle();
          expect(find.text('En mediación'), findsOneWidget);
          expect(find.bySemanticsLabel('Foto de evidencia'), findsOneWidget);
          expect(lecturasDeFoto, 1);
          expect(find.text('Aprobar devolución'), findsNothing);

          final resolver = find.text('Confirmar rechazo');
          await tester.scrollUntilVisible(resolver, 200);
          await tester.tap(resolver);
          await tester.pumpAndSettle();
          await tester.tap(find.text('Confirmar acción'));
          await tester.pumpAndSettle();
          expect(find.text('Completa este campo.'), findsOneWidget);
          await tester.enterText(
            find.byType(TextFormField),
            'Evidencia revisada.',
          );
          await tester.tap(find.text('Confirmar acción'));
          await tester.pumpAndSettle();

          expect(resolucion, {
            'accion': 'mediar_rechazar',
            'respuesta': 'Evidencia revisada.',
          });
          expect(find.text('Rechazo confirmado'), findsOneWidget);
          expect(find.text('Confirmar rechazo'), findsNothing);
        },
        () => MockClient((request) async {
          expect(request.headers['authorization'], 'Bearer jwt-superadmin');
          final path = request.url.path;
          if (path.endsWith('/8/evidencia/')) {
            lecturasDeFoto++;
            return http.Response.bytes(foto, 200);
          }
          if (path.endsWith('/8/accion/')) {
            expect(request.method, 'POST');
            resolucion = jsonDecode(request.body) as Map<String, dynamic>;
            return http.Response('{}', 200);
          }
          expect(path, endsWith('/pedidos/reclamos/8/'));
          return http.Response(
            jsonEncode({
              'numero_pedido': 'VM-4',
              'empresa': 'Tienda de prueba',
              'motivo_label': 'Producto dañado',
              'descripcion': 'El producto llegó roto.',
              'estado_label': resolucion == null
                  ? 'En mediación'
                  : 'Rechazo confirmado',
              'evidencia_path': '/api/pedidos/reclamos/8/evidencia/',
              'acciones': resolucion == null ? ['mediar_rechazar'] : [],
              'resolucion_mediacion': resolucion?['respuesta'],
            }),
            200,
              headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }),
      );
    },
  );
}
