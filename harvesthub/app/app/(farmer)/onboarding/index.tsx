import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { colors, spacing, radius } from '../../../constants/theme';
import { TextField } from '../../../components/TextField';
import { TagSelector } from '../../../components/TagSelector';
import { DocumentUploadField } from '../../../components/DocumentUploadField';
import { uploadVerificationDocument } from '../../../lib/storage';
import {
  FARM_TYPE_OPTIONS,
  CERTIFICATION_TYPE_OPTIONS,
  farmerFarmDetailsSchema,
  farmerVerificationSchema,
  flattenFieldErrors,
  type PickedFile,
} from '../../../lib/validation/schemas';
import type { CertificationType, FarmType } from '../../../types/database';

type Step = 'farm-details' | 'verification';

type FarmDetailsForm = {
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  farmTypes: FarmType[];
  yearsInOperation: string;
  taxId: string;
};

type VerificationForm = {
  businessLicenseNumber: string;
  businessLicenseFile: PickedFile | null;
  insuranceFile: PickedFile | null;
  insuranceExpirationDate: string;
  foodSafetyCertFile: PickedFile | null;
  govIdFile: PickedFile | null;
  landProofFile: PickedFile | null;
  referencesText: string;
};

type CertificationEntry = { certType: CertificationType; certName: string; file: PickedFile | null };

const initialFarmDetails: FarmDetailsForm = {
  addressStreet: '',
  addressCity: '',
  addressState: '',
  addressZip: '',
  farmTypes: [],
  yearsInOperation: '',
  taxId: '',
};

const initialVerification: VerificationForm = {
  businessLicenseNumber: '',
  businessLicenseFile: null,
  insuranceFile: null,
  insuranceExpirationDate: '',
  foodSafetyCertFile: null,
  govIdFile: null,
  landProofFile: null,
  referencesText: '',
};

