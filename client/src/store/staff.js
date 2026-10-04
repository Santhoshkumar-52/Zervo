import { create } from "zustand";

import {
  createStaff as createStaffRequest,
  deleteStaff as deleteStaffRequest,
  getStaff,
  getStaffById,
  updateStaff as updateStaffRequest,
  updateStaffStatus,
} from "@/api/staff/staffApi";
import { notifyError, notifySuccess } from "@/utils/notification";

/**
 * Staff store: the single source of truth for the staff screen.
 *
 *   API  ->  store  <->  page
 *
 * - The page only renders from the store and calls its actions.
 * - Every action calls the API; the store is updated only after the API
 *   succeeds, so the table updates by itself.
 * - Actions show the success / error toast and re-throw on failure, so a
 *   dialog awaiting the action stays open when it fails.
 */

const initialPagination = {
  pageIndex: 0,
  pageSize: 10,
};

const getApiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

// Used to ignore a slow response when a newer request has already been made.
let listRequestId = 0;
let detailRequestId = 0;

// Mirrors the server search: name, email or staff ID contains text.
const matchesSearch = (staff, search) => {
  const query = search.trim().toLowerCase();

  if (!query) return true;

  return [staff.full_name, staff.email, staff.user_id].some(
    (value) => value && String(value).toLowerCase().includes(query),
  );
};

// Same order as the server: newest created first, then newest id first.
const compareStaff = (a, b) =>
  String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")) ||
  b.id - a.id;

// Replace one staff member everywhere it is held in the store.
const mergeStaff = (state, staff) => ({
  staff: state.staff.map((item) =>
    item.id === staff.id ? { ...item, ...staff } : item,
  ),
  selectedStaff:
    state.selectedStaff?.id === staff.id
      ? { ...state.selectedStaff, ...staff }
      : state.selectedStaff,
});

const initialState = {
  // Data
  staff: [],
  total: 0,

  // Table state. `search` is the input text; `appliedSearch` is the debounced
  // value the list is actually fetched with.
  search: "",
  appliedSearch: "",
  pagination: initialPagination,

  // List status
  hasLoaded: false,
  isLoading: false, // first load, nothing to show yet
  isFetching: false, // any list request in flight
  error: null,

  // Staff member being edited (set from the clicked row, then refreshed by id)
  selectedStaff: null,
  isSelectedLoading: false,

  // Mutation status
  isSaving: false, // create / update
  isDeleting: false,
  statusUpdatingIds: [],
};

