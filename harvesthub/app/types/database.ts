export type UserRole = 'customer' | 'farmer' | 'admin';
export type ProfileStatus = 'active' | 'pending_verification' | 'rejected' | 'suspended';

export interface Profile {
  id: string;
  role: UserRole;
  status: ProfileStatus;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

export type DietaryPreference = 'organic' | 'local_only' | 'vegetarian' | 'vegan' | 'gluten_free' | 'dairy_free';
export type ProduceInterest = 'vegetables' | 'fruits' | 'eggs' | 'dairy' | 'meat' | 'herbs' | 'flowers' | 'honey';
export type ReferralSource = 'friend' | 'social_media' | 'search' | 'market_event' | 'other';

export interface CustomerProfile {
  id: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  latitude: number | null;
  longitude: number | null;
  dietary_preferences: DietaryPreference[];
  produce_interests: ProduceInterest[];
  referral_source: ReferralSource | null;
  referral_source_other: string | null;
  created_at: string;
  updated_at: string;
}

// Matches the FastAPI backend's CustomerProfileOut exactly — a narrower
// shape than the full row above, since that's literally what
// GET /customers/me returns (see harvesthub-backend/app/customers/schemas.py).
export interface CustomerProfileGeo {
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  latitude: number | null;
  longitude: number | null;
}

export type FarmType = 'produce' | 'dairy' | 'livestock';

export interface FarmerProfile {
  id: string;
  farm_name: string;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  farm_types: FarmType[];
  years_in_operation: number | null;
  tax_id: string | null;
  latitude: number | null;
  longitude: number | null;
  geocoded_at: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

// Categories mirror the produce_interests taxonomy but as a real table
// (see supabase/migrations/0008_categories_and_products.sql) so products
// can FK to them and the feed's category rail doesn't hardcode the list.
export interface Category {
  id: string;
  slug: ProduceInterest;
  name: string;
  sort_order: number;
  icon_name: string | null;
}

// Matches the FastAPI backend's FarmerFeedCard/FarmerFeedResponse
// (harvesthub-backend/app/farmers/schemas.py) — GET /farmers/feed.
export interface FarmerFeedCard {
  id: string;
  farm_name: string;
  photo_url: string | null;
  distance_km: number;
  matched_categories: ProduceInterest[];
}

export interface FarmerFeedResponse {
  items: FarmerFeedCard[];
  limit: number;
  offset: number;
  total: number;
}

export type FarmerVerificationStatus = 'pending_verification' | 'approved' | 'rejected';

export interface FarmerVerification {
  id: string;
  business_license_number: string | null;
  business_license_file_path: string | null;
  insurance_file_path: string | null;
  insurance_expiration_date: string | null;
  food_safety_cert_file_path: string | null;
  gov_id_file_path: string | null;
  land_proof_file_path: string | null;
  references_text: string | null;
  status: FarmerVerificationStatus;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CertificationType = 'organic' | 'usda' | 'state_ag_registration' | 'other';

export interface FarmerCertification {
  id: string;
  farmer_id: string;
  cert_type: CertificationType;
  cert_name: string;
  file_path: string | null;
  created_at: string;
}

// Matches the FastAPI backend's FarmerDetailOut (harvesthub-backend/app/
// farmers/schemas.py) — GET /farmers/{id}, the farm detail page's header.
export interface PublicCertification {
  cert_type: CertificationType;
  cert_name: string;
}

export interface FarmerDetail {
  id: string;
  farm_name: string;
  photo_url: string | null;
  bio: string | null;
  address_city: string | null;
  address_state: string | null;
  distance_km: number | null;
  farm_types: FarmType[];
  years_in_operation: number | null;
  certifications: PublicCertification[];
}

// Matches ProductOut (harvesthub-backend/app/products/schemas.py) —
// GET /products?farmer_id=&category=. cart_quantity is this customer's own
// current quantity for the product, so the stepper renders correctly
// without a separate /cart fetch.
export interface ProductItem {
  id: string;
  farmer_id: string;
  category_id: string;
  category_slug: ProduceInterest;
  category_name: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  quantity_available: number;
  image_url: string | null;
  cart_quantity: number;
}

// Matches CartLineItemOut/CartFarmGroupOut/CartSummary/CartActionResponse
// (harvesthub-backend/app/cart/schemas.py). The cart is grouped by farmer
// because checkout splits it into one order per farmer — each group is
// effectively a mini pre-order with its own subtotal and (on the cart
// screen) its own pickup/delivery choice.
export interface CartLineItem {
  product_id: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  quantity_available: number;
  line_total: number;
}

export interface CartFarmGroup {
  farmer_id: string;
  farm_name: string;
  photo_url: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  latitude: number | null;
  longitude: number | null;
  items: CartLineItem[];
  subtotal: number;
}

export interface CartSummary {
  farms: CartFarmGroup[];
  total: number;
  item_count: number;
}

export interface CartActionResponse {
  product_id: string;
  quantity: number;
  cart_total: number;
  cart_item_count: number;
}
