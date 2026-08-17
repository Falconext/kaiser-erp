#!/bin/bash

# ============================================================
# Script de Verificación Pre-Deploy - Multi-Industria
# ============================================================
# Este script verifica que todo esté listo para deploy
# ============================================================

echo "🔍 VERIFICACIÓN PRE-DEPLOY - Multi-Industria"
echo "=============================================="
echo ""

ERRORS=0
WARNINGS=0

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funciones helper
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

echo "📂 Verificando archivos del backend..."
echo "--------------------------------------"

# Verificar migración
if [ -f "backend/prisma/migrations/20260101205429_add_multi_industry_rubros/migration.sql" ]; then
    check_pass "Migración de rubros existe"
else
    check_fail "Migración de rubros NO encontrada"
fi

# Verificar schema
if [ -f "backend/prisma/schema.prisma" ]; then
    if grep -q "ProductoLote" backend/prisma/schema.prisma; then
        check_pass "Schema actualizado con ProductoLote"
    else
        check_fail "Schema NO contiene ProductoLote"
    fi
else
    check_fail "Schema.prisma NO encontrado"
fi

# Verificar servicio de lotes
if [ -f "backend/src/producto/producto-lote.service.ts" ]; then
    check_pass "ProductoLoteService creado"
else
    check_fail "ProductoLoteService NO encontrado"
fi

# Verificar DTOs
if [ -f "backend/src/producto/dto/lote.dto.ts" ]; then
    check_pass "DTOs de lote creados"
else
    check_fail "DTOs de lote NO encontrados"
fi

# Verificar helper de detección
if [ -f "backend/src/common/utils/rubro-features.ts" ]; then
    check_pass "Helper de detección (backend) creado"
else
    check_fail "Helper de detección (backend) NO encontrado"
fi

# Verificar controller actualizado
if [ -f "backend/src/producto/producto.controller.ts" ]; then
    if grep -q "lotes/por-vencer" backend/src/producto/producto.controller.ts; then
        check_pass "Controller con endpoints de lotes"
    else
        check_warn "Controller sin endpoints de lotes (revisar manualmente)"
    fi
else
    check_fail "ProductoController NO encontrado"
fi

echo ""
echo "📂 Verificando archivos del frontend..."
echo "--------------------------------------"

# Verificar componentes nuevos
if [ -f "frontend/src/pages/admin/kardex/Lotes.tsx" ]; then
    check_pass "Pantalla de gestión de lotes creada"
else
    check_warn "Pantalla de lotes NO encontrada (opcional)"
fi

if [ -f "frontend/src/pages/admin/kardex/ModalCrearLote.tsx" ]; then
    check_pass "Modal de crear lote creado"
else
    check_warn "Modal de crear lote NO encontrado (opcional)"
fi

if [ -f "frontend/src/utils/rubro-features.ts" ]; then
    check_pass "Helper de detección (frontend) creado"
else
    check_fail "Helper de detección (frontend) NO encontrado"
fi

echo ""
echo "🔧 Verificando build del backend..."
echo "-----------------------------------"

cd backend 2>/dev/null
if [ $? -eq 0 ]; then
    if [ -d "node_modules" ]; then
        check_pass "node_modules existe"
    else
        check_warn "node_modules NO existe, ejecuta: pnpm install"
    fi
    
    # Intentar compilar (solo check, sin ejecutar)
    if command -v pnpm &> /dev/null; then
        echo "Ejecutando build test..."
        pnpm run build > /tmp/build_test.log 2>&1
        if [ $? -eq 0 ]; then
            check_pass "Build del backend exitoso"
        else
            check_fail "Build del backend FALLÓ (ver /tmp/build_test.log)"
        fi
    else
        check_warn "pnpm no disponible, no se pudo verificar build"
    fi
    cd ..
else
    check_fail "Directorio backend/ NO encontrado"
fi

echo ""
echo "📊 RESUMEN"
echo "=========="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 TODO LISTO PARA DEPLOY!${NC}"
    echo ""
    echo "Próximos pasos:"
    echo "1. Hacer backup de BD de producción"
    echo "2. Copiar archivos a servidor"
    echo "3. Ejecutar: pnpm exec prisma migrate deploy"
    echo "4. Ejecutar: pnpm run build && pm2 restart backend"
    echo ""
    echo "Ver deploy_checklist.md para instrucciones completas"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  LISTO CON ADVERTENCIAS${NC}"
    echo ""
    echo "Advertencias: $WARNINGS"
    echo "Puedes hacer deploy, pero revisa las advertencias arriba."
    echo ""
    exit 0
else
    echo -e "${RED}❌ NO LISTO PARA DEPLOY${NC}"
    echo ""
    echo "Errores: $ERRORS"
    echo "Advertencias: $WARNINGS"
    echo ""
    echo "Soluciona los errores antes de hacer deploy."
    exit 1
fi
