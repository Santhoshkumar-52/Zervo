import { create } from "zustand";

const initialPagination = {
  pageIndex: 0,
  pageSize: 10,
};

export const useStaffStore = create((set) => ({
  // Data
  staff: [],
  total: 0,

  // Table state
  search: "",
  pagination: initialPagination,

  // Status
  isLoading: false,
  error: null,

  // Currently selected staff member (edit / delete / details)
  selectedStaff: null,

  setStaff: ({ staff, total }) =>
    set({
      staff,
      total: total ?? staff.length,
      isLoading: false,
      error: null,
    }),

  // A new search always goes back to the first page.
  setSearch: (search) =>
    set((state) => ({
      search,
      pagination: { ...state.pagination, pageIndex: 0 },
    })),

  setPagination: (updater) =>
    set((state) => ({
      pagination:
        typeof updater === "function" ? updater(state.pagination) : updater,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  selectStaff: (selectedStaff) => set({ selectedStaff }),

  clearSelectedStaff: () => set({ selectedStaff: null }),

  // Update a single row locally (e.g. after a status toggle).
  updateStaffInList: (id, changes) =>
    set((state) => ({
      staff: state.staff.map((member) =>
        member.staff_Id === id ? { ...member, ...changes } : member,
      ),
    })),

  removeStaffFromList: (id) =>
    set((state) => ({
      staff: state.staff.filter((member) => member.staff_Id !== id),
      total: Math.max(0, state.total - 1),
    })),

  reset: () =>
    set({
      staff: [],
      total: 0,
      search: "",
      pagination: initialPagination,
      isLoading: false,
      error: null,
      selectedStaff: null,
    }),
}));
