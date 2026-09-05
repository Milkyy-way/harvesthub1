import * as DocumentPicker from 'expo-document-picker';
import { supabase } from './supabase';
import type { PickedFile } from './validation/schemas';

const FARMER_PHOTOS_BUCKET = 'farmer-photos';
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/heic'];

// Returns null if the user cancels the picker — callers should treat that as
// "no change", not an error. Both iOS's and Android's system document
// picker expose a photo-library/gallery option, so this covers "upload from
// gallery" without adding a new dependency (expo-image-picker) — true in-app
// camera capture would need one if that's ever required.
export async function pickFarmPhoto(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ALLOWED_IMAGE_TYPES,
    multiple: false,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return { uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size };
}

function extensionFor(file: PickedFile) {
  const fromName = file.name.split('.').pop();
  if (fromName && fromName !== file.name) return fromName.toLowerCase();
  if (file.mimeType === 'image/png') return 'png';
  return 'jpg';
}

// Unlike lib/storage.ts's verification docs, this returns a PUBLIC url —
// customers browsing the feed load it directly and are never the owning
// farmer. Path convention (fixed filename, so re-upload is an upsert)
// matches the storage RLS policies in
// supabase/migrations/0009_farmer_geo_and_photo.sql.
export async function uploadFarmPhoto(userId: string, file: PickedFile): Promise<string> {
  const path = `${userId}/farm-photo.${extensionFor(file)}`;

  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType ?? 'image/jpeg',
  } as unknown as Blob);

  const { error } = await supabase.storage.from(FARMER_PHOTOS_BUCKET).upload(path, formData, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(FARMER_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
