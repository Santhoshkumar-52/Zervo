import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// import { getSubscriptionItems } from "@/api/subscription/subscriptionApi";
import { addSubscriptionItem } from "@/api/subscription/subscriptionApi";
import { notifyError } from "@/utils/notification";

const BILL_KEY = ["subscription-bill"];

const EMPTY_BILL = {
  items: [],
  totals: { item_count: 0, grand_total_minor: 0 },
};

/**
 * The bill being built: the items the server has saved so far.
 * `addItem(payload)` sends one item; the server calculates it and returns the
 * whole bill, which replaces what is shown.
 */
export function useSubscriptionBill() {
  const queryClient = useQueryClient();

  // TODO: bring the fetch back once the bill is saved in the database.
  // For now the bill is not loaded again after a page reset, so it starts
  // empty and only fills as items are added (addItem sets the cache below).
  const { data: bill = EMPTY_BILL, isLoading } = useQuery({
    queryKey: BILL_KEY,
    // queryFn: getSubscriptionItems,
    enabled: false,
  });

  const { mutateAsync: addItem } = useMutation({
    mutationFn: addSubscriptionItem,
    onSuccess: (nextBill) => queryClient.setQueryData(BILL_KEY, nextBill),
    onError: (error) =>
      notifyError(
        error?.response?.data?.message ||
          error?.message ||
          "Could not add the item",
      ),
  });

  return { bill, isLoading, addItem };
}
