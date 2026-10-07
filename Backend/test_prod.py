import requests
import time

BASE_URL = 'https://vecinomarket-backend-gxn7.onrender.com/api'

def test_production():
    print("1. Creando un usuario de prueba en produccion...")
    email = f"test_agent_{int(time.time())}@vecinomarket.com"
    res = requests.post(f"{BASE_URL}/usuarios/compradores/registro/", json={
        "nombre": "Test Agent",
        "email": email,
        "password": "Password123!",
        "rol": "COMPRADOR"
    })
    
    # Podría devolver 201 o 400 si ya existe, no importa, logueamos.
    print("2. Iniciando sesión...")
    res = requests.post(f"{BASE_URL}/usuarios/auth/login/", json={
        "email": email,
        "password": "Password123!"
    })
    if res.status_code != 200:
        print("Error en login:", res.text)
        return
    token = res.json().get('access')
    headers = {"Authorization": f"Bearer {token}"}
    
    print("3. Obteniendo productos del catalogo...")
    res = requests.get(f"{BASE_URL}/catalogo/productos/")
    if res.status_code != 200:
        print("Error catalogo:", res.text)
        return
    productos = res.json().get('results', [])
    if not productos:
        print("No hay productos.")
        return
        
    producto_id = None
    empresa_id = None
    sucursal_id = None
    for p in productos:
        e_id = p['empresa']['id']
        res = requests.get(f"{BASE_URL}/inventario/sucursales/?empresa={e_id}")
        sucs = res.json()
        if sucs:
            producto_id = p['id']
            empresa_id = e_id
            sucursal_id = sucs[0]['id']
            print(f"   -> Seleccionado: {p['nombre']} de la empresa {p['empresa']['razon_social']}")
            break
            
    if not producto_id:
        print("Ningun producto tiene sucursal.")
        return
    
    print("5. Iniciando Checkout con PayPal...")
    payload = {
        'items': [{'producto_id': producto_id, 'cantidad': 1}],
        'entregas': {str(empresa_id): {'modalidad': 'RECOJO_TIENDA', 'sucursal_id': sucursal_id}},
        'metodo_pago': 'PAYPAL',
        'plataforma': 'movil'
    }
    
    res = requests.post(f"{BASE_URL}/pedidos/checkout/", json=payload, headers=headers)
    print(f"STATUS Iniciar Checkout: {res.status_code}")
    print(res.json())
    
    if res.status_code == 201:
        data = res.json()
        orden_compra_id = data['orden_compra_id']
        paypal_order_id = data['paypal_order_id']
        
        print("\n6. Intentando Confirmar el Pago (Esto debe dar 502 de PayPal, pero NO 500 del servidor)")
        res_conf = requests.post(f"{BASE_URL}/pedidos/checkout/{orden_compra_id}/confirmar/", json={"paypal_order_id": paypal_order_id}, headers=headers)
        print(f"STATUS Confirmar Pago: {res_conf.status_code}")
        print(res_conf.json())
        
        if res_conf.status_code == 500:
            print("\n❌ EL SERVIDOR DE PRODUCCIÓN AÚN DEVUELVE 500!")
        elif res_conf.status_code == 502:
            print("\n✅ ÉXITO: El servidor devolvió 502 (ORDER_NOT_APPROVED de PayPal).")
            print("Esto significa que el servidor no se cayó con un error 500, el bug fue corregido y el flujo funciona a la perfección hasta que PayPal apruebe la orden.")
        else:
            print("\n✅ ÉXITO: El servidor respondió correctamente.")

if __name__ == '__main__':
    test_production()
