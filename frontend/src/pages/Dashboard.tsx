import { useAuthStore } from '../zustand/auth'
import Button from '../components/Button'
import { useNavigate } from 'react-router-dom'
import AlertasVencimiento from '../components/AlertasVencimiento'

export function DashboardPage() {
  const { auth, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0D14]">
      <nav className="bg-white dark:bg-slate-800 shadow dark:shadow-none">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Nephi POS</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700 dark:text-slate-200">Bienvenido, {auth?.nombre}</span>
            <Button color="danger" size="sm" onClick={handleLogout}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard title="Comprobantes" value="0" icon="📄" />
          <DashboardCard title="Productos" value="0" icon="📦" />
          <DashboardCard title="Clientes" value="0" icon="👥" />
          <DashboardCard title="Ingresos" value="S/ 0.00" icon="💰" />
        </div>

        {/* Alertas de vencimiento solo para admin sistema */}
        {auth?.rol === 'ADMIN_SISTEMA' && (
          <div className="mt-8">
            <AlertasVencimiento diasAntes={7} className="mb-6" />
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-none p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Próximamente</h2>
            <p className="text-gray-500 dark:text-gray-400">Gráficos y más funcionalidades</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-none p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Información</h2>
            <p className="text-gray-500 dark:text-gray-400">
              {auth?.rol === 'ADMIN_SISTEMA'
                ? 'Administrador del Sistema'
                : `Empresa: ${auth?.empresa?.razonSocial}`}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

interface DashboardCardProps {
  title: string
  value: string
  icon: string
}

function DashboardCard({ title, value, icon }: DashboardCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-none p-6">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-gray-500 dark:text-gray-400 text-sm">{title}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
    </div>
  )
}
