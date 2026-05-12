import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';
import { supabase } from '../lib/supabase';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data states
  const [rentalsByCategory, setRentalsByCategory] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any[]>([]);
  const [categoryValues, setCategoryValues] = useState<any[]>([]);
  const [searchesMock, setSearchesMock] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
  }, [startDate, endDate]);

  const loadReports = async () => {
    setLoading(true);
    try {
      // Fetch all rentals with items
      let rentalsQuery = supabase.from('rentals').select('*, item:items(title, category, owner_id)');
      if (startDate) rentalsQuery = rentalsQuery.gte('created_at', startDate);
      if (endDate) rentalsQuery = rentalsQuery.lte('created_at', endDate + 'T23:59:59.999Z');
      
      const { data: rentalsData, error: rentalsError } = await rentalsQuery;
      if (rentalsError) throw rentalsError;

      const rentals = rentalsData || [];

      // 1. Alquileres por categoría en un rango de fechas
      const catCount: Record<string, number> = {};
      rentals.forEach(r => {
        const cat = r.item?.category || 'Desconocida';
        catCount[cat] = (catCount[cat] || 0) + 1;
      });
      const catChartData = Object.entries(catCount).map(([name, count]) => ({ name, alquileres: count }));
      setRentalsByCategory(catChartData);

      // 4. Reporte de categorías y valores totales + comisiones
      const catValue: Record<string, number> = {};
      rentals.forEach(r => {
        const cat = r.item?.category || 'Desconocida';
        catValue[cat] = (catValue[cat] || 0) + (r.total_price || 0);
      });
      const catValueData = Object.entries(catValue).map(([name, total]) => ({
        name,
        total: total,
        comision: total * 0.10 // Asumimos 10% de comisión
      }));
      setCategoryValues(catValueData);

      // 3. Búsquedas vs categorías y alquileres (Búsquedas son mockeadas basadas en alquileres para el demo)
      const searchesData = catChartData.map(item => ({
        name: item.name,
        alquileres: item.alquileres,
        busquedas: item.alquileres * (Math.floor(Math.random() * 5) + 2) + Math.floor(Math.random() * 20) // Mock logic
      }));
      setSearchesMock(searchesData);

      // 2. Anuncios vs alquileres de un usuario, alquileres vs calificación
      // Fetch all profiles and items to build the user stats
      const { data: profilesData } = await supabase.from('profiles').select('id, name, rating');
      const { data: itemsData } = await supabase.from('items').select('id, owner_id');
      
      const profiles = profilesData || [];
      const items = itemsData || [];

      const userMap: Record<string, any> = {};
      profiles.forEach(p => {
        userMap[p.id] = { name: p.name, rating: p.rating || 0, itemsCount: 0, rentalsCount: 0 };
      });

      items.forEach(i => {
        if (i.owner_id && userMap[i.owner_id]) {
          userMap[i.owner_id].itemsCount += 1;
        }
      });

      rentals.forEach(r => {
        // Owner of the item got a rental
        if (r.item?.owner_id && userMap[r.item.owner_id]) {
          userMap[r.item.owner_id].rentalsCount += 1;
        }
      });

      const uStats = Object.values(userMap).filter(u => u.itemsCount > 0 || u.rentalsCount > 0);
      setUserStats(uStats);

    } catch (err) {
      console.error('Error loading reports:', err);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Reportes y Estadísticas</h2>
        <div className="flex gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={() => {setStartDate(''); setEndDate('');}} className="text-xs text-gray-500 hover:text-gray-900 mb-1.5 underline">Limpiar filtros</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">Cargando reportes...</div>
      ) : (
        <div className="space-y-12">
          
          {/* Reporte 1 */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">1. Alquileres por Categoría</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rentalsByCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="alquileres" fill="#0f766e" name="Cant. Alquileres" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reporte 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800">2a. Anuncios vs Alquileres (Usuarios)</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="itemsCount" name="Anuncios" />
                    <YAxis type="number" dataKey="rentalsCount" name="Alquileres" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Legend />
                    <Scatter name="Usuarios" data={userStats} fill="#8884d8" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800">2b. Alquileres vs Calificación</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="rentalsCount" name="Alquileres" />
                    <YAxis type="number" dataKey="rating" name="Calificación (0-5)" domain={[0, 5]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Legend />
                    <Scatter name="Usuarios" data={userStats} fill="#82ca9d" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Reporte 3 */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">3. Búsquedas vs Alquileres por Categoría</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={searchesMock}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="busquedas" fill="#8884d8" name="Búsquedas (Estimadas)" />
                  <Bar dataKey="alquileres" fill="#82ca9d" name="Alquileres Reales" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reporte 4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800">4a. Valor Total Generado por Categoría (€)</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryValues} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {categoryValues.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800">4b. Comisiones Recibidas por la Compañía (€)</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryValues}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `€${Number(value).toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="comision" fill="#ffc658" name="Comisión (10%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
