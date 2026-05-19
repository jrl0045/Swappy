import { useState, useEffect } from 'react';
import { fetchUserFinancialReports } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, CreditCard } from 'lucide-react';

export function UserReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ totalSpent: number; totalEarned: number; earningsByItem: any[] } | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserFinancialReports(user.id).then(res => {
        setData(res);
        setLoading(false);
      });
    }
  }, [user]);

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="animate-spin text-accent" size={24} /></div>;
  }

  if (!data) return null;

  return (
    <div className="mb-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Report 1: Total Alquileres Pagados */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <CreditCard className="text-red-500" size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Gastado en Alquileres</p>
            <h3 className="text-2xl font-bold text-gray-900">€{data.totalSpent.toFixed(2)}</h3>
          </div>
        </div>

        {/* Report 2: Total Beneficios (Dueño) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <TrendingUp className="text-emerald-500" size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Beneficios Totales (Como Dueño)</p>
            <h3 className="text-2xl font-bold text-emerald-600">€{data.totalEarned.toFixed(2)}</h3>
          </div>
        </div>
      </div>

      {/* Report 3: Beneficios por Publicación */}
      {data.earningsByItem.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Beneficios por Publicación</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.earningsByItem} margin={{ top: 10, right: 10, bottom: 20, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="title" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => `€${val}`} />
                <Tooltip formatter={(val: number) => [`€${val.toFixed(2)}`, 'Beneficios']} />
                <Bar dataKey="total" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
