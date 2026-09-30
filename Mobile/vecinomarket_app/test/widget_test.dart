import 'package:flutter_test/flutter_test.dart';

import 'package:vecinomarket_app/main.dart';

void main() {
  testWidgets('La app arranca y muestra el AppBar de VecinoMarket', (WidgetTester tester) async {
    await tester.pumpWidget(const VecinoMarketApp());
    await tester.pump();

    expect(find.text('VecinoMarket'), findsOneWidget);
  });
}
