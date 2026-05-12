import { useState, useEffect } from 'react';
import { fetchAllMessagesAdmin, MessageData } from '../lib/api';

export function AdminConversations() {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [senderFilter, setSenderFilter] = useState('');
  const [receiverFilter, setReceiverFilter] = useState('');

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await fetchAllMessagesAdmin();
      setMessages(data);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
    setLoading(false);
  };

  const filteredMessages = messages.filter(m => {
    const sName = m.senderName.toLowerCase();
    const rName = m.receiverName.toLowerCase();
    const sFilter = senderFilter.toLowerCase();
    const rFilter = receiverFilter.toLowerCase();

    return sName.includes(sFilter) && rName.includes(rFilter);
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Conversaciones</h2>
          <p className="text-sm text-gray-500">Consulta los mensajes intercambiados en la plataforma</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Filtrar por remitente..." 
            value={senderFilter}
            onChange={(e) => setSenderFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full md:w-48"
          />
          <input 
            type="text" 
            placeholder="Filtrar por receptor..." 
            value={receiverFilter}
            onChange={(e) => setReceiverFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full md:w-48"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">Cargando conversaciones...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-900">Fecha</th>
                <th className="px-6 py-4 font-medium text-gray-900">Remitente</th>
                <th className="px-6 py-4 font-medium text-gray-900">Receptor</th>
                <th className="px-6 py-4 font-medium text-gray-900">Objeto</th>
                <th className="px-6 py-4 font-medium text-gray-900">Mensaje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron mensajes con esos filtros.
                  </td>
                </tr>
              ) : (
                filteredMessages.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-gray-500 text-xs">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <img src={m.senderAvatar || 'https://via.placeholder.com/24'} className="w-6 h-6 rounded-full bg-gray-100 object-cover" alt="" />
                        <span className="font-medium text-gray-900">{m.senderName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <img src={m.receiverAvatar || 'https://via.placeholder.com/24'} className="w-6 h-6 rounded-full bg-gray-100 object-cover" alt="" />
                        <span className="font-medium text-gray-900">{m.receiverName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-600 truncate max-w-[150px]">
                      {m.itemTitle || '-'}
                    </td>
                    <td className="px-6 py-3 text-gray-800 max-w-xs truncate" title={m.content}>
                      {m.content.startsWith('__RENTAL_REQUEST__') ? (
                        <span className="text-accent font-semibold italic">Solicitud de alquiler</span>
                      ) : (
                        m.content
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
