import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { X, Save, CheckCircle2, Camera, Loader2, Trash2, AlertCircle, MapPin, Search, Navigation } from 'lucide-react';
import { categories, RentalItem } from '../data';
import { updateItem, deleteItem, uploadImage, geocodeSearch, reverseGeocode, GeoResult } from '../lib/api';
import { useLanguage } from '../LanguageContext';

const categoryKeyMap: Record<string, string> = {
  "Tools": "catTools", "Camping": "catCamping", "Electronics": "catElectronics",
  "Kitchen": "catKitchen", "Sports": "catSports", "Garden": "catGarden", "Photography": "catPhotography",
};

// ─── Location Picker (reutilizado de ListItemModal) ───────────────────────────

interface LocationPickerProps {
  location: string;
  lat: number | null;
  lng: number | null;
  onSelect: (location: string, lat: number, lng: number) => void;
}

function LocationPicker({ location, lat, lng, onSelect }: LocationPickerProps) {
  const [query, setQuery] = useState(location);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const marker = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!showMap) return;
    const loadLeaflet = async () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css'; link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!(window as any).L) {
        await new Promise<void>(res => {
          const s = document.createElement('script');
          s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          s.onload = () => res();
          document.head.appendChild(s);
        });
      }
      if (!mapRef.current || leafletMap.current) return;
      const L = (window as any).L;
      const initLat = lat ?? 40.4168;
      const initLng = lng ?? -3.7038;
      leafletMap.current = L.map(mapRef.current).setView([initLat, initLng], lat ? 14 : 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(leafletMap.current);

      const pinIcon = L.divIcon({
        className: '',
        html: `<div style="background:#0f766e;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
        iconSize: [32, 32], iconAnchor: [16, 32],
      });

      if (lat && lng) {
        marker.current = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(leafletMap.current);
        marker.current.on('dragend', async (e: any) => {
          const { lat: newLat, lng: newLng } = e.target.getLatLng();
          const addr = await reverseGeocode(newLat, newLng);
          onSelect(addr, newLat, newLng); setQuery(addr);
        });
      }

      leafletMap.current.on('click', async (e: any) => {
        const { lat: cLat, lng: cLng } = e.latlng;
        if (marker.current) { marker.current.setLatLng([cLat, cLng]); }
        else {
          marker.current = L.marker([cLat, cLng], { icon: pinIcon, draggable: true }).addTo(leafletMap.current);
          marker.current.on('dragend', async (ev: any) => {
            const { lat: nLat, lng: nLng } = ev.target.getLatLng();
            const addr = await reverseGeocode(nLat, nLng);
            onSelect(addr, nLat, nLng); setQuery(addr);
          });
        }
        const addr = await reverseGeocode(cLat, cLng);
        onSelect(addr, cLat, cLng); setQuery(addr);
      });
    };
    loadLeaflet();
    return () => {
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; marker.current = null; }
    };
  }, [showMap]);

  useEffect(() => {
    if (!leafletMap.current || !lat || !lng) return;
    leafletMap.current.setView([lat, lng], 14);
    const L = (window as any).L;
    if (!L) return;
    if (marker.current) { marker.current.setLatLng([lat, lng]); }
  }, [lat, lng]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await geocodeSearch(val);
      setResults(res); setSearching(false);
    }, 500);
  };

  const handleSelectResult = (r: GeoResult) => {
    const shortName = r.display_name.split(',').slice(0, 3).join(',');
    onSelect(shortName, parseFloat(r.lat), parseFloat(r.lng));
    setQuery(shortName); setResults([]);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(async pos => {
      const addr = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      onSelect(addr, pos.coords.latitude, pos.coords.longitude);
      setQuery(addr); setGeolocating(false);
    }, () => setGeolocating(false));
  };

  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 mb-1 block">Ubicación de recogida</label>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={query} onChange={e => handleQueryChange(e.target.value)}
          placeholder="Busca un barrio, calle o ciudad..."
          className="w-full pl-9 pr-20 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all bg-white" />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          <button type="button" onClick={handleGeolocate} disabled={geolocating} title="Usar mi ubicación"
            className="p-1.5 rounded-lg text-gray-400 hover:text-accent hover:bg-accent/10 transition-colors disabled:opacity-50">
            {geolocating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
          </button>
          <button type="button" onClick={() => setShowMap(v => !v)}
            className={`p-1.5 rounded-lg transition-colors ${showMap ? 'text-accent bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-accent/10'}`}>
            <MapPin size={14} />
          </button>
        </div>
      </div>

      {(results.length > 0 || searching) && (
        <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 relative">
          {searching && <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400"><Loader2 size={12} className="animate-spin" /> Buscando...</div>}
          {results.map((r, i) => (
            <button key={i} type="button" onClick={() => handleSelectResult(r)}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent/5 transition-colors border-b border-gray-50 last:border-0 flex items-start gap-2">
              <MapPin size={13} className="text-accent shrink-0 mt-0.5" />
              <span className="line-clamp-1 text-gray-700">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {lat && lng && !showMap && (
        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
          <MapPin size={11} /> Ubicación en mapa guardada
        </div>
      )}

      {showMap && (
        <>
          <div className="mt-2 rounded-2xl overflow-hidden border border-gray-200" style={{ height: 200 }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-center">Haz clic en el mapa para actualizar la ubicación</p>
        </>
      )}
    </div>
  );
}

// ─── EditItemModal ────────────────────────────────────────────────────────────

export function EditItemModal({ item, onClose, onUpdated }: {
  item: RentalItem; onClose: () => void; onUpdated: () => void;
}) {
  const { t } = useLanguage();
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [price, setPrice] = useState(item.pricePerDay.toString());
  const [category, setCategory] = useState(item.category);
  const [location, setLocation] = useState(item.location);
  const [lat, setLat] = useState<number | null>(item.lat ?? null);
  const [lng, setLng] = useState<number | null>(item.lng ?? null);
  const [features, setFeatures] = useState(item.features.join(', '));
  const [available, setAvailable] = useState(item.available);

  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [existingImages, setExistingImages] = useState<string[]>(item.images);
  const [newPhotos, setNewPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSave = title.trim() && description.trim() && price && category && location.trim();

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const total = existingImages.length + newPhotos.length;
    const added = files.slice(0, 5 - total).map(file => ({ file, preview: URL.createObjectURL(file as Blob) }));
    setNewPhotos(prev => [...prev, ...added]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeExistingImage = (index: number) => setExistingImages(prev => prev.filter((_, i) => i !== index));
  const removeNewPhoto = (index: number) => {
    setNewPhotos(prev => { URL.revokeObjectURL(prev[index].preview); return prev.filter((_, i) => i !== index); });
  };

  const handleUpdate = async () => {
    if (!canSave) return;
    setIsSaving(true); setError(null);
    try {
      let uploadedUrls: string[] = [];
      if (newPhotos.length > 0) {
        setIsUploading(true);
        uploadedUrls = await Promise.all(newPhotos.map(p => uploadImage(p.file, 'FotosProductos')));
        setIsUploading(false);
      }
      const finalImages = [...existingImages, ...uploadedUrls];
      if (finalImages.length === 0) throw new Error('Se requiere al menos una imagen.');

      await updateItem(item.id, {
        title: title.trim(), description: description.trim(),
        pricePerDay: parseFloat(price), category, location: location.trim(),
        lat: lat ?? undefined, lng: lng ?? undefined,
        images: finalImages, features: features.split(',').map(f => f.trim()).filter(Boolean),
        available,
      });
      setIsSuccess(true);
      onUpdated();
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el anuncio');
      setIsUploading(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true); setError(null);
    try {
      await deleteItem(item.id);
      onUpdated(); onClose();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el anuncio');
      setIsDeleting(false); setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}>

        {isSuccess ? (
          <div className="p-12 flex flex-col items-center justify-center text-center min-h-[350px]">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
              <CheckCircle2 size={72} className="text-accent mb-5" />
            </motion.div>
            <h2 className="text-2xl font-semibold mb-2">Anuncio Actualizado</h2>
            <p className="text-gray-500">Tus cambios se han guardado correctamente.</p>
          </div>
        ) : showDeleteConfirm ? (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¿Eliminar anuncio?</h2>
            <p className="text-gray-500 mb-8">Esta acción es permanente y no se puede deshacer.</p>
            <div className="flex gap-3 w-full">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-200">
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-semibold">Editar Anuncio</h2>
                <p className="text-xs text-gray-500 mt-0.5">Modifica los detalles de tu objeto</p>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4" style={{ maxHeight: 'calc(90vh - 160px)' }}>
              {/* Disponibilidad */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <label className="text-sm font-semibold text-gray-900">Disponibilidad</label>
                  <p className="text-xs text-gray-500">¿Se puede alquilar actualmente?</p>
                </div>
                <button onClick={() => setAvailable(!available)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${available ? 'bg-accent' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${available ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Fotos */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Fotos (Máx 5)</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {existingImages.map((img, i) => (
                    <div key={`e-${i}`} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-100 shadow-sm">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeExistingImage(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        <Trash2 size={12} />
                      </button>
                      {i === 0 && <span className="absolute bottom-1 left-1 text-[8px] bg-accent text-white px-1.5 py-0.5 rounded-full font-bold">Principal</span>}
                    </div>
                  ))}
                  {newPhotos.map((photo, i) => (
                    <div key={`n-${i}`} className="relative aspect-square rounded-xl overflow-hidden group border border-accent/20 border-dashed bg-accent/5">
                      <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeNewPhoto(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {(existingImages.length + newPhotos.length) < 5 && (
                    <button onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-accent hover:bg-accent/5 transition-all text-gray-400 hover:text-accent">
                      <Camera size={20} />
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
              </div>

              {/* Título */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Título</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" />
              </div>

              {/* Descripción */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Descripción</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none h-24" />
              </div>

              {/* Precio + Categoría */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Precio/día (€)</label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Categoría</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none bg-white cursor-pointer">
                    {categories.filter(c => c.name !== 'All').map(c => (
                      <option key={c.name} value={c.name}>{t(categoryKeyMap[c.name] as any)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location Picker con mapa */}
              <LocationPicker
                location={location} lat={lat} lng={lng}
                onSelect={(addr, newLat, newLng) => { setLocation(addr); setLat(newLat); setLng(newLng); }}
              />

              {/* Características */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Características (separadas por coma)</label>
                <input type="text" value={features} onChange={e => setFeatures(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>

              {error && <div className="text-red-500 text-xs font-medium text-center">{error}</div>}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
              <button onClick={() => setShowDeleteConfirm(true)} disabled={isSaving}
                className="flex items-center gap-2 text-red-500 hover:text-red-600 font-medium text-sm transition-colors">
                <Trash2 size={16} /> Eliminar
              </button>
              <div className="flex gap-3">
                <button onClick={onClose} className="px-5 py-2.5 rounded-full font-medium text-gray-600 hover:bg-gray-200 transition-colors text-sm">
                  Cancelar
                </button>
                <button onClick={handleUpdate} disabled={!canSave || isSaving}
                  className={`px-8 py-2.5 rounded-full font-semibold flex items-center gap-2 transition-all text-sm ${
                    canSave && !isSaving ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-gray-200 text-gray-400'
                  }`}>
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isUploading ? 'Subiendo...' : isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