export const useStaffStore = create((set, get) => ({
  ...initialState,

  // ---------------------------------------------------------------
  // Table state
  // ---------------------------------------------------------------

  setSearch: (updater) =>
    set((state) => ({
      search: typeof updater === "function" ? updater(state.search) : updater,
    })),

  // Called once the user stops typing. A new search always starts at page 1.
  applySearch: (value) =>
    set((state) =>
      state.appliedSearch === value
        ? state
        : {
            appliedSearch: value,
            pagination: { ...state.pagination, pageIndex: 0 },
          },
    ),

  setPagination: (updater) =>
    set((state) => ({
      pagination:
        typeof updater === "function" ? updater(state.pagination) : updater,
    })),

  // ---------------------------------------------------------------
  // List
  // ---------------------------------------------------------------

  // GET /staff  (reads the page + applied search from the store)
  fetchStaff: async () => {
    const { pagination, appliedSearch } = get();
    const requestId = ++listRequestId;

    set((state) => ({
      isFetching: true,
      isLoading: !state.hasLoaded,
      error: null,
    }));

    try {
      const response = await getStaff({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: appliedSearch,
      });

      if (requestId !== listRequestId) return;

      // Server shape: { success, message, data: { staff, pagination } }
      const { staff, pagination: serverPagination } = response.data.data;

      set({
        staff,
        total: serverPagination.total,
        hasLoaded: true,
        isLoading: false,
        isFetching: false,
      });
    } catch (error) {
      if (requestId !== listRequestId) return;

      const message = getApiError(error, "Failed to load staff");

      set({ error: message, isLoading: false, isFetching: false });
      notifyError(message);
    }
  },

  // ---------------------------------------------------------------
  // Selected staff member (edit form)
  // ---------------------------------------------------------------

  // Show the clicked row immediately, then call fetchStaffById for fresh data.
  selectStaff: (staff) => set({ selectedStaff: staff }),

  clearSelectedStaff: () => {
    detailRequestId += 1;
    set({ selectedStaff: null, isSelectedLoading: false });
  },

  // GET /staff/:id
  fetchStaffById: async (id) => {
    const requestId = ++detailRequestId;

    set({ isSelectedLoading: true });

    try {
      const response = await getStaffById(id);

      // Server shape: { success, message, data: { staff } }
      const staff = response.data.data.staff;

      if (requestId === detailRequestId) {
        set((state) => ({
          ...mergeStaff(state, staff),
          selectedStaff: staff,
          isSelectedLoading: false,
        }));
      }

      return staff;
    } catch (error) {
      if (requestId === detailRequestId) {
        set({ isSelectedLoading: false });
        notifyError(getApiError(error, "Failed to load staff member"));

        // Deleted by someone else: drop it from the table too.
        if (error?.response?.status === 404) {
          set((state) => ({
            staff: state.staff.filter((item) => item.id !== id),
            total: Math.max(0, state.total - 1),
          }));
        }
      }

      throw error;
    }
  },

  // ---------------------------------------------------------------
  // Mutations (API first, store after success)
  // ---------------------------------------------------------------

  // POST /staff
  createStaff: async (values) => {
    set({ isSaving: true });

    try {
      const response = await createStaffRequest(values);
      const staff = response.data.data.staff;

      set((state) => {
        // Not part of the list being viewed (an active search it doesn't match).
        if (!matchesSearch(staff, state.appliedSearch)) return state;

        const total = state.total + 1;

        // Only the first page can show it; other pages just get the new total.
        if (state.pagination.pageIndex !== 0) return { total };

        return {
          total,
          staff: [...state.staff, staff]
            .sort(compareStaff)
            .slice(0, state.pagination.pageSize),
        };
      });

      notifySuccess(`${staff.full_name} added`);

      return staff;
    } catch (error) {
      notifyError(getApiError(error, "Failed to add staff member"));
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  // PATCH /staff/:id
  updateStaff: async (id, values) => {
    set({ isSaving: true });

    try {
      const response = await updateStaffRequest(id, values);
      const staff = response.data.data.staff;

      set((state) => mergeStaff(state, staff));

      notifySuccess(`${staff.full_name} updated`);

      return staff;
    } catch (error) {
      notifyError(getApiError(error, "Failed to update staff member"));
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  // PATCH /staff/:id/status
  toggleStatus: async (staff, isActive) => {
    set((state) => ({
      statusUpdatingIds: [...state.statusUpdatingIds, staff.id],
    }));

    try {
      const response = await updateStaffStatus(staff.id, isActive);
      const updated = response.data.data.staff;

      set((state) => mergeStaff(state, updated));

      notifySuccess(
        `${updated.full_name} marked as ${isActive ? "active" : "inactive"}`,
      );

      return updated;
    } catch (error) {
      notifyError(getApiError(error, "Failed to update staff status"));
      throw error;
    } finally {
      set((state) => ({
        statusUpdatingIds: state.statusUpdatingIds.filter(
          (id) => id !== staff.id,
        ),
      }));
    }
  },

  // DELETE /staff/:id
  deleteStaff: async (staff) => {
    set({ isDeleting: true });

    try {
      await deleteStaffRequest(staff.id);

      set((state) => {
        const remaining = state.staff.filter((item) => item.id !== staff.id);
        const { pageIndex } = state.pagination;

        return {
          staff: remaining,
          total: Math.max(0, state.total - 1),
          selectedStaff:
            state.selectedStaff?.id === staff.id ? null : state.selectedStaff,
          // Emptied a later page: step back (the page refetches that page).
          pagination:
            remaining.length === 0 && pageIndex > 0
              ? { ...state.pagination, pageIndex: pageIndex - 1 }
              : state.pagination,
        };
      });

      notifySuccess(`${staff.full_name} deleted`);
    } catch (error) {
      notifyError(getApiError(error, "Failed to delete staff member"));
      throw error;
    } finally {
      set({ isDeleting: false });
    }
  },

  reset: () => {
    listRequestId += 1;
    detailRequestId += 1;
    set({ ...initialState });
  },
}));
