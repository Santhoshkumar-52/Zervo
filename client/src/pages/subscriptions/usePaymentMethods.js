import { useQuery } from "@tanstack/react-query";

import { getPayments } from "@/api/payment/paymentApi";

const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * The branch's active payment methods, shaped for a dropdown:
 * `[{ value: id, label: payment_name }]`.
 */
export function usePaymentMethods() {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: getPayments,
    staleTime: FIVE_MINUTES,
  });

  const paymentMethods = payments.map(({ id, payment_name }) => ({
    value: id,
    label: payment_name,
  }));

  return { paymentMethods, isLoading };
}