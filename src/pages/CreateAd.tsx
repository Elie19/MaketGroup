import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { adService } from '../services/adService';
import { storageService } from '../services/storageService';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, MapPin, Tag, DollarSign, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export const CreateAd = () => {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Electronics',
    location: '',
  });

  const categories = ['Electronics', 'Real Estate', 'Vehicles', 'Services', 'Jobs', 'Fashion'];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setImageFiles(prev => [...prev, ...newFiles]);
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      // Upload images first
      const uploadedUrls = await Promise.all(
        imageFiles.map(file => storageService.uploadAdImage(file, user.id))
      );

      await adService.createAd({
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        location: formData.location,
        images: uploadedUrls.length > 0 ? uploadedUrls : [`https://picsum.photos/seed/${Date.now()}/800/600`],
        authorId: user.id,
        authorName: profile?.displayName || 'Anonymous'
      });
      navigate('/');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl"
    >
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Create New Ad</h1>
      <p className="mt-2 text-zinc-500 dark:text-zinc-400">Fill in the details below to publish your listing.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <div className="space-y-6 rounded-3xl border border-zinc-200 bg-white p-8 dark:border-white/5 dark:bg-zinc-900">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Ad Title</label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. iPhone 15 Pro Max - Like New"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-zinc-700"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black dark:text-white"
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Price ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  required
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 pl-10 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-zinc-700"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Location</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                required
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="City, Country"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 pl-10 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-zinc-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Description</label>
            <textarea
              required
              rows={6}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what you are selling..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-zinc-700"
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Photos</label>
            
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              <AnimatePresence>
                {previews.map((img, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10"
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 transition-colors hover:border-emerald-500/50 dark:border-white/10 dark:bg-black"
              >
                <Camera className="h-8 w-8 text-zinc-400" />
                <span className="mt-2 text-xs font-medium text-zinc-500">Add Photo</span>
              </button>
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              multiple
              accept="image/*"
              className="hidden"
            />
            
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/5 p-4 text-xs text-emerald-600 dark:text-emerald-500">
              <ImageIcon className="h-4 w-4" />
              <span>You can upload up to 10 photos. PNG, JPG up to 10MB each.</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl px-8 py-4 font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            disabled={loading}
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-12 py-4 font-bold text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Publish Ad
          </button>
        </div>
      </form>
    </motion.div>
  );
};
