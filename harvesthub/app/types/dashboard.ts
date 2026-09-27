// Matches the FastAPI backend's dashboard schemas
// (harvesthub-backend/app/orders/schemas.py) — GET /customers/me/dashboard-summary.

export interface DailyActivity {
  date: string;
  order_count: number;
  amount: number;
}

export interface FavoriteFarm {
  farmer_id: string;
  farm_name: string;
  order_count: number;
}

export interface TopProduct {
  product_name: string;
  quantity: number;
}

// spending_all_time/savings_all_time/average_order_value/favorite_farm/
// most_ordered_product/orders_* are all scoped to whatever `range` was
// requested (all-time when omitted) — see DateRangeFilter and
// app/orders/service.py::get_dashboard_summary. activity_last_7_days is
// the one exception — always the real last 7 days, unaffected by range.
export interface DashboardSummary {
  orders_total: number;
  orders_active: number;
  orders_completed: number;
  orders_cancelled: number;
  spending_all_time: number;
  savings_all_time: number;
  average_order_value: number;
  activity_last_7_days: DailyActivity[];
  favorite_farm: FavoriteFarm | null;
  most_ordered_product: TopProduct | null;
}

export type DashboardRangeKey = 'week' | 'month' | '3m' | '6m' | 'all';
