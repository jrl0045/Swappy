import { useState, useEffect } from 'react';
import { ShieldAlert, Users, Package, Tags, CheckCircle, Ban, Edit, Plus, X, Lock } from 'lucide-react';
import { fetchProfilesPaginated, fetchItemsAdminPaginated, updateUserBanStatus, updateItemActiveStatus, fetchCategories, createCategory, updateCategory, ProfileData } from '../lib/api';
import { RentalItem, Category } from '../data';
import { useAuth } from '../context/AuthContext';

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'users' | 'items' | 'categories'>('users');
  const [users, setUsers] = useState<ProfileData[]>([]);
  const [items, setItems] = useState<RentalItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Category Edit State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const [userPage, setUserPage] = useState(1);
  const [itemPage, setItemPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => {
    loadData();
  }, [activeTab, userPage, itemPage]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const { data, count } = await fetchProfilesPaginated(userPage, PAGE_SIZE);
        setUsers(data);
        setTotalUsers(count);
      } else if (activeTab === 'items') {
        const { data, count } = await fetchItemsAdminPaginated(itemPage, PAGE_SIZE);
        setItems(data);
        setTotalItems(count);
      } else if (activeTab === 'categories') {
        const c = await fetchCategories();
        setCategoriesList(c);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const toggleUserBan = async (user: ProfileData) => {
    const isBanned = user.isBanned;
    await updateUserBanStatus(user.id, !isBanned);
    setUsers(users.map(u => u.id === user.id ? { ...u, isBanned: !isBanned } : u));
  };

  const toggleItemActive = async (item: RentalItem) => {
    const isActive = item.isActive !== false;
    await updateItemActiveStatus(item.id, !isActive);
    setItems(items.map(i => i.id === item.id ? { ...i, isActive: !isActive } : i));
  };

  const toggleCategoryActive = async (cat: Category) => {
    if (!cat.id) return;
    const isActive = cat.isActive !== false;
    await updateCategory(cat.id, { isActive: !isActive });
    setCategoriesList(categoriesList.map(c => c.id === cat.id ? { ...c, isActive: !isActive } : c));
  };

  const handleSaveCategory = async () => {
    if (editingCategory?.id) {
      await updateCategory(editingCategory.id, { name: newCatName, icon: newCatIcon });
    } else {
      await createCategory(newCatName, newCatIcon);
    }
    setEditingCategory(null);
    setIsCreatingCategory(false);
    setNewCatName('');
    setNewCatIcon('');
    loadData();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-red-100 text-red-600 rounded-xl">
          <ShieldAlert size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-sm text-gray-500">Gestiona usuarios, publicaciones y categorías</p>
        </div>
      </div>

      <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-6 border-b border-gray-200 pb-2">
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-medium rounded-full flex items-center gap-2 transition-colors ${activeTab === 'users' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <Users size={16} /> Usuarios
        </button>
        <button onClick={() => setActiveTab('items')} className={`px-4 py-2 text-sm font-medium rounded-full flex items-center gap-2 transition-colors ${activeTab === 'items' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <Package size={16} /> Publicaciones
        </button>
        <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 text-sm font-medium rounded-full flex items-center gap-2 transition-colors ${activeTab === 'categories' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <Tags size={16} /> Categorías
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">Cargando datos...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-medium text-gray-900">Usuario</th>
                    <th className="px-6 py-4 font-medium text-gray-900">Email/ID</th>
                    <th className="px-6 py-4 font-medium text-gray-900 text-center">Estado</th>
                    <th className="px-6 py-4 font-medium text-gray-900 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 flex items-center gap-3">
                        <img src={u.avatarUrl || 'https://via.placeholder.com/40'} alt={u.name} className="w-8 h-8 rounded-full object-cover bg-gray-100" />
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          {u.isAdmin && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Admin</span>}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-500 font-mono text-xs">{u.id.split('-')[0]}...</td>
                      <td className="px-6 py-3">
                        <div className="flex justify-center">
                          {u.isBanned ? <Ban className="text-red-500" size={18} /> : <CheckCircle className="text-green-500" size={18} />}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button onClick={() => toggleUserBan(u)} disabled={u.isAdmin} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${u.isBanned ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'} ${u.isAdmin && 'opacity-50 cursor-not-allowed'}`}>
                          {u.isBanned ? 'Restaurar' : 'Bloquear'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalUsers > PAGE_SIZE && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
                  <span className="text-sm text-gray-500">
                    Mostrando {(userPage - 1) * PAGE_SIZE + 1} a {Math.min(userPage * PAGE_SIZE, totalUsers)} de {totalUsers}
                  </span>
                  <div className="flex items-center gap-2">
                    <button disabled={userPage === 1} onClick={() => setUserPage(userPage - 1)} className="px-3 py-1 rounded-md text-sm bg-white border border-gray-300 disabled:opacity-50">Anterior</button>
                    <button disabled={userPage * PAGE_SIZE >= totalUsers} onClick={() => setUserPage(userPage + 1)} className="px-3 py-1 rounded-md text-sm bg-white border border-gray-300 disabled:opacity-50">Siguiente</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'items' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-medium text-gray-900">Objeto</th>
                    <th className="px-6 py-4 font-medium text-gray-900">Propietario</th>
                    <th className="px-6 py-4 font-medium text-gray-900 text-center">Estado</th>
                    <th className="px-6 py-4 font-medium text-gray-900 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 flex items-center gap-3">
                        <img src={item.images[0] || 'https://via.placeholder.com/40'} alt={item.title} className="w-8 h-8 rounded-md object-cover bg-gray-100" />
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{item.title}</p>
                      </td>
                      <td className="px-6 py-3 text-gray-500">{item.owner.name}</td>
                      <td className="px-6 py-3">
                        <div className="flex justify-center">
                          {item.isActive !== false ? <CheckCircle className="text-green-500" size={18} /> : <Ban className="text-red-500" size={18} />}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button onClick={() => toggleItemActive(item)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${item.isActive !== false ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                          {item.isActive !== false ? 'Inactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalItems > PAGE_SIZE && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
                  <span className="text-sm text-gray-500">
                    Mostrando {(itemPage - 1) * PAGE_SIZE + 1} a {Math.min(itemPage * PAGE_SIZE, totalItems)} de {totalItems}
                  </span>
                  <div className="flex items-center gap-2">
                    <button disabled={itemPage === 1} onClick={() => setItemPage(itemPage - 1)} className="px-3 py-1 rounded-md text-sm bg-white border border-gray-300 disabled:opacity-50">Anterior</button>
                    <button disabled={itemPage * PAGE_SIZE >= totalItems} onClick={() => setItemPage(itemPage + 1)} className="px-3 py-1 rounded-md text-sm bg-white border border-gray-300 disabled:opacity-50">Siguiente</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="p-4">
              <button onClick={() => { setIsCreatingCategory(true); setEditingCategory(null); setNewCatName(''); setNewCatIcon(''); }} className="mb-4 bg-accent text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-accent-dark">
                <Plus size={16} /> Nueva Categoría
              </button>

              {(isCreatingCategory || editingCategory) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-end gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre</label>
                    <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Ej. Deportes" />
                  </div>
                  <div className="w-32 shrink-0">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Icono (Emoji)</label>
                    <input type="text" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center" placeholder="⚽" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveCategory} disabled={!newCatName.trim()} className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50">Guardar</button>
                    <button onClick={() => { setIsCreatingCategory(false); setEditingCategory(null); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm"><X size={16} /></button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoriesList.map(cat => (
                  <div key={cat.id} className={`p-4 rounded-xl border flex items-center justify-between ${cat.isActive === false ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat.icon}</span>
                      <div>
                        <p className="font-semibold text-gray-900">{cat.name}</p>
                        {cat.isActive === false && <span className="text-[10px] text-red-500 font-bold flex items-center gap-1"><Ban size={10} /> INACTIVA</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingCategory(cat); setNewCatName(cat.name); setNewCatIcon(cat.icon || ''); }} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => toggleCategoryActive(cat)} className={`p-2 rounded-lg transition-colors ${cat.isActive === false ? 'text-green-500 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'}`} title={cat.isActive === false ? 'Activar' : 'Inactivar'}>
                        {cat.isActive === false ? <CheckCircle size={16} /> : <Ban size={16} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
