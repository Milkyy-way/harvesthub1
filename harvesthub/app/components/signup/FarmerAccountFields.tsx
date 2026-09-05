import { TextField } from '../TextField';

export interface FarmerAccountFormValues {
  farmName: string;
  ownerFullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export const initialFarmerAccountFormValues: FarmerAccountFormValues = {
  farmName: '',
  ownerFullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

type Props = {
  value: FarmerAccountFormValues;
  onChange: (patch: Partial<FarmerAccountFormValues>) => void;
  errors: Record<string, string>;
};

export function FarmerAccountFields({ value, onChange, errors }: Props) {
  return (
    <>
      <TextField
        placeholder="Farm / business name"
        value={value.farmName}
        onChangeText={(farmName) => onChange({ farmName })}
        error={errors.farmName}
      />
      <TextField
        placeholder="Owner / contact full name"
        value={value.ownerFullName}
        onChangeText={(ownerFullName) => onChange({ ownerFullName })}
        error={errors.ownerFullName}
      />
      <TextField
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={value.email}
        onChangeText={(email) => onChange({ email })}
        error={errors.email}
      />
      <TextField
        placeholder="Phone number"
        autoComplete="tel"
        keyboardType="phone-pad"
        value={value.phone}
        onChangeText={(phone) => onChange({ phone })}
        error={errors.phone}
      />
      <TextField
        placeholder="Password (min 8 characters)"
        secureTextEntry
        autoComplete="password-new"
        value={value.password}
        onChangeText={(password) => onChange({ password })}
        error={errors.password}
      />
      <TextField
        placeholder="Confirm password"
        secureTextEntry
        autoComplete="password-new"
        value={value.confirmPassword}
        onChangeText={(confirmPassword) => onChange({ confirmPassword })}
        error={errors.confirmPassword}
      />
    </>
  );
}
