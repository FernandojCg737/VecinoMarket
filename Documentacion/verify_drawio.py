with open(r'c:\Users\HP\Desktop\Sprin 2\VecinoMarket\Documentacion\Implementacion_Arquitectura_Subsistemas_VecinoMarket.drawio', 'r', encoding='utf-8') as f:
    text = f.read()
    print('Total length:', len(text))
    print('conn_ entries:', text.count('id="conn_'))
    print('diagram entries:', text.count('<diagram'))
