import React, { useState, useEffect } from 'react';
import { Loader2, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { fetchAllPayoutRequestsAdmin, updatePayoutRequestStatus, PayoutRequestData } from '../lib/api';
import { useToast } from '../context/ToastContext';

export function AdminPayouts() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutRequestData[]>([]);
  const [filter, setFilter] = useState<'pending' | 'completed'>('pending');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllPayoutRequestsAdmin();
      setPayouts(data);
    } catch (error) {
      console.error(error);
      showToast('Error cargando solicitudes de monetización', 'error');
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (id: string, newStatus: 'in_progress' | 'paid') => {
    try {
      await updatePayoutRequestStatus(id, newStatus);
      showToast(`Estado actualizado a ${newStatus === 'paid' ? 'Monetizado' : 'En Progreso'}`, 'success');
      loadData();
    } catch (error) {
      console.error(error);
      showToast('Error al actualizar estado', 'error');
    }
  };

  const filteredPayouts = payouts.filter(p => 
    filter === 'pending' ? (p.status === 'pending' || p.status === 'in_progress') : p.status === 'paid'
  );

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${filter === 'pending' ? 'bg-accent/10 text-accent border-b-2 border-accent' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Bandeja de Entrada
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${filter === 'completed' ? 'bg-accent/10 text-accent border-b-2 border-accent' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Historial de Pagos
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-sm text-gray-500">
                <th className="pb-3 font-medium">Fecha y Hora</th>
                <th className="pb-3 font-medium">Usuario</th>
                <th className="pb-3 font-medium">Valor Neto (A Pagar)</th>
                <th className="pb-3 font-medium">Estado</th>
                <th className="pb-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {filteredPayouts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No hay solicitudes en esta sección.
                  </td>
                </tr>
              )}
              {filteredPayouts.map(p => {
                const netAmount = p.amountRequested - p.commissionDeducted;
                return (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                    <td className="py-4 whitespace-nowrap">{new Date(p.createdAt).toLocaleString()}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        {p.userAvatar ? (
                          <img src={p.userAvatar} alt={p.userName} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold">
                            {(p.userName || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium">{p.userName}</span>
                      </div>
                    </td>
                    <td className="py-4 font-bold text-gray-900">${netAmount.toFixed(2)}</td>
                    <td className="py-4">
                      {p.status === 'paid' && <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-medium">Monetizado el {new Date(p.paidAt!).toLocaleDateString()}</span>}
                      {p.status === 'in_progress' && <span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs font-medium">En Progreso</span>}
                      {p.status === 'pending' && <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded-full text-xs font-medium">Pendiente</span>}
                    </td>
                    <td className="py-4">
                      {p.status === 'pending' && (
                        <button 
                          onClick={() => handleUpdateStatus(p.id, 'in_progress')}
                          className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg hover:bg-yellow-200 transition-colors font-medium text-xs"
                        >
                          <Clock size={14} /> Marcar en progreso
                        </button>
                      )}
                      {p.status === 'in_progress' && (
                        <button 
                          onClick={() => {
                            if (window.confirm('¿Confirmas que el pago ha sido realizado con éxito?')) {
                              handleUpdateStatus(p.id, 'paid');
                            }
                          }}
                          className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors font-medium text-xs"
                        >
                          <CheckCircle size={14} /> Confirmar Pago
                        </button>
                      )}
                      {p.status === 'paid' && <span className="text-gray-400 text-xs">--</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
