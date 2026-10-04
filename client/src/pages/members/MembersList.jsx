import DataTable from "@/components/additonal/Datatable/DataTable";

import { MembersColumns } from "./MembersColumns";

const members = [
  {
    id: 1,
    full_name: "Arun Kumar",
    phone: "9876543210",
    branch: "Main Branch",
    trainer: "Rahul",
    joined_on: "2026-09-01",
  },
  {
    id: 2,
    full_name: "Priya Sharma",
    phone: "9876543211",
    branch: "Main Branch",
    trainer: "Vijay",
    joined_on: "2026-09-05",
  },
  {
    id: 3,
    full_name: "Karthik Raj",
    phone: "9876543212",
    branch: "Anna Nagar",
    trainer: "Rahul",
    joined_on: "2026-09-10",
  },
];

function MembersList() {
  return (
    <DataTable
      columns={MembersColumns}
      data={members}
      searchPlaceholder="Search members..."
      pageSize={10}
    />
  );
}

export default MembersList;
