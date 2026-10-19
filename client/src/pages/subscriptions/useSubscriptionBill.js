import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// import { getSubscriptionItems } from "@/api/subscription/subscriptionApi";
import {
  addSubscriptionItem,
  completeSubscriptionPayment,
} from "@/api/subscription/subscriptionApi";
import { useAuthStore } from "@/store/auth";
import { notifyError } from "@/utils/notification";

const BILL_KEY = ["subscription-bill"];

const EMPTY_BILL = {
  items: [],
  totals: { item_count: 0, grand_total_minor: 0 },
};

const showError = (error, fallback) =>
  notifyError(error?.response?.data?.message || error?.message || fallback);

/**
 * The bill being built: the items the server has saved so far.
 * `addItem(payload)` sends one item (with the bill's bill_no once it has one);
 * the server calculates it and returns the whole bill, which replaces what is
 * shown.
 * `pay({ paymentId, paidPriceMinor })` completes the payment of the bill and
 * then starts a new, empty bill.
 */
export function useSubscriptionBill() {
  const queryClient = useQueryClient();
  const branchId = useAuthStore((state) => state.user?.branchId);

  // TODO: bring the fetch back once the bill is saved in the database.
  // For now the bill is not loaded again after a page reset, so it starts
  // empty and only fills as items are added (addItem sets the cache below).
  const { data: bill = EMPTY_BILL, isLoading } = useQuery({
    queryKey: BILL_KEY,
    // queryFn: getSubscriptionItems,
    enabled: false,
  });

  const { mutateAsync: addItem } = useMutation({
    mutationFn: (payload) =>
      addSubscriptionItem({ ...payload, bill_no: bill.bill_no }),
    onSuccess: (nextBill) => queryClient.setQueryData(BILL_KEY, nextBill),
    onError: (error) => showError(error, "Could not add the item"),
  });

  const { mutateAsync: pay, isPending: isPaying } = useMutation({
    mutationFn: ({ paymentId, paidPriceMinor }) =>
      completeSubscriptionPayment({
        branch_id: branchId,
        payment_id: paymentId,
        bill_no: bill.bill_no,
        paid_price: paidPriceMinor,
      }),
    onSuccess: () => queryClient.setQueryData(BILL_KEY, EMPTY_BILL),
    onError: (error) => showError(error, "Could not complete the payment"),
  });

  return { bill, isLoading, addItem, pay, isPaying };
}
