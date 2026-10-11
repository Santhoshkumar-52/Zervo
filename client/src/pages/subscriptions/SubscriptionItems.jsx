import DataTable from "@/components/additonal/Datatable/DataTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { subscriptionColumns } from "./SubscriptionColumns";

// The table has no paging bar, so the page size just has to be larger than
// any bill.
const PAGE_SIZE = 1000;

// The items on the bill, exactly as the server returned them.
function SubscriptionItems({ items, isLoading = false }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Items</CardTitle>
        <CardDescription>Items added to this bill so far.</CardDescription>
      </CardHeader>

      <CardContent>
        <DataTable
          columns={subscriptionColumns}
          data={items}
          getRowId={(item) => item.id}
          showToolbar={false}
          showPagination={false}
          pageSize={PAGE_SIZE}
          fixedRows={5}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}

export default SubscriptionItems;
