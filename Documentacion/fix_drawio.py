import xml.etree.ElementTree as ET
import os

def create_element_with_geometry(parent, tag, elem_id, value, style, x, y, width, height, vertex="1"):
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

    # Style matching reference screenshot
    comp_ui_style = 'shape=module;align=center;spacingLeft=0;html=1;whiteSpace=wrap;rounded=1;arcSize=8;fillColor=#fae5e3;gradientColor=#f2c2bf;strokeColor=#4a5568;strokeWidth=1.2;fontFamily=Helvetica;fontSize=12;fontStyle=1;fontColor=#111111;'
    comp_ctrl_style = 'shape=module;align=center;spacingLeft=0;html=1;whiteSpace=wrap;rounded=1;arcSize=8;fillColor=#fae5e3;gradientColor=#f2c2bf;strokeColor=#4a5568;strokeWidth=1.2;fontFamily=Helvetica;fontSize=12;fontStyle=1;fontColor=#111111;'
    comp_sql_style = 'shape=module;align=center;spacingLeft=0;html=1;whiteSpace=wrap;rounded=1;arcSize=8;fillColor=#fae5e3;gradientColor=#f2c2bf;strokeColor=#4a5568;strokeWidth=1.2;fontFamily=Helvetica;fontSize=11.5;fontStyle=1;fontColor=#111111;'

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

        # Outer Container Box
        box_id = f'box_{pkg["id"]}'
        create_element_with_geometry(root, 'mxCell', box_id, '', 'rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#222222;strokeWidth=1.5;', cont_x, cont_y, cont_w, cont_h)

        # Tab Header (top-left tab)
        tab_id = f'tab_{pkg["id"]}'
        tab_w = max(260, len(pkg['title']) * 8 + 35)
        tab_style = 'shape=folder;tabWidth=240;tabHeight=25;tabPosition=left;html=1;whiteSpace=wrap;fillColor=#ffffff;strokeColor=#222222;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontStyle=1;fontColor=#000000;align=left;spacingLeft=10;verticalAlign=top;spacingTop=4;'
        create_element_with_geometry(root, 'mxCell', tab_id, f'<b>{pkg["title"]}</b>', tab_style, cont_x, cont_y - 25, tab_w, 26)

        # Elements coordinates
        y_ui = cont_y + 40
        ui_h = 75
        ui_w = 160

        y_ctrl = y_ui + ui_h + 65
        ctrl_h = 80
        ctrl_w = 175

        y_sql = y_ctrl + ctrl_h + 85
        sql_h = 60

        for col_idx, col_data in enumerate(pkg['columns']):
            cx = col_centers[col_idx]

            # 1. UI Component
            ui_id = f'ui_{pkg["id"]}_{col_idx}'
            create_element_with_geometry(root, 'mxCell', ui_id, col_data['ui'], comp_ui_style, cx - ui_w // 2, y_ui, ui_w, ui_h)

            # 2. Controller Component
            ctrl_id = f'ctrl_{pkg["id"]}_{col_idx}'
            create_element_with_geometry(root, 'mxCell', ctrl_id, col_data['ctrl'], comp_ctrl_style, cx - ctrl_w // 2, y_ctrl, ctrl_w, ctrl_h)

            # 3. Lollipop connector (Ball & Socket)
            mid_y = y_ui + ui_h + 32
            ball_r = 7
            ball_id = f'ball_{pkg["id"]}_{col_idx}'
            create_element_with_geometry(root, 'mxCell', ball_id, '', 'ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#fae5e3;strokeColor=#4a5568;strokeWidth=1.5;', cx - ball_r, mid_y - ball_r, ball_r * 2, ball_r * 2)

            # Line UI to Ball
            create_edge(root, f'edge_top_{pkg["id"]}_{col_idx}', 'endArrow=none;html=1;rounded=0;strokeColor=#4a5568;strokeWidth=1.4;', ui_id, ball_id)

            # Line Ball to Controller
            create_edge(root, f'edge_bottom_{pkg["id"]}_{col_idx}', 'endArrow=none;html=1;rounded=0;strokeColor=#4a5568;strokeWidth=1.4;', ball_id, ctrl_id)

            # Socket Arc embracing Ball
            socket_id = f'socket_{pkg["id"]}_{col_idx}'
            create_element_with_geometry(root, 'mxCell', socket_id, '', 'shape=mxgraph.basic.arc;startAngle=0.5;endAngle=1.0;strokeColor=#4a5568;strokeWidth=1.5;fillColor=none;', cx - 10, mid_y - 2, 20, 14)

            # 4. SQL Components & Dashed Arrows
            sqls = col_data['sql']
            if len(sqls) == 1:
                w_sql = 135
                sql_id = f'sql_{pkg["id"]}_{col_idx}_0'
                create_element_with_geometry(root, 'mxCell', sql_id, sqls[0], comp_sql_style, cx - w_sql // 2, y_sql, w_sql, sql_h)

                create_edge(root, f'dash_{pkg["id"]}_{col_idx}_0', 'dashed=1;dashPattern=6 4;endArrow=open;endSize=9;strokeColor=#4a5568;strokeWidth=1.3;html=1;rounded=0;', ctrl_id, sql_id)

            elif len(sqls) == 2:
                w_sql = 105
                gap = 14
                x_left = cx - w_sql - gap // 2
                x_right = cx + gap // 2

                # Left SQL
                sql_id_0 = f'sql_{pkg["id"]}_{col_idx}_0'
                create_element_with_geometry(root, 'mxCell', sql_id_0, sqls[0], comp_sql_style, x_left, y_sql, w_sql, sql_h)
                create_edge(root, f'dash_{pkg["id"]}_{col_idx}_0', 'dashed=1;dashPattern=6 4;endArrow=open;endSize=9;strokeColor=#4a5568;strokeWidth=1.3;html=1;rounded=0;', ctrl_id, sql_id_0)

                # Right SQL
                sql_id_1 = f'sql_{pkg["id"]}_{col_idx}_1'
                create_element_with_geometry(root, 'mxCell', sql_id_1, sqls[1], comp_sql_style, x_right, y_sql, w_sql, sql_h)
                create_edge(root, f'dash_{pkg["id"]}_{col_idx}_1', 'dashed=1;dashPattern=6 4;endArrow=open;endSize=9;strokeColor=#4a5568;strokeWidth=1.3;html=1;rounded=0;', ctrl_id, sql_id_1)

    out_path = r'c:\Users\HP\Desktop\Sprin 2\VecinoMarket\Documentacion\Implementacion_Arquitectura_Subsistemas_VecinoMarket.drawio'
    tree = ET.ElementTree(mxfile)
    ET.indent(tree, space='  ')
    tree.write(out_path, encoding='utf-8', xml_declaration=True)
    print('Drawio fixed successfully at:', out_path)

if __name__ == '__main__':
    build_drawio()
