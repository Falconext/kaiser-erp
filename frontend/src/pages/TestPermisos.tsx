import React from 'react';
import { useAuthStore } from '@/zustand/auth';
import { hasPermission } from '@/utils/permissions';

export default function TestPermisos() {
  const { auth } = useAuthStore();

  const modulos = [
    'dashboard',
    'productos', 
    'ventas',
    'clientes',
    'comprobantes',
    'kardex',
    'reportes',
    'usuarios',
    'configuracion'
  ];

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm">
      <h1 className="text-2xl font-bold mb-6">Prueba de Sistema de Permisos</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Información del Usuario</h2>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p><strong>Nombre:</strong> {auth?.nombre}</p>
          <p><strong>Email:</strong> {auth?.email}</p>
          <p><strong>Rol:</strong> {auth?.rol}</p>
          <p><strong>Permisos:</strong> {auth?.permisos ? JSON.stringify(auth.permisos) : 'No definidos'}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Permisos por Módulo</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {modulos.map(modulo => (
            <div 
              key={modulo}
              className={`p-3 rounded-lg text-center font-medium ${
                hasPermission(auth, modulo) 
                  ? 'bg-green-100 text-green-800 border border-green-300' 
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              <div className="text-sm uppercase font-bold mb-1">{modulo}</div>
              <div className="text-xs">
                {hasPermission(auth, modulo) ? '✅ Permitido' : '❌ Bloqueado'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Instrucciones de Prueba:</h3>
        <ol className="text-sm text-blue-700 space-y-1">
          <li>1. Revisa que los permisos mostrados coincidan con los definidos para tu usuario</li>
          <li>2. Los módulos en verde deberían aparecer en el sidebar</li>
          <li>3. Los módulos en rojo NO deberían aparecer en el sidebar</li>
          <li>4. Los administradores de empresa tienen acceso completo</li>
        </ol>
      </div>
    </div>
  );
}