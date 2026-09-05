import React, { createContext, useCallback, useContext, useState } from 'react';
import type { DeliveryAddressDraft, FarmFulfillment, FulfillmentMethod } from '../types/checkout';

const EMPTY_ADDRESS: DeliveryAddressDraft = { street: '', city: '', state: '', zip: '' };
const EMPTY_FULFILLMENT: FarmFulfillment = { method: null, deliveryAddress: EMPTY_ADDRESS };

type CheckoutDraftContextType = {
  fulfillmentByFarm: Record<string, FarmFulfillment>;
  ensureFarm: (farmerId: string, defaultAddress: DeliveryAddressDraft) => void;
  setMethod: (farmerId: string, method: FulfillmentMethod) => void;
  setDeliveryField: (farmerId: string, field: keyof DeliveryAddressDraft, value: string) => void;
};

const CheckoutDraftContext = createContext<CheckoutDraftContextType>({
  fulfillmentByFarm: {},
  ensureFarm: () => {},
  setMethod: () => {},
  setDeliveryField: () => {},
});

// Session-local, in-memory only — this is a draft of "how will each
// farmer's order be fulfilled," not a real order. It exists so the cart
// screen and the checkout screen (a separate route) see the same choice
// without either persisting it to the backend before there's an order for
// it to belong to.
export function CheckoutDraftProvider({ children }: { children: React.ReactNode }) {
  const [fulfillmentByFarm, setFulfillmentByFarm] = useState<Record<string, FarmFulfillment>>({});

  const ensureFarm = useCallback((farmerId: string, defaultAddress: DeliveryAddressDraft) => {
    setFulfillmentByFarm((prev) => {
      if (prev[farmerId]) return prev;
      return { ...prev, [farmerId]: { method: null, deliveryAddress: defaultAddress } };
    });
  }, []);

  const setMethod = useCallback((farmerId: string, method: FulfillmentMethod) => {
    setFulfillmentByFarm((prev) => ({
      ...prev,
      [farmerId]: { ...(prev[farmerId] ?? EMPTY_FULFILLMENT), method },
    }));
  }, []);

  const setDeliveryField = useCallback((farmerId: string, field: keyof DeliveryAddressDraft, value: string) => {
    setFulfillmentByFarm((prev) => {
      const existing = prev[farmerId] ?? EMPTY_FULFILLMENT;
      return {
        ...prev,
        [farmerId]: { ...existing, deliveryAddress: { ...existing.deliveryAddress, [field]: value } },
      };
    });
  }, []);

  return (
    <CheckoutDraftContext.Provider value={{ fulfillmentByFarm, ensureFarm, setMethod, setDeliveryField }}>
      {children}
    </CheckoutDraftContext.Provider>
  );
}

export const useCheckoutDraft = () => useContext(CheckoutDraftContext);
