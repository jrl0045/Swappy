import { useState, useRef, type ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { X, Save, Loader2, User, MapPin, FileText, Camera } from 'lucide-react';
import { ProfileData, updateProfile, uploadImage } from '../lib/api';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../context/AuthContext';

export function EditProfileModal({ profile, onClose, onSaved }: { 
  profile: ProfileData; 
  onClose: () => void;
  onSaved: (updated: ProfileData) => void;
}) {
  const { t } = useLanguage();
  const { refreshProfile } = useAuth();
  const [name, setName] = useState(profile.name);
  const [location, setLocation] = useState(profile.location);
  const [bio, setBio] = useState(profile.bio);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      let finalAvatarUrl = profile.avatarUrl;

      if (avatarFile) {
        setIsUploading(true);
        finalAvatarUrl = await uploadImage(avatarFile, 'FotosPerfil');
        setIsUploading(false);
      }

      await updateProfile(profile.id, {
        name: name.trim(),
        location: location.trim(),
        bio: bio.trim(),
        avatarUrl: finalAvatarUrl,
      });
      await refreshProfile();
      onSaved({
        ...profile,
        name: name.trim(),
        location: location.trim(),
        bio: bio.trim(),
        avatarUrl: finalAvatarUrl,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error guardando perfil');
      setIsUploading(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{t('editProfile')}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Avatar preview */}
          <div className="flex justify-center">
            <div className="relative group">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <img 
                src={avatarPreview || profile.avatarUrl} 
                alt={name} 
                className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white"
              >
                <Camera size={24} />
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
              <User size={12} />
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all bg-white"
              placeholder="Tu nombre"
            />
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
              <MapPin size={12} />
              Ubicación
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all bg-white"
              placeholder="Ciudad, Barrio"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
              <FileText size={12} />
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none h-24 bg-white"
              placeholder="Cuéntanos algo sobre ti..."
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-3 rounded-full font-medium text-gray-600 hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className={`px-6 py-3 rounded-full font-medium flex items-center gap-2 transition-all ${
              name.trim() && !isSaving
                ? 'bg-accent text-white hover:bg-accent-dark shadow-lg shadow-accent/20'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isUploading ? 'Subiendo foto...' : isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
