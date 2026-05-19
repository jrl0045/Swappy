import React, { useState, useEffect } from 'react';
import { Loader2, DollarSign, FileText } from 'lucide-react';
import { fetchUserPayoutRequests, fetchUnpaidCompletedRentals, createPayoutRequest, PayoutRequestData, RentalWithDetails } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function UserPayouts() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutRequestData[]>([]);
  const [unpaidRentals, setUnpaidRentals] = useState<RentalWithDetails[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [pData, uData] = await Promise.all([
        fetchUserPayoutRequests(user.id),
        fetchUnpaidCompletedRentals(user.id)
      ]);
      setPayouts(pData);
      setUnpaidRentals(uData);
    } catch (error) {
      console.error(error);
      showToast('Error cargando monetizaciones', 'error');
    }
    setLoading(false);
  };

   const handleRequestPayout = async () => {
    if (!user || unpaidRentals.length === 0 || submitting) return;
    
    const hasActiveRequest = payouts.some(p => p.status === 'pending' || p.status === 'in_progress');
    if (hasActiveRequest) {
      showToast('Ya tienes una solicitud en curso.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const totalAmount = unpaidRentals.reduce((sum, r) => sum + r.totalPrice, 0);
      const commission = totalAmount * 0.10; // 10% commission

      await createPayoutRequest(user.id, totalAmount, commission, unpaidRentals.map(r => r.id));
      showToast('Solicitud de monetización enviada.', 'success');
      loadData();
    } catch (error) {
      console.error(error);
      showToast('Error al crear solicitud.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = (payout: PayoutRequestData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rentalsHtml = payout.rentals?.map(r => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">#ALQ-${r.id.substring(0, 4).toUpperCase()}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${r.itemTitle}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${new Date(r.endDate).toLocaleDateString()}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">$${r.totalPrice.toFixed(2)}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">$${(r.totalPrice * 0.1).toFixed(2)}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">$0.00</td>
        <td style="border: 1px solid #ddd; padding: 8px;"><b>$${(r.totalPrice * 0.9).toFixed(2)}</b></td>
      </tr>
    `).join('') || '';

    const html = `
      <html>
        <head>
          <title>Justificante de Pago</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f4f4f4; text-align: left; padding: 8px; border: 1px solid #ddd; }
            .header { border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 20px; }
            .total { text-align: right; margin-top: 20px; font-size: 1.2em; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Swappy - Justificante de Monetización</h2>
            <p><strong>ID de Solicitud:</strong> ${payout.id}</p>
            <p><strong>Fecha de Emisión:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nro. Alquiler</th>
                <th>Objeto / Ítem</th>
                <th>Fecha Devolución</th>
                <th>Valor Alquiler</th>
                <th>Comisión App (-)</th>
                <th>Seguro (-)</th>
                <th>Subtotal Neto</th>
              </tr>
            </thead>
            <tbody>
              ${rentalsHtml}
            </tbody>
          </table>
          <div class="total">
            VALOR TOTAL TRANSFERIDO: $${(payout.amountRequested - payout.commissionDeducted).toFixed(2)}
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-accent" /></div>;

  const hasActiveRequest = payouts.some(p => p.status === 'pending' || p.status === 'in_progress');
  const totalUnpaid = unpaidRentals.reduce((sum, r) => sum + r.totalPrice, 0);
  const unpaidCommission = totalUnpaid * 0.10;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="text-accent" /> Mis Monetizaciones
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-sm text-gray-500">
                <th className="pb-3 font-medium">Fecha y Hora Solicitud</th>
                <th className="pb-3 font-medium">Valor Bruto</th>
                <th className="pb-3 font-medium">Comisión Plataforma</th>
                <th className="pb-3 font-medium">Valor Neto Esperado</th>
                <th className="pb-3 font-medium">Estado</th>
                <th className="pb-3 font-medium">Fecha de Pago</th>
                <th className="pb-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {payouts.map(p => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                  <td className="py-4">{new Date(p.createdAt).toLocaleString()}</td>
                  <td className="py-4">${p.amountRequested.toFixed(2)}</td>
                  <td className="py-4 text-red-500">-${p.commissionDeducted.toFixed(2)} (10%)</td>
                  <td className="py-4 font-bold text-gray-900">${(p.amountRequested - p.commissionDeducted).toFixed(2)}</td>
                  <td className="py-4">
                    {p.status === 'paid' && <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Monetizado</span>}
                    {p.status === 'in_progress' && <span className="inline-flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> En Progreso</span>}
                    {p.status === 'pending' && <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Pendiente</span>}
                  </td>
                  <td className="py-4">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '--'}</td>
                  <td className="py-4">
                    <button 
                      onClick={() => handlePrint(p)}
                      disabled={p.status !== 'paid'}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors ${p.status === 'paid' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'text-gray-400 cursor-not-allowed'}`}
                    >
                      <FileText size={14} /> Justificante
                    </button>
                  </td>
                </tr>
              ))}

              {/* Fila "Ahora" */}
              {!hasActiveRequest && unpaidRentals.length > 0 && (
                <tr className="bg-accent/5 border-l-4 border-l-accent">
                  <td className="py-4 px-3 font-bold text-accent">Ahora</td>
                  <td className="py-4 font-medium">${totalUnpaid.toFixed(2)}</td>
                  <td className="py-4 text-red-500 font-medium">-${unpaidCommission.toFixed(2)} (10%)</td>
                  <td className="py-4 font-bold text-gray-900">${(totalUnpaid - unpaidCommission).toFixed(2)}</td>
                  <td className="py-4 text-gray-400 italic">No solicitado</td>
                  <td className="py-4 text-gray-400">--</td>
                  <td className="py-4 pr-3">
                    <button 
                      onClick={handleRequestPayout}
                      disabled={submitting}
                      className="bg-accent hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-medium shadow-sm transition-colors text-xs whitespace-nowrap disabled:opacity-50"
                    >
                      {submitting ? 'Enviando...' : 'Solicitar Ya'}
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {payouts.length === 0 && unpaidRentals.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              No tienes pagos pendientes ni historial de monetizaciones.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
