import { getStaff } from "@/api/staff/staffApi";
import OptionRow from "@/components/additonal/OptionRow";

// Dropdown source for AsyncCombobox: active trainers only.
// The server does the filtering (same branch as the logged-in user, role, isActive), searching and paging.
// Server shape: { data: { staff: [], pagination } }
export const trainerSource = {
  key: "member-trainers",
  fetchPage: (params) =>
    getStaff({ ...params, role: "trainer", isActive: true }).then(
      (response) => {
        const { staff, pagination } = response.data.data;

        return { items: staff, pagination };
      },
    ),
  getLabel: (trainer) => trainer.full_name,
  renderOption: (trainer) => (
    <OptionRow title={trainer.full_name} detail={trainer.user_id} />
  ),
};
