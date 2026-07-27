import { useState } from "react";
import { useListAdminOrders } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

import { PaymentStatusBadge } from "./orders";

export default function Payments() {
  const [page, setPage] = useState(1);
  const limit = 20;

  // Pre-filtered for Zelle & pending
  const { data, isLoading } = useListAdminOrders({ 
    page, 
    limit, 
    payment_method: "zelle", 
    status: "pending" 
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-yellow-500">Pending Payments</h1>
          <p className="text-muted-foreground">Orders awaiting Zelle payment verification.</p>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading payments...
                </TableCell>
              </TableRow>
            ) : data?.orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No pending Zelle payments to review.
                </TableCell>
              </TableRow>
            ) : (
              data?.orders.map((order) => (
                <TableRow key={order.id} className="bg-yellow-500/5 hover:bg-yellow-500/10">
                  <TableCell className="font-medium">
                    <Link href={`/orders/${order.id}`} className="hover:underline text-primary">
                      {order.order_number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>{order.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{order.customer_email}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(new Date(order.created_at), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={order.payment_status} method={order.payment_method} />
                  </TableCell>
                  <TableCell className="text-right font-medium text-yellow-400">
                    {formatCurrency(order.total_cents)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/orders/${order.id}`}>
                      <Button size="sm" variant="outline" className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/20">
                        Review
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to Math.min(page * limit, data.total) of {data.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= data.total}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
