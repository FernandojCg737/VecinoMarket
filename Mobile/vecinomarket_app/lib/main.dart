import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'screens/home_screen.dart';
import 'services/auth_service.dart';
import 'services/cart_service.dart';
import 'services/theme_service.dart';

void main() {
  runApp(const VecinoMarketApp());
}

class VecinoMarketApp extends StatelessWidget {
  const VecinoMarketApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()),
        ChangeNotifierProvider(create: (_) => CartService()),
        ChangeNotifierProvider(create: (_) => ThemeService()),
      ],
      child: Consumer<ThemeService>(
        builder: (context, themeService, _) {
          const semilla = Color(0xFFCC8B00); // mismo brand-600 (naranja/amarillo) que la web
          const negro = Color(0xFF111827); // mismo gris-900 que el modo noche de la web

          // Se fijan los colores exactos de marca en vez de dejar que
          // ColorScheme.fromSeed los apague/entone a un café/crema.
          final claro = ColorScheme.fromSeed(seedColor: semilla, brightness: Brightness.light).copyWith(
            primary: semilla,
            onPrimary: Colors.white,
            secondary: semilla,
            onSecondary: Colors.white,
            surface: Colors.white,
            onSurface: const Color(0xFF111827),
            outline: const Color(0xFFD1D5DB), // gray-300, igual que los bordes de la web
            surfaceContainerHighest: const Color(0xFFF3F4F6), // gray-100 para campos rellenos
            surfaceTint: Colors.transparent,
          );
          final oscuro = ColorScheme.fromSeed(seedColor: semilla, brightness: Brightness.dark).copyWith(
            primary: semilla,
            onPrimary: Colors.white,
            secondary: semilla,
            onSecondary: Colors.white,
            surface: negro,
            onSurface: Colors.white,
            outline: const Color(0xFF374151), // gray-700
            surfaceContainerHighest: const Color(0xFF1F2937), // gray-800 para campos rellenos
            surfaceTint: Colors.transparent,
          );

          return MaterialApp(
            title: 'VecinoMarket',
            debugShowCheckedModeBanner: false,
            themeMode: themeService.modo,
            theme: ThemeData(
              colorScheme: claro,
              scaffoldBackgroundColor: Colors.white,
              appBarTheme: const AppBarTheme(backgroundColor: Colors.white, foregroundColor: Colors.black),
              useMaterial3: true,
            ),
            darkTheme: ThemeData(
              colorScheme: oscuro,
              scaffoldBackgroundColor: negro,
              appBarTheme: const AppBarTheme(backgroundColor: negro, foregroundColor: Colors.white),
              useMaterial3: true,
            ),
            // El catálogo es público (igual que en la web); el login es opcional
            // y se abre desde el ícono de cuenta en el AppBar.
            home: const HomeScreen(),
          );
        },
      ),
    );
  }
}
