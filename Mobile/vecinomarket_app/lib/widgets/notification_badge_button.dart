import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../screens/notifications_screen.dart';
import '../services/auth_service.dart';
import '../services/notificacion_service.dart';

class NotificationBadgeButton extends StatefulWidget {
  final double size;
  const NotificationBadgeButton({super.key, this.size = 20});

  @override
  State<NotificationBadgeButton> createState() => _NotificationBadgeButtonState();
}

class _NotificationBadgeButtonState extends State<NotificationBadgeButton> {
  final _service = NotificacionService();
  int _noLeidas = 0;

  @override
  void initState() {
    super.initState();
    _consultar();
  }

  void _consultar() {
    final usuario = context.read<AuthService>().usuario;
    if (usuario != null) {
      _service.obtenerMisNotificaciones(soloNoLeidas: true).then((lista) {
        if (mounted) {
          setState(() {
            _noLeidas = lista.where((n) => n['leido'] != true).length;
          });
        }
      }).catchError((_) {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final usuario = context.watch<AuthService>().usuario;
    final esOscuro = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: () {
        if (usuario != null) {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const NotificationsScreen()),
          ).then((_) => _consultar());
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Inicia sesión para ver tus notificaciones'),
              duration: Duration(seconds: 2),
            ),
          );
        }
      },
      borderRadius: BorderRadius.circular(999),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Icon(
              Icons.notifications_outlined,
              size: widget.size,
              color: usuario != null
                  ? (esOscuro ? Colors.white : Colors.black87)
                  : (esOscuro ? Colors.white38 : Colors.black26),
            ),
            if (usuario != null && _noLeidas > 0)
              Positioned(
                right: -3,
                top: -3,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: const BoxDecoration(
                    color: Color(0xFFDC2626),
                    shape: BoxShape.circle,
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 14,
                    minHeight: 14,
                  ),
                  child: Text(
                    _noLeidas > 9 ? '9+' : '$_noLeidas',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 8.5,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
