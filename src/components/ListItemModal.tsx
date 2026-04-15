import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { X, Upload, CheckCircle2, Camera, Loader2, Trash2, MapPin, Search, Navigation } from 'lucide-react';
import { categories } from '../data';
import { createItem, uploadImage, geocodeSearch, reverseGeocode, GeoResult } from '../lib/api';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../context/AuthContext';

const categoryKeyMap: Record<string, string> = {
  "Tools": "catTools", "Camping": "catCamping", "Electronics": "catElectronics",
  "Kitchen": "catKitchen", "Sports": "catSports", "Garden": "catGarden", "Photography": "catPhotography",
};

// ─── Location Picker ─────────────────────────────────────────────────────────

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

  // Load Leaflet dynamically
  useEffect(() => {
    if (!showMap) return;

    const loadLeaflet = async () => {
      // Load CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Load JS
      if (!(window as any).L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      if (!mapRef.current || leafletMap.current) return;
      const L = (window as any).L;

      const initialLat = lat ?? 40.4168;
      const initialLng = lng ?? -3.7038;

      leafletMap.current = L.map(mapRef.current).setView([initialLat, initialLng], lat ? 14 : 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(leafletMap.current);

      // Custom pin icon
      const pinIcon = L.divIcon({
        className: '',
        html: `<div style="background:#0f766e;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      if (lat && lng) {
        marker.current = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(leafletMap.current);
        marker.current.on('dragend', async (e: any) => {
          const { lat: newLat, lng: newLng } = e.target.getLatLng();
          const addr = await reverseGeocode(newLat, newLng);
          onSelect(addr, newLat, newLng);
          setQuery(addr);
        });
      }

      leafletMap.current.on('click', async (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        if (marker.current) {
          marker.current.setLatLng([clickLat, clickLng]);
        } else {
          marker.current = L.marker([clickLat, clickLng], { icon: pinIcon, draggable: true }).addTo(leafletMap.current);
          marker.current.on('dragend', async (ev: any) => {
            const { lat: newLat, lng: newLng } = ev.target.getLatLng();
            const addr = await reverseGeocode(newLat, newLng);
            onSelect(addr, newLat, newLng);
            setQuery(addr);
          });
        }
        const addr = await reverseGeocode(clickLat, clickLng);
        onSelect(addr, clickLat, clickLng);
        setQuery(addr);
      });
    };

    loadLeaflet();

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        marker.current = null;
      }
    };
  }, [showMap]);

  // Move map when coords change externally
  useEffect(() => {
    if (!leafletMap.current || !lat || !lng) return;
    leafletMap.current.setView([lat, lng], 14);
    const L = (window as any).L;
    if (!L) return;
    if (marker.current) {
      marker.current.setLatLng([lat, lng]);
    } else {
      const pinIcon = L.divIcon({
        className: '',
        html: `<div style="background:#0f766e;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
        iconSize: [32, 32], iconAnchor: [16, 32],
      });
      marker.current = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(leafletMap.current);
    }
  }, [lat, lng]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await geocodeSearch(val);
      setResults(res);
      setSearching(false);
    }, 500);
  };

  const handleSelectResult = (r: GeoResult) => {
    const shortName = r.display_name.split(',').slice(0, 3).join(',');
    onSelect(shortName, parseFloat(r.lat), parseFloat(r.lng));
    setQuery(shortName);
    setResults([]);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const addr = await reverseGeocode(latitude, longitude);
        onSelect(addr, latitude, longitude);
        setQuery(addr);
        setGeolocating(false);
      },
      () => setGeolocating(false)
    );
  };

  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 mb-1 block">Ubicación de recogida</label>

      {/* Search input */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text" value={query} onChange={e => handleQueryChange(e.target.value)}
          placeholder="Busca una calle, barrio o ciudad..."
          className="w-full pl-9 pr-20 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all bg-white"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          <button type="button" onClick={handleGeolocate} disabled={geolocating}
            title="Usar mi ubicación"
            className="p-1.5 rounded-lg text-gray-400 hover:text-accent hover:bg-accent/10 transition-colors disabled:opacity-50">
            {geolocating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
          </button>
          <button type="button" onClick={() => setShowMap(v => !v)}
            className={`p-1.5 rounded-lg transition-colors ${showMap ? 'text-accent bg-accent/10' : 'text-gray-400 hover:text-accent hover:bg-accent/10'}`}
            title="Ver en mapa">
            <MapPin size={14} />
          </button>
        </div>
      </div>

      {/* Autocomplete results */}
      {(results.length > 0 || searching) && (
        <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 relative">
          {searching && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin" /> Buscando...
            </div>
          )}
          {results.map((r, i) => (
            <button key={i} type="button" onClick={() => handleSelectResult(r)}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent/5 transition-colors border-b border-gray-50 last:border-0 flex items-start gap-2">
              <MapPin size={13} className="text-accent shrink-0 mt-0.5" />
              <span className="line-clamp-1 text-gray-700">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Selected location badge */}
      {lat && lng && !showMap && (
        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
          <MapPin size={11} />
          Ubicación seleccionada en el mapa
        </div>
      )}

      {/* Map */}
      {showMap && (
        <div className="mt-2 rounded-2xl overflow-hidden border border-gray-200" style={{ height: 220 }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
      {showMap && (
        <p className="text-[10px] text-gray-400 mt-1 text-center">Haz clic en el mapa para marcar la ubicación exacta de recogida</p>
      )}
    </div>
  );
}

// ─── Main ListItemModal ──────────────────────────────────────────────────────

export function ListItemModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [features, setFeatures] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canPublish = title.trim() && description.trim() && price && category && location.trim();

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.slice(0, 5 - photos.length).map(file => ({
      file, preview: URL.createObjectURL(file as Blob),
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => { URL.revokeObjectURL(prev[index].preview); return prev.filter((_, i) => i !== index); });
  };

  const handlePublish = async () => {
    if (!canPublish) return;
    setIsPublishing(true);
    setPublishError(null);
    try {
      let imageUrls: string[] = [];
      if (photos.length > 0) {
        setUploadingPhotos(true);
        imageUrls = await Promise.all(photos.map(p => uploadImage(p.file, 'FotosProductos')));
        setUploadingPhotos(false);
      }
      const featureList = features.split(',').map(f => f.trim()).filter(f => f.length > 0);
      if (!user) throw new Error('Se requiere inicio de sesión para publicar un objeto.');
      await createItem({
        ownerId: user.id, title: title.trim(), description: description.trim(),
        pricePerDay: parseFloat(price), category, location: location.trim(),
        lat: lat ?? undefined, lng: lng ?? undefined,
        images: imageUrls, features: featureList,
      });
      setIsSuccess(true);
      setTimeout(() => onClose(), 2500);
    } catch (err: any) {
      setPublishError(err.message || 'Error publishing item');
      setUploadingPhotos(false);
    } finally {
      setIsPublishing(false);
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
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
              <CheckCircle2 size={72} className="text-accent mb-5" />
            </motion.div>
            <h2 className="text-2xl font-semibold mb-2">{t('itemPublished')}</h2>
            <p className="text-gray-500">{t('itemPublishedDesc')}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-semibold">{t('listItemTitle')}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{t('listItemSubtitle')}</p>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4" style={{ maxHeight: 'calc(90vh - 160px)' }}>
              {/* Photos */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">{t('addPhotos')}</label>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
                {photos.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map((photo, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-100">
                          <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => removePhoto(i)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                            <Trash2 size={12} />
                          </button>
                          {i === 0 && <span className="absolute bottom-1 left-1 text-[9px] bg-accent text-white px-1.5 py-0.5 rounded-full font-semibold">Principal</span>}
                        </div>
                      ))}
                      {photos.length < 5 && (
                        <button onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-accent hover:bg-accent/5 transition-all cursor-pointer">
                          <Camera size={20} className="text-gray-400" />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 text-center">{photos.length}/5 fotos</p>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-accent hover:bg-accent/5 transition-all cursor-pointer">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                      <Camera size={24} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">{t('addPhotos')}</p>
                    <p className="text-xs text-gray-400 mt-1">{t('addPhotosDesc')}</p>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">{t('itemTitle')}</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all bg-white"
                  placeholder={t('itemTitlePlaceholder') as string} />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">{t('itemDescription')}</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none h-24 bg-white"
                  placeholder={t('itemDescriptionPlaceholder') as string} />
              </div>

              {/* Price + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">{t('pricePerDayLabel')}</label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="1"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all bg-white"
                    placeholder={t('pricePlaceholder') as string} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">{t('categoryLabel')}</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all bg-white appearance-none cursor-pointer">
                    <option value="">{t('selectCategory')}</option>
                    {categories.filter(c => c.name !== 'All').map(c => (
                      <option key={c.name} value={c.name}>{t(categoryKeyMap[c.name] as any)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location Picker */}
              <LocationPicker
                location={location} lat={lat} lng={lng}
                onSelect={(addr, newLat, newLng) => { setLocation(addr); setLat(newLat); setLng(newLng); }}
              />

              {/* Features */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Características</label>
                <input type="text" value={features} onChange={e => setFeatures(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all bg-white"
                  placeholder="Ej: Cargador incluido, Funda, Cable HDMI" />
                <p className="text-[10px] text-gray-400 mt-1">Separa con comas</p>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
              <button onClick={onClose} className="px-5 py-3 rounded-full font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                {t('cancel')}
              </button>
              {publishError && <p className="text-red-500 text-xs mr-auto self-center">{publishError}</p>}
              <button onClick={handlePublish} disabled={!canPublish || isPublishing}
                className={`px-6 py-3 rounded-full font-medium flex items-center gap-2 transition-all ${
                  canPublish && !isPublishing ? 'bg-accent text-white hover:bg-accent-dark shadow-lg shadow-accent/20' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}>
                {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploadingPhotos ? 'Subiendo fotos...' : isPublishing ? 'Publicando...' : t('publishItem')}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
