import xml.etree.ElementTree as ET
import urllib.parse
import os

# Exact connector as requested:
# - The upper vertical line reaches and connects directly to the top apex of the arch (y2=24.5)
# - The arch and the ball remain clearly separated
# - The lower vertical line connects from the bottom of the ball down to the controller
svg_connector = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 65" width="42" height="65">
  <!-- 1. Upper stem connects directly into the top of the Socket Arch -->
  <line x1="21" y1="0" x2="21" y2="24.5" stroke="#4a5568" stroke-width="1.8" />
  
  <!-- 2. Socket Arch / Dome (∩) embracing the ball from above -->
  <path d="M 8.5,38.5 A 12.5,12.5 0 0,1 33.5,38.5" fill="none" stroke="#4a5568" stroke-width="2.2" stroke-linecap="round" />
  
  <!-- 3. Ball: Provided Interface, cleanly separated inside the arch, warm yellow fill -->
  <circle cx="21" cy="37" r="7.5" fill="#fce4b8" stroke="#4a5568" stroke-width="1.8" />
  
  <!-- 4. Lower stem connects from bottom edge of ball down into Controller -->
  <line x1="21" y1="44.5" x2="21" y2="65" stroke="#4a5568" stroke-width="1.8" />
</svg>'''

svg_data_uri = 'data:image/svg+xml,' + urllib.parse.quote(svg_connector)

def create_element(parent, elem_id, value, style, x, y, width, height, vertex="1"):
    cell = ET.SubElement(parent, 'mxCell', attrib={
        'id': str(elem_id),
        'value': str(value),
        'style': str(style),
        'vertex': str(vertex),
        'parent': '1'
    })
    ET.SubElement(cell, 'mxGeometry', attrib={
        'as': 'geometry',
        'x': str(x),
        'y': str(y),
        'width': str(width),
        'height': str(height)
    })
    return cell

def create_edge(parent, edge_id, style, source_id, target_id):
    edge = ET.SubElement(parent, 'mxCell', attrib={
        'id': str(edge_id),
        'value': '',
        'style': str(style),
        'edge': '1',
        'parent': '1',
        'source': str(source_id),
        'target': str(target_id)
    })
    ET.SubElement(edge, 'mxGeometry', attrib={
        'as': 'geometry',
        'relative': '1'
    })
    return edge

def build_drawio():
    mxfile = ET.Element('mxfile', host='Electron', agent='Antigravity', version='21.6.8', type='device')

    packages_data = [
        {
            'id': 'p1',
            'name': 'P1 - Usuarios y Seguridad',
            'title': 'cmp Subsistemas - Usuarios y Seguridad',
            'columns': [
                {
                    'ui': 'usuarios.ui',
                    'ctrl': 'usuarios.controller',
                    'sql': ['Usuario.sql', 'Persona.sql']
                },
                {
                    'ui': 'roles.ui',
                    'ctrl': 'roles.controller',
                    'sql': ['Rol.sql', 'Permiso.sql']
                },
                {
                    'ui': 'empleados.ui',
                    'ctrl': 'empleados.controller',
                    'sql': ['Empleado.sql', 'EmpleadoPermiso.sql']
                }
            ]
        },
        {
            'id': 'p2',
            'name': 'P2 - Catálogo y Productos',
            'title': 'cmp Subsistemas - Catálogo y Productos',
            'columns': [
                {
                    'ui': 'categorias.ui',
                    'ctrl': 'categorias.controller',
                    'sql': ['Categoria.sql']
                },
                {
                    'ui': 'productos.ui',
                    'ctrl': 'productos.controller',
                    'sql': ['Producto.sql', 'ImagenProducto.sql']
                },
                {
                    'ui': 'catalogo_vitrina.ui',
                    'ctrl': 'vitrina.controller',
                    'sql': ['VitrinaConfig.sql']
                }
            ]
        },
        {
            'id': 'p3',
            'name': 'P3 - Inventario, Pedidos y Ventas',
            'title': 'cmp Subsistemas - Comercial y Transaccional',
            'columns': [
                {
                    'ui': 'carrito.ui',
                    'ctrl': 'carrito.controller',
                    'sql': ['Carrito.sql']
                },
                {
                    'ui': 'pedidos_ventas.ui',
                    'ctrl': 'pedidos.controller',
                    'sql': ['Pedido.sql', 'Pago.sql']
                },
                {
                    'ui': 'entregas.ui',
                    'ctrl': 'entregas.controller',
                    'sql': ['Entrega.sql', 'Sucursal.sql']
                }
            ]
        },
        {
            'id': 'p4',
            'name': 'P4 - Comunicación y Live Commerce',
            'title': 'cmp Subsistemas - Comunicación, Marketing y Live Commerce',
            'columns': [
                {
                    'ui': 'promociones.ui',
                    'ctrl': 'promociones.controller',
                    'sql': ['Promocion.sql', 'PromocionProducto.sql']
                },
                {
                    'ui': 'live_commerce.ui',
                    'ctrl': 'live_commerce.controller',
                    'sql': ['LiveSesion.sql', 'LiveProducto.sql']
                },
                {
                    'ui': 'chatbot.ui',
                    'ctrl': 'chatbot.controller',
                    'sql': ['ChatbotFAQ.sql', 'ChatMensaje.sql']
                }
            ]
        },
        {
            'id': 'p5',
            'name': 'P5 - Reportes, IA y Auditoría',
            'title': 'cmp Subsistemas - Reportes, IA y Auditoría',
            'columns': [
                {
                    'ui': 'reportes.ui',
                    'ctrl': 'reportes.controller',
                    'sql': ['Empresa.sql', 'Venta.sql']
                },
                {
                    'ui': 'notificaciones.ui',
                    'ctrl': 'notificaciones.controller',
                    'sql': ['Notificacion.sql']
                },
                {
                    'ui': 'auditoria.ui',
                    'ctrl': 'auditoria.controller',
                    'sql': ['LogAuditoria.sql', 'Bitacora.sql']
                }
            ]
        }
    ]

    # Components styling matching reference:
    comp_ui_style = 'shape=module;align=center;spacingLeft=0;html=1;whiteSpace=wrap;rounded=1;arcSize=6;shadow=1;fillColor=#fae8e6;gradientColor=#ea9e99;strokeColor=#333333;strokeWidth=1.1;fontFamily=Segoe UI,Helvetica,Arial;fontSize=12;fontColor=#111111;'
    comp_ctrl_style = 'shape=module;align=center;spacingLeft=0;html=1;whiteSpace=wrap;rounded=1;arcSize=6;shadow=1;fillColor=#fae8e6;gradientColor=#ea9e99;strokeColor=#333333;strokeWidth=1.1;fontFamily=Segoe UI,Helvetica,Arial;fontSize=12;fontColor=#111111;'
    comp_sql_style = 'shape=module;align=center;spacingLeft=0;html=1;whiteSpace=wrap;rounded=1;arcSize=6;shadow=1;fillColor=#fae8e6;gradientColor=#ea9e99;strokeColor=#333333;strokeWidth=1.1;fontFamily=Segoe UI,Helvetica,Arial;fontSize=11.5;fontColor=#111111;'

    conn_w = 42
    conn_h = 65
    connector_style = f'shape=image;html=1;verticalAlign=top;verticalLabelPosition=bottom;labelBackgroundColor=#ffffff;imageAspect=0;aspect=fixed;image={svg_data_uri};'

    cont_x = 40
    cont_y = 60
    cont_w = 880
    cont_h = 530

    col_centers = [185, 480, 755]

    for pkg in packages_data:
        diag = ET.SubElement(mxfile, 'diagram', id=f'diag_{pkg["id"]}', name=pkg['name'])
        model = ET.SubElement(diag, 'mxGraphModel', dx='1200', dy='800', grid='1', gridSize='10', guides='1', tooltips='1', connect='1', arrows='1', fold='1', page='1', pageScale='1', pageWidth='980', pageHeight='680', background='#ffffff')
        root = ET.SubElement(model, 'root')
        ET.SubElement(root, 'mxCell', id='0')
        ET.SubElement(root, 'mxCell', id='1', parent='0')

        # Outer Subsystem Container Box
        box_id = f'box_{pkg["id"]}'
        create_element(root, box_id, '', 'rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#222222;strokeWidth=1.5;', cont_x, cont_y, cont_w, cont_h)

        # Tab Header (top-left slanted folder tab)
        tab_id = f'tab_{pkg["id"]}'
        tab_w = max(260, len(pkg['title']) * 8 + 35)
        tab_style = 'shape=folder;tabWidth=240;tabHeight=25;tabPosition=left;html=1;whiteSpace=wrap;fillColor=#ffffff;strokeColor=#222222;strokeWidth=1.5;fontFamily=Segoe UI,Helvetica,Arial;fontSize=12;fontStyle=1;fontColor=#000000;align=left;spacingLeft=10;verticalAlign=top;spacingTop=4;'
        create_element(root, tab_id, f'<b>{pkg["title"]}</b>', tab_style, cont_x, cont_y - 25, tab_w, 26)

        y_ui = cont_y + 40      # 100
        ui_h = 75
        ui_w = 160

        y_conn = y_ui + ui_h    # 175
        y_ctrl = y_conn + conn_h # 240
        ctrl_h = 80
        ctrl_w = 175

        y_sql = y_ctrl + ctrl_h + 80 # 400
        sql_h = 60

        for col_idx, col_data in enumerate(pkg['columns']):
            cx = col_centers[col_idx]

            # 1. UI Component (top)
            ui_id = f'ui_{pkg["id"]}_{col_idx}'
            create_element(root, ui_id, col_data['ui'], comp_ui_style, cx - ui_w // 2, y_ui, ui_w, ui_h)

            # 2. Connector: Upper line touches arch, ball separated, lower line touches controller
            conn_id = f'conn_{pkg["id"]}_{col_idx}'
            create_element(root, conn_id, '', connector_style, cx - conn_w // 2, y_conn, conn_w, conn_h)

            # 3. Controller Component (middle)
            ctrl_id = f'ctrl_{pkg["id"]}_{col_idx}'
            create_element(root, ctrl_id, col_data['ctrl'], comp_ctrl_style, cx - ctrl_w // 2, y_ctrl, ctrl_w, ctrl_h)

            # 4. SQL Components & Open Dashed Arrows (bottom)
            sqls = col_data['sql']
            if len(sqls) == 1:
                w_sql = 135
                sql_id = f'sql_{pkg["id"]}_{col_idx}_0'
                create_element(root, sql_id, sqls[0], comp_sql_style, cx - w_sql // 2, y_sql, w_sql, sql_h)
                create_edge(root, f'dash_{pkg["id"]}_{col_idx}_0', 'dashed=1;dashPattern=5 3;endArrow=open;endSize=9;strokeColor=#4a5568;strokeWidth=1.3;html=1;rounded=0;', ctrl_id, sql_id)

            elif len(sqls) == 2:
                w_sql = 105
                gap = 14
                x_left = cx - w_sql - gap // 2
                x_right = cx + gap // 2

                # Left SQL
                sql_id_0 = f'sql_{pkg["id"]}_{col_idx}_0'
                create_element(root, sql_id_0, sqls[0], comp_sql_style, x_left, y_sql, w_sql, sql_h)
                create_edge(root, f'dash_{pkg["id"]}_{col_idx}_0', 'dashed=1;dashPattern=5 3;endArrow=open;endSize=9;strokeColor=#4a5568;strokeWidth=1.3;html=1;rounded=0;', ctrl_id, sql_id_0)

                # Right SQL
                sql_id_1 = f'sql_{pkg["id"]}_{col_idx}_1'
                create_element(root, sql_id_1, sqls[1], comp_sql_style, x_right, y_sql, w_sql, sql_h)
                create_edge(root, f'dash_{pkg["id"]}_{col_idx}_1', 'dashed=1;dashPattern=5 3;endArrow=open;endSize=9;strokeColor=#4a5568;strokeWidth=1.3;html=1;rounded=0;', ctrl_id, sql_id_1)

    out_path = r'c:\Users\HP\Desktop\Sprin 2\VecinoMarket\Documentacion\Implementacion_Arquitectura_Subsistemas_VecinoMarket.drawio'
    tree = ET.ElementTree(mxfile)
    ET.indent(tree, space='  ')
    tree.write(out_path, encoding='utf-8', xml_declaration=True)
    print('Drawio with upper line touching the arch generated successfully at:', out_path)

if __name__ == '__main__':
    build_drawio()
