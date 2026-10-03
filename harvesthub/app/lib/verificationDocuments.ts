import type { FarmerVerification } from '../types/database';

// The farmer application's verification documents — shared by the
// application form (app/(farmer)/application.tsx) and the read-only
// "Certifications & documents" screen. `column` is where each document's
// storage path lives on farmer_verification; `storageKey` is its fixed
// filename under the farmer's own folder (0006's path convention —
// re-uploading replaces it). Required-ness matches submit_farmer_verification() (0022).
export const VERIFICATION_DOCUMENTS = [
  { key: 'businessLicense', label: 'Business license', column: 'business_license_file_path', storageKey: 'business-license', required: true },
  { key: 'insurance', label: 'Liability insurance certificate', column: 'insurance_file_path', storageKey: 'insurance', required: true },
  { key: 'govId', label: 'Government-issued ID (owner)', column: 'gov_id_file_path', storageKey: 'gov-id', required: true },
  { key: 'landProof', label: 'Proof of land ownership or lease agreement', column: 'land_proof_file_path', storageKey: 'land-proof', required: true },
  { key: 'foodSafety', label: 'Food handling / safety certification (if applicable)', column: 'food_safety_cert_file_path', storageKey: 'food-safety', required: false },
] as const satisfies readonly { key: string; label: string; column: keyof FarmerVerification; storageKey: string; required: boolean }[];

export type VerificationDocKey = (typeof VERIFICATION_DOCUMENTS)[number]['key'];
export type VerificationDocColumn = (typeof VERIFICATION_DOCUMENTS)[number]['column'];
