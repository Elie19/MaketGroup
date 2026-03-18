import { supabase } from '../supabase';
import { handleSupabaseError, OperationType } from '../lib/utils';

export const storageService = {
  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      if (error.message.includes('bucket not found')) {
        console.error(`CRITICAL: Storage bucket "${bucket}" not found. Please create it in your Supabase Dashboard under Storage.`);
      }
      await handleSupabaseError(error, OperationType.WRITE, `storage/${bucket}/${path}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return publicUrl;
  },

  async uploadAdImage(file: File, userId: string) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    return this.uploadFile('ads', filePath, file);
  }
};
