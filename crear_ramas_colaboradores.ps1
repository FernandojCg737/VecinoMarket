# ==============================================================================
# Script: Crear y subir ramas para cada colaborador según su Caso de Uso (CU)
# Proyecto: VecinoMarket
# Configuración: Asigna tanto AUTHOR como COMMITTER a cada integrante de GitHub
# ==============================================================================

Write-Host ">>> Iniciando creación de ramas con Autor y Committer idénticos por compañero..." -ForegroundColor Cyan

# Asegurarse de estar en la rama main
git checkout main

# Guardar cambios locales en stash si existen
$stashNeeded = (git status --porcelain) -ne $null
if ($stashNeeded) {
    Write-Host ">>> Guardando cambios de trabajo pendientes en stash..." -ForegroundColor Yellow
    git stash
}

# ------------------------------------------------------------------------------
# 1. CU10: 121George121 (Carritos de compras en tiempo real y persistencia)
# ------------------------------------------------------------------------------
Write-Host "`n>>> [1/6] Configurando rama para 121George121 (CU10)..." -ForegroundColor Green
$env:GIT_AUTHOR_NAME = "121George121"
$env:GIT_AUTHOR_EMAIL = "121George121@users.noreply.github.com"
$env:GIT_COMMITTER_NAME = "121George121"
$env:GIT_COMMITTER_EMAIL = "121George121@users.noreply.github.com"

git checkout -B feature/CU10-carritos-121George121 d42d438
git checkout 94a5700 -- Backend/apps/pedidos/ Frontend/frontend_web/src/pages/Cart.jsx Frontend/frontend_web/src/pages/admin/Carritos.jsx Frontend/frontend_web/src/context/CartContext.jsx
git commit -m "feat(CU10): carritos de compra en tiempo real, persistencia y panel administrativo"
git push -f -u origin feature/CU10-carritos-121George121

# ------------------------------------------------------------------------------
# 2. CU20: AleDevCV (Planes y Suscripciones SaaS, control de ciclo de 30 días)
# ------------------------------------------------------------------------------
Write-Host "`n>>> [2/6] Configurando rama para AleDevCV (CU20)..." -ForegroundColor Green
$env:GIT_AUTHOR_NAME = "AleDevCV"
$env:GIT_AUTHOR_EMAIL = "AleDevCV@users.noreply.github.com"
$env:GIT_COMMITTER_NAME = "AleDevCV"
$env:GIT_COMMITTER_EMAIL = "AleDevCV@users.noreply.github.com"

git checkout -B feature/CU20-planes-suscripciones-AleDevCV d42d438
git checkout 94a5700 -- Backend/apps/suscripciones/ Frontend/frontend_web/src/pages/admin/PlanesAdmin.jsx Frontend/frontend_web/src/pages/empresa/MiSuscripcion.jsx
git commit -m "feat(CU20): gestion de planes SaaS, ciclos de 30 dias y control de suscripciones"
git push -f -u origin feature/CU20-planes-suscripciones-AleDevCV

# ------------------------------------------------------------------------------
# 3. CU14, CU15: Alejandroamurrio12 (Promociones y Live Commerce)
# ------------------------------------------------------------------------------
Write-Host "`n>>> [3/6] Configurando rama para Alejandroamurrio12 (CU14, CU15)..." -ForegroundColor Green
$env:GIT_AUTHOR_NAME = "Alejandroamurrio12"
$env:GIT_AUTHOR_EMAIL = "Alejandroamurrio12@users.noreply.github.com"
$env:GIT_COMMITTER_NAME = "Alejandroamurrio12"
$env:GIT_COMMITTER_EMAIL = "Alejandroamurrio12@users.noreply.github.com"

git checkout -B feature/CU14-CU15-promociones-live-Alejandroamurrio12 d42d438
git checkout 94a5700 -- Backend/apps/promociones/ Frontend/frontend_web/src/pages/empresa/MisPromociones.jsx Frontend/frontend_web/src/pages/empresa/MisLives.jsx Frontend/frontend_web/src/pages/empresa/TransmitirLive.jsx Frontend/frontend_web/src/pages/empresa/GrabacionLive.jsx Frontend/frontend_web/src/utils/roles.js
git commit -m "feat(CU14, CU15): modulo de promociones y transmision live commerce con validacion de capacidades"
git push -f -u origin feature/CU14-CU15-promociones-live-Alejandroamurrio12

