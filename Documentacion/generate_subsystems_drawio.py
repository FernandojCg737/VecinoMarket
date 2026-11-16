import xml.etree.ElementTree as ET
import os

def build_drawio():
    mxfile = ET.Element('mxfile', host='Electron', agent='Antigravity', version='21.6.8', type='device')

    # The 5 official packages of VecinoMarket, each formatted with exactly 3 columns matching the reference screenshot
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

    # Style definitions matching media_1793032036040_9098c5ae.png
    # Component with UML 2.0 module icon in the top right, soft pink gradient, thin dark border
    comp_ui_style = 'shape=module;align=center;spacingLeft=0;html=1;whiteSpace=wrap;rounded=1;arcSize=8;fillColor=#fae5e3;gradientColor=#f2c2bf;strokeColor=#4a5568;strokeWidth=1.2;fontFamily=Helvetica;fontSize=12;fontStyle=1;fontColor=#111111;'
    comp_ctrl_style = 'shape=module;align=center;spacingLeft=0;html=1;whiteSpace=wrap;rounded=1;arcSize=8;fillColor=#fae5e3;gradientColor=#f2c2bf;strokeColor=#4a5568;strokeWidth=1.2;fontFamily=Helvetica;fontSize=12;fontStyle=1;fontColor=#111111;'
    comp_sql_style = 'shape=module;align=center;spacingLeft=0;html=1;whiteSpace=wrap;rounded=1;arcSize=8;fillColor=#fae5e3;gradientColor=#f2c2bf;strokeColor=#4a5568;strokeWidth=1.2;fontFamily=Helvetica;fontSize=11.5;fontStyle=1;fontColor=#111111;'

    # Layout coordinates matching the reference image perfectly
    cont_x = 40
    cont_y = 50
    cont_w = 880
    cont_h = 520

    # 3 columns layout
    col_centers = [185, 480, 755]

    for pkg in packages_data:
        diag = ET.SubElement(mxfile, 'diagram', id=f'diag_{pkg["id"]}', name=pkg['name'])
        model = ET.SubElement(diag, 'mxGraphModel', dx='1200', dy='800', grid='1', gridSize='10', guides='1', tooltips='1', connect='1', arrows='1', fold='1', page='1', pageScale='1', pageWidth='980', pageHeight='650', background='#ffffff')
        root = ET.SubElement(model, 'root')
        ET.SubElement(root, 'mxCell', id='0')
        ET.SubElement(root, 'mxCell', id='1', parent='0')

        # 1. Main Subsystem Box (outer container)
        box_id = f'box_{pkg["id"]}'
        ET.SubElement(root, 'mxCell', id=box_id, value='', style='rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#222222;strokeWidth=1.5;', vertex='1', parent='1')
        geo = ET.SubElement(root.find(f".//mxCell[@id='{box_id}']"), 'mxGeometry', x=str(cont_x), y=str(cont_y), width=str(cont_w), height=str(cont_h), as_='geometry')

        # 2. Chamfered / Slanted Header Tab (exact shape as in EA reference screenshot)
        tab_id = f'tab_{pkg["id"]}'
        tab_w = max(260, len(pkg['title']) * 8 + 30)
        tab_style = 'shape=folder;tabWidth=220;tabHeight=25;tabPosition=left;html=1;whiteSpace=wrap;fillColor=#ffffff;strokeColor=#222222;strokeWidth=1.5;fontFamily=Helvetica;fontSize=12;fontStyle=1;fontColor=#000000;align=left;spacingLeft=10;verticalAlign=top;spacingTop=4;'
        ET.SubElement(root, 'mxCell', id=tab_id, value=f'<b>{pkg["title"]}</b>', style=tab_style, vertex='1', parent='1')
        ET.SubElement(root.find(f".//mxCell[@id='{tab_id}']"), 'mxGeometry', x=str(cont_x), y=str(cont_y - 25), width=str(tab_w), height='26', as_='geometry')

        # 3. Render the 3 Columns
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

            # --- UI Component ---
            ui_id = f'ui_{pkg["id"]}_{col_idx}'
            ET.SubElement(root, 'mxCell', id=ui_id, value=col_data['ui'], style=comp_ui_style, vertex='1', parent='1')
            ET.SubElement(root.find(f".//mxCell[@id='{ui_id}']"), 'mxGeometry', x=str(cx - ui_w // 2), y=str(y_ui), width=str(ui_w), height=str(ui_h), as_='geometry')

            # --- Controller Component ---
            ctrl_id = f'ctrl_{pkg["id"]}_{col_idx}'
            ET.SubElement(root, 'mxCell', id=ctrl_id, value=col_data['ctrl'], style=comp_ctrl_style, vertex='1', parent='1')
            ET.SubElement(root.find(f".//mxCell[@id='{ctrl_id}']"), 'mxGeometry', x=str(cx - ctrl_w // 2), y=str(y_ctrl), width=str(ctrl_w), height=str(ctrl_h), as_='geometry')

            # --- Lollipop Assembly Connector (Ball & Socket) ---
            mid_y = y_ui + ui_h + 32
            ball_r = 7
            ball_id = f'ball_{pkg["id"]}_{col_idx}'
            ET.SubElement(root, 'mxCell', id=ball_id, value='', style='ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#fae5e3;strokeColor=#4a5568;strokeWidth=1.5;', vertex='1', parent='1')
            ET.SubElement(root.find(f".//mxCell[@id='{ball_id}']"), 'mxGeometry', x=str(cx - ball_r), y=str(mid_y - ball_r), width=str(ball_r * 2), height=str(ball_r * 2), as_='geometry')

            # Upper line: UI down to ball
            edge_top = f'edge_top_{pkg["id"]}_{col_idx}'
            ET.SubElement(root, 'mxCell', id=edge_top, value='', style='endArrow=none;html=1;rounded=0;strokeColor=#4a5568;strokeWidth=1.4;', edge='1', parent='1', source=ui_id, target=ball_id)
            ET.SubElement(root.find(f".//mxCell[@id='{edge_top}']"), 'mxGeometry', relative='1', as_='geometry')

            # Lower line: Ball to Controller
            edge_bottom = f'edge_bottom_{pkg["id"]}_{col_idx}'
            ET.SubElement(root, 'mxCell', id=edge_bottom, value='', style='endArrow=none;html=1;rounded=0;strokeColor=#4a5568;strokeWidth=1.4;', edge='1', parent='1', source=ball_id, target=ctrl_id)
            ET.SubElement(root.find(f".//mxCell[@id='{edge_bottom}']"), 'mxGeometry', relative='1', as_='geometry')

            # Socket Arc wrapping bottom of ball
            socket_id = f'socket_{pkg["id"]}_{col_idx}'
            ET.SubElement(root, 'mxCell', id=socket_id, value='', style='shape=mxgraph.basic.arc;startAngle=0.5;endAngle=1.0;strokeColor=#4a5568;strokeWidth=1.5;fillColor=none;', vertex='1', parent='1')
            ET.SubElement(root.find(f".//mxCell[@id='{socket_id}']"), 'mxGeometry', x=str(cx - 10), y=str(mid_y - 2), width='20', height='14', as_='geometry')

            # --- SQL Components & Dashed Open Arrows ---
            sqls = col_data['sql']
            if len(sqls) == 1:
                w_sql = 135
                sql_id = f'sql_{pkg["id"]}_{col_idx}_0'
                ET.SubElement(root, 'mxCell', id=sql_id, value=sqls[0], style=comp_sql_style, vertex='1', parent='1')
                ET.SubElement(root.find(f".//mxCell[@id='{sql_id}']"), 'mxGeometry', x=str(cx - w_sql // 2), y=str(y_sql), width=str(w_sql), height=str(sql_h), as_='geometry')

                dash_id = f'dash_{pkg["id"]}_{col_idx}_0'
                ET.SubElement(root, 'mxCell', id=dash_id, value='', style='dashed=1;dashPattern=6 4;endArrow=open;endSize=9;strokeColor=#4a5568;strokeWidth=1.3;html=1;rounded=0;', edge='1', parent='1', source=ctrl_id, target=sql_id)
                ET.SubElement(root.find(f".//mxCell[@id='{dash_id}']"), 'mxGeometry', relative='1', as_='geometry')

            elif len(sqls) == 2:
                w_sql = 105
                gap = 14
                x_left = cx - w_sql - gap // 2
                x_right = cx + gap // 2

                # Left SQL
                sql_id_0 = f'sql_{pkg["id"]}_{col_idx}_0'
                ET.SubElement(root, 'mxCell', id=sql_id_0, value=sqls[0], style=comp_sql_style, vertex='1', parent='1')
                ET.SubElement(root.find(f".//mxCell[@id='{sql_id_0}']"), 'mxGeometry', x=str(x_left), y=str(y_sql), width=str(w_sql), height=str(sql_h), as_='geometry')

                dash_id_0 = f'dash_{pkg["id"]}_{col_idx}_0'
                ET.SubElement(root, 'mxCell', id=dash_id_0, value='', style='dashed=1;dashPattern=6 4;endArrow=open;endSize=9;strokeColor=#4a5568;strokeWidth=1.3;html=1;rounded=0;', edge='1', parent='1', source=ctrl_id, target=sql_id_0)
                ET.SubElement(root.find(f".//mxCell[@id='{dash_id_0}']"), 'mxGeometry', relative='1', as_='geometry')

                # Right SQL
                sql_id_1 = f'sql_{pkg["id"]}_{col_idx}_1'
                ET.SubElement(root, 'mxCell', id=sql_id_1, value=sqls[1], style=comp_sql_style, vertex='1', parent='1')
                ET.SubElement(root.find(f".//mxCell[@id='{sql_id_1}']"), 'mxGeometry', x=str(x_right), y=str(y_sql), width=str(w_sql), height=str(sql_h), as_='geometry')

                dash_id_1 = f'dash_{pkg["id"]}_{col_idx}_1'
                ET.SubElement(root, 'mxCell', id=dash_id_1, value='', style='dashed=1;dashPattern=6 4;endArrow=open;endSize=9;strokeColor=#4a5568;strokeWidth=1.3;html=1;rounded=0;', edge='1', parent='1', source=ctrl_id, target=sql_id_1)
                ET.SubElement(root.find(f".//mxCell[@id='{dash_id_1}']"), 'mxGeometry', relative='1', as_='geometry')

    out_path = r'c:\Users\HP\Desktop\Sprin 2\VecinoMarket\Documentacion\Implementacion_Arquitectura_Subsistemas_VecinoMarket.drawio'
    tree = ET.ElementTree(mxfile)
    ET.indent(tree, space='  ')
    tree.write(out_path, encoding='utf-8', xml_declaration=True)
    print('Drawio generated successfully at:', out_path)

if __name__ == '__main__':
    build_drawio()
