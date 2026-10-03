import * as DocumentPicker from 'expo-document-picker';
import { supabase } from './supabase';
import type { PickedFile } from './validation/schemas';

const VERIFICATION_DOCS_BUCKET = 'farmer-verification-docs';
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'];

// Returns null if the user cancels the picker — callers should treat that as
// "no change", not an error.
export async function pickVerificationDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ALLOWED_MIME_TYPES,
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
  if (file.mimeType === 'application/pdf') return 'pdf';
  if (file.mimeType === 'image/png') return 'png';
  return 'jpg';
}

// `docKey` becomes the object path under the farmer's own uid folder, e.g.
// 'business-license', 'insurance', or 'certifications/<cert row id>' for the
// one genuinely 1:many document type. Matches the path convention fixed by
// the storage RLS policies in 0006_storage_farmer_verification.sql.
export async function uploadVerificationDocument(userId: string, docKey: string, file: PickedFile): Promise<string> {
  const path = `${userId}/${docKey}.${extensionFor(file)}`;

  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType ?? 'application/octet-stream',
  } as unknown as Blob);

  const { error } = await supabase.storage.from(VERIFICATION_DOCS_BUCKET).upload(path, formData, { upsert: true });
  if (error) throw error;

  return path;
}

// A short-lived link for the farmer to view one of their own private
// documents (0006's storage policy lets a farmer read only their folder).
export async function getVerificationDocumentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(VERIFICATION_DOCS_BUCKET).createSignedUrl(path, 60);
  if (error || !data) throw error ?? new Error('Could not open the document.');
  return data.signedUrl;
}

// Best-effort cleanup (e.g. a certification the farmer removed) — a failed
// delete only leaves an orphaned private file behind, so it never throws.
export async function removeVerificationDocument(path: string): Promise<void> {
  const { error } = await supabase.storage.from(VERIFICATION_DOCS_BUCKET).remove([path]);
  if (error) console.warn('Could not remove verification document:', error.message);
}