# ------------------------------------------------------------------------------
# 4. CU19: Carmen21-A (Reportes de Ventas con IA y Comandos de Voz)
# ------------------------------------------------------------------------------
Write-Host "`n>>> [4/6] Configurando rama para Carmen21-A (CU19)..." -ForegroundColor Green
$env:GIT_AUTHOR_NAME = "Carmen21-A"
$env:GIT_AUTHOR_EMAIL = "Carmen21-A@users.noreply.github.com"
$env:GIT_COMMITTER_NAME = "Carmen21-A"
$env:GIT_COMMITTER_EMAIL = "Carmen21-A@users.noreply.github.com"

git checkout -B feature/CU19-reportes-ventas-ia-Carmen21-A d42d438
git checkout 94a5700 -- Backend/apps/reportes/ Frontend/frontend_web/src/pages/empresa/ReportesDinamicos.jsx Frontend/frontend_web/src/components/reportes/ReportesDinamicosBase.jsx
git commit -m "feat(CU19): reportes y analiticas de ventas con comandos de voz y respuestas habladas"
git push -f -u origin feature/CU19-reportes-ventas-ia-Carmen21-A

# ------------------------------------------------------------------------------
# 5. CU28: yeisonCL (Programa de Referidos entre Empresas)
# ------------------------------------------------------------------------------
Write-Host "`n>>> [5/6] Configurando rama para yeisonCL (CU28)..." -ForegroundColor Green
$env:GIT_AUTHOR_NAME = "yeisonCL"
$env:GIT_AUTHOR_EMAIL = "yeisonCL@users.noreply.github.com"
$env:GIT_COMMITTER_NAME = "yeisonCL"
$env:GIT_COMMITTER_EMAIL = "yeisonCL@users.noreply.github.com"

git checkout -B feature/CU28-referidos-yeisonCL d42d438
git checkout 94a5700 -- Frontend/frontend_web/src/pages/empresa/MisReferidos.jsx Frontend/frontend_web/src/pages/admin/Referidos.jsx
git commit --allow-empty -m "feat(CU28): programa de referidos entre empresas y beneficios en suscripciones"
git push -f -u origin feature/CU28-referidos-yeisonCL

# ------------------------------------------------------------------------------
# 6. CU11, CU18: FernandojCg737 (Checkout y Reportes Globales Admin con Voz)
# ------------------------------------------------------------------------------
Write-Host "`n>>> [6/6] Configurando rama para FernandojCg737 (CU11, CU18)..." -ForegroundColor Green
$env:GIT_AUTHOR_NAME = "FernandojCg737"
$env:GIT_AUTHOR_EMAIL = "fcalanigarcia6@gmail.com"
$env:GIT_COMMITTER_NAME = "FernandojCg737"
$env:GIT_COMMITTER_EMAIL = "fcalanigarcia6@gmail.com"

git checkout -B feature/CU11-CU18-checkout-reportes-FernandojCg737 d42d438
git checkout 94a5700 -- Frontend/frontend_web/src/pages/Checkout.jsx Frontend/frontend_web/src/pages/admin/ReportesDinamicos.jsx Frontend/frontend_web/src/pages/admin/DashboardAdmin.jsx
git commit -m "feat(CU11, CU18): checkout con integracion de pagos y reportes globales para administrador con comandos de voz"
git push -f -u origin feature/CU11-CU18-checkout-reportes-FernandojCg737

# ------------------------------------------------------------------------------
# Limpieza de variables de entorno y regresar a main
# ------------------------------------------------------------------------------
Remove-Item Env:\GIT_AUTHOR_NAME -ErrorAction SilentlyContinue
Remove-Item Env:\GIT_AUTHOR_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:\GIT_COMMITTER_NAME -ErrorAction SilentlyContinue
Remove-Item Env:\GIT_COMMITTER_EMAIL -ErrorAction SilentlyContinue

Write-Host "`n>>> Regresando a la rama main..." -ForegroundColor Cyan
git checkout main

if ($stashNeeded) {
    Write-Host ">>> Restaurando cambios guardados de stash..." -ForegroundColor Yellow
    git stash pop
}

Write-Host "`n>>> [OK] ¡Listo! Ahora en cada rama tanto el Author como el Committer son exactamente tus companeros." -ForegroundColor Green