export default function FarmerOnboarding() {
  const { session, farmerProfile, refreshProfile } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('farm-details');
  const [farmDetails, setFarmDetails] = useState<FarmDetailsForm>(initialFarmDetails);
  const [verification, setVerification] = useState<VerificationForm>(initialVerification);
  const [certifications, setCertifications] = useState<CertificationEntry[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Resume at the verification step if farm details were already saved in a
  // previous session. Verification documents themselves aren't resumed —
  // there's nothing meaningful to pre-fill a file picker with from a stored
  // path, so an interrupted verification step just starts its uploads over.
  useEffect(() => {
    if (farmerProfile?.address_street) {
      setFarmDetails({
        addressStreet: farmerProfile.address_street ?? '',
        addressCity: farmerProfile.address_city ?? '',
        addressState: farmerProfile.address_state ?? '',
        addressZip: farmerProfile.address_zip ?? '',
        farmTypes: farmerProfile.farm_types ?? [],
        yearsInOperation: farmerProfile.years_in_operation != null ? String(farmerProfile.years_in_operation) : '',
        taxId: farmerProfile.tax_id ?? '',
      });
      setStep('verification');
    }
  }, [farmerProfile]);

  const updateFarmDetails = (patch: Partial<FarmDetailsForm>) => setFarmDetails((prev) => ({ ...prev, ...patch }));
  const updateVerification = (patch: Partial<VerificationForm>) => setVerification((prev) => ({ ...prev, ...patch }));

  const addCertification = () => setCertifications((prev) => [...prev, { certType: 'organic', certName: '', file: null }]);
  const removeCertification = (index: number) => setCertifications((prev) => prev.filter((_, i) => i !== index));
  const updateCertification = (index: number, patch: Partial<CertificationEntry>) =>
    setCertifications((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const handleNext = async () => {
    setError(null);
    setFieldErrors({});

    const result = farmerFarmDetailsSchema.safeParse(farmDetails);
    if (!result.success) {
      setFieldErrors(flattenFieldErrors(result.error));
      setError('Fix the highlighted fields and try again.');
      return;
    }
    if (!session?.user) return;

    setSaving(true);
    const { error: updateError } = await supabase
      .from('farmer_profiles')
      .update({
        address_street: result.data.addressStreet,
        address_city: result.data.addressCity,
        address_state: result.data.addressState,
        address_zip: result.data.addressZip,
        farm_types: result.data.farmTypes,
        years_in_operation: result.data.yearsInOperation,
        tax_id: result.data.taxId,
      })
      .eq('id', session.user.id);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setStep('verification');
  };

  const handleSubmit = async () => {
    setError(null);
    setFieldErrors({});

    const result = farmerVerificationSchema.safeParse({ ...verification, certifications });
    if (!result.success) {
      setFieldErrors(flattenFieldErrors(result.error));
      setError('Fix the highlighted fields and try again.');
      return;
    }
    if (!session?.user) return;

    setSaving(true);
    try {
      const userId = session.user.id;

      const [businessLicensePath, insurancePath, govIdPath, landProofPath, foodSafetyPath] = await Promise.all([
        uploadVerificationDocument(userId, 'business-license', result.data.businessLicenseFile),
        uploadVerificationDocument(userId, 'insurance', result.data.insuranceFile),
        uploadVerificationDocument(userId, 'gov-id', result.data.govIdFile),
        uploadVerificationDocument(userId, 'land-proof', result.data.landProofFile),
        result.data.foodSafetyCertFile
          ? uploadVerificationDocument(userId, 'food-safety', result.data.foodSafetyCertFile)
          : Promise.resolve(null),
      ]);

      const { error: updateError } = await supabase
        .from('farmer_verification')
        .update({
          business_license_number: result.data.businessLicenseNumber,
          business_license_file_path: businessLicensePath,
          insurance_file_path: insurancePath,
          insurance_expiration_date: result.data.insuranceExpirationDate,
          food_safety_cert_file_path: foodSafetyPath,
          gov_id_file_path: govIdPath,
          land_proof_file_path: landProofPath,
          references_text: result.data.referencesText || null,
        })
        .eq('id', userId);
      if (updateError) throw updateError;

      // Certifications are inserted one at a time because each upload path
      // needs the row's own id (see supabase/migrations/0006) — the id only
      // exists after the insert.
      for (const cert of result.data.certifications) {
        const { data: certRow, error: insertError } = await supabase
          .from('farmer_certifications')
          .insert({ farmer_id: userId, cert_type: cert.certType, cert_name: cert.certName })
          .select('id')
          .single();
        if (insertError) throw insertError;

        const filePath = await uploadVerificationDocument(userId, `certifications/${certRow.id}`, cert.file);
        const { error: certUpdateError } = await supabase
          .from('farmer_certifications')
          .update({ file_path: filePath })
          .eq('id', certRow.id);
        if (certUpdateError) throw certUpdateError;
      }

      const { error: submitError } = await supabase.rpc('submit_farmer_verification');
      if (submitError) throw submitError;

      await refreshProfile();
      router.replace('/(farmer)/pending-review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{step === 'farm-details' ? 'Tell us about your farm' : 'Verification documents'}</Text>
        <Text style={styles.subtitle}>
          {step === 'farm-details'
            ? 'Step 1 of 2 — this stays with your application, not your public profile.'
            : 'Step 2 of 2 — we review these manually before approving your account.'}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {step === 'farm-details' ? (
          <>
            <TextField
              placeholder="Farm street address"
              value={farmDetails.addressStreet}
              onChangeText={(addressStreet) => updateFarmDetails({ addressStreet })}
              error={fieldErrors.addressStreet}
            />
            <TextField
              placeholder="City"
              value={farmDetails.addressCity}
              onChangeText={(addressCity) => updateFarmDetails({ addressCity })}
              error={fieldErrors.addressCity}
            />
            <View style={styles.row}>
              <TextField
                style={styles.flex1}
                placeholder="State"
                value={farmDetails.addressState}
                onChangeText={(addressState) => updateFarmDetails({ addressState })}
                error={fieldErrors.addressState}
              />
              <TextField
                style={styles.flex1}
                placeholder="ZIP code"
                keyboardType="number-pad"
                value={farmDetails.addressZip}
                onChangeText={(addressZip) => updateFarmDetails({ addressZip })}
                error={fieldErrors.addressZip}
              />
            </View>

            <Text style={styles.sectionTitle}>Farm type</Text>
            <TagSelector
              options={FARM_TYPE_OPTIONS}
              value={farmDetails.farmTypes}
              onChange={(farmTypes) => updateFarmDetails({ farmTypes })}
            />
            {fieldErrors.farmTypes ? <Text style={styles.fieldError}>{fieldErrors.farmTypes}</Text> : null}

            <TextField
              placeholder="Years in operation"
              keyboardType="number-pad"
              value={farmDetails.yearsInOperation}
              onChangeText={(yearsInOperation) => updateFarmDetails({ yearsInOperation })}
              error={fieldErrors.yearsInOperation}
            />
            <TextField
              placeholder="Tax ID / EIN"
              value={farmDetails.taxId}
              onChangeText={(taxId) => updateFarmDetails({ taxId })}
              error={fieldErrors.taxId}
            />

            <Pressable style={styles.button} onPress={handleNext} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Next</Text>}
            </Pressable>
          </>
        ) : (
          <>
            <TextField
              placeholder="Business license number"
              value={verification.businessLicenseNumber}
              onChangeText={(businessLicenseNumber) => updateVerification({ businessLicenseNumber })}
              error={fieldErrors.businessLicenseNumber}
            />
            <DocumentUploadField
              label="Business license"
              required
              value={verification.businessLicenseFile}
              onChange={(businessLicenseFile) => updateVerification({ businessLicenseFile })}
            />

            <DocumentUploadField
              label="Liability insurance certificate"
              required
              value={verification.insuranceFile}
              onChange={(insuranceFile) => updateVerification({ insuranceFile })}
            />
            <TextField
              placeholder="Insurance expiration date (YYYY-MM-DD)"
              value={verification.insuranceExpirationDate}
              onChangeText={(insuranceExpirationDate) => updateVerification({ insuranceExpirationDate })}
              error={fieldErrors.insuranceExpirationDate}
            />

            <DocumentUploadField
              label="Food handling / safety certification (if applicable)"
              value={verification.foodSafetyCertFile}
              onChange={(foodSafetyCertFile) => updateVerification({ foodSafetyCertFile })}
            />

            <Text style={styles.sectionTitle}>Certifications</Text>
            {fieldErrors.certifications ? <Text style={styles.fieldError}>{fieldErrors.certifications}</Text> : null}
            {certifications.map((cert, index) => (
              <View key={index} style={styles.certCard}>
                <TagSelector
                  options={CERTIFICATION_TYPE_OPTIONS}
                  value={[cert.certType]}
                  multiple={false}
                  onChange={(next) => updateCertification(index, { certType: next[0] ?? cert.certType })}
                />
                <TextField
                  placeholder="Certification name (e.g. CCOF Organic)"
                  value={cert.certName}
                  onChangeText={(certName) => updateCertification(index, { certName })}
                />
                <DocumentUploadField
                  label="Certificate file"
                  required
                  value={cert.file}
                  onChange={(file) => updateCertification(index, { file })}
                />
                <Pressable onPress={() => removeCertification(index)}>
                  <Text style={styles.remove}>Remove this certification</Text>
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.secondaryButton} onPress={addCertification}>
              <Text style={styles.secondaryButtonText}>+ Add a certification</Text>
            </Pressable>

            <DocumentUploadField
              label="Government-issued ID (owner)"
              required
              value={verification.govIdFile}
              onChange={(govIdFile) => updateVerification({ govIdFile })}
            />
            <DocumentUploadField
              label="Proof of land ownership or lease agreement"
              required
              value={verification.landProofFile}
              onChange={(landProofFile) => updateVerification({ landProofFile })}
            />

            <TextField
              placeholder="References — other markets or co-ops you've sold through (optional)"
              multiline
              value={verification.referencesText}
              onChangeText={(referencesText) => updateVerification({ referencesText })}
            />

            <Pressable style={styles.secondaryButton} onPress={() => setStep('farm-details')}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={handleSubmit} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Submit application</Text>}
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { fontSize: 22, fontWeight: '600', color: colors.text, marginBottom: spacing.xs, marginTop: spacing.lg },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
  fieldError: { color: colors.danger, fontSize: 12, marginTop: -spacing.sm, marginBottom: spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex1: { flex: 1 },
  certCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  remove: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  buttonText: { color: colors.white, fontWeight: '600', fontSize: 15 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  secondaryButtonText: { color: colors.text, fontWeight: '500', fontSize: 14 },
});
