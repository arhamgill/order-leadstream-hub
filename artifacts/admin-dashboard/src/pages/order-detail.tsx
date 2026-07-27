import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetAdminOrder, 
  useUpdateOrderStatus, 
  useApproveOrderPayment, 
  useRejectOrderPayment, 
  useRefundOrder,
  useAddOrderNote,
  useDeleteOrderNote,
  getGetAdminOrderQueryKey,
  AdminOrderDetail,
  OrderStatusUpdateStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, snakeToTitle } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, XCircle, RefreshCcw, Trash2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { OrderStatusBadge, PaymentStatusBadge } from "./orders";

function PrettyAnswers({ answers }: { answers: Record<string, any> }) {
  if (!answers || Object.keys(answers).length === 0) return <span className="text-muted-foreground italic">None</span>;
  
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-2">
      {Object.entries(answers).map(([key, val]) => {
        let displayVal = val;
        if (typeof val === 'boolean') displayVal = val ? 'Yes' : 'No';
        else if (Array.isArray(val)) displayVal = val.join(', ');
        
        return (
          <div key={key} className="flex flex-col">
            <dt className="text-xs font-medium text-muted-foreground">{snakeToTitle(key)}</dt>
            <dd className="text-sm">{String(displayVal)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export default function OrderDetail() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  
  const { data: order, isLoading } = useGetAdminOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const approvePayment = useApproveOrderPayment();
  const rejectPayment = useRejectOrderPayment();
  const refundOrder = useRefundOrder();
  const addNote = useAddOrderNote();
  const deleteNote = useDeleteOrderNote();

  const [newNote, setNewNote] = useState("");
  const [statusUpdate, setStatusUpdate] = useState("processing");
  const [statusNote, setStatusNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  if (isLoading) return <div className="p-6">Loading order...</div>;
  if (!order) return <div className="p-6 text-red-500">Order not found</div>;

  const handleUpdateStatus = () => {
    updateStatus.mutate({ id, data: { status: statusUpdate as OrderStatusUpdateStatus, note: statusNote } }, {
      onSuccess: () => {
        toast.success("Order status updated");
        queryClient.invalidateQueries({ queryKey: getGetAdminOrderQueryKey(id) });
      }
    });
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote.mutate({ id, data: { note: newNote } }, {
      onSuccess: () => {
        setNewNote("");
        toast.success("Note added");
        queryClient.invalidateQueries({ queryKey: getGetAdminOrderQueryKey(id) });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/orders">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order {order.order_number}</h1>
          <p className="text-muted-foreground">
            Placed on {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {order.items.map((item, i) => {
                  const answer = order.product_answers.find(a => a.id === item.id); // assuming ID matches or similar structure. Wait, product_answers don't have item.id?
                  // The API returns product_answers: [{ id, product_key, overridden, answers }]. We might just list them.
                  return (
                    <div key={item.id}>
                      {i > 0 && <Separator className="my-6" />}
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{snakeToTitle(item.category)} - {snakeToTitle(item.type)}</h3>
                          <p className="text-muted-foreground">{item.quantity} leads</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(item.price_cents)}</p>
                          {item.savings_cents > 0 && (
                            <p className="text-xs text-green-400 border border-green-400/20 bg-green-400/10 px-2 py-0.5 rounded-full inline-block mt-1">
                              Saved {formatCurrency(item.savings_cents)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Configuration & Answers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium text-sm text-primary mb-2 uppercase tracking-wider">Default Settings</h4>
                {(() => {
                  const ds = order.default_settings as { states?: string[]; start_date?: string; avail_days?: string[]; avail_hours?: string; agency_mention?: string } | undefined;
                  if (!ds) return <p className="text-sm text-muted-foreground italic">No default settings recorded</p>;
                  return (
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 bg-muted/50 p-4 rounded-lg">
                      <div className="flex flex-col">
                        <dt className="text-xs font-medium text-muted-foreground">States</dt>
                        <dd className="text-sm">{ds.states?.join(", ") || "—"}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-xs font-medium text-muted-foreground">Start Date</dt>
                        <dd className="text-sm">{ds.start_date || "—"}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-xs font-medium text-muted-foreground">Available Days</dt>
                        <dd className="text-sm">{ds.avail_days?.join(", ") || "—"}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-xs font-medium text-muted-foreground">Available Hours</dt>
                        <dd className="text-sm">{ds.avail_hours || "—"}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-xs font-medium text-muted-foreground">Agency to Mention</dt>
                        <dd className="text-sm">{ds.agency_mention || "None"}</dd>
                      </div>
                    </dl>
                  );
                })()}
              </div>

              {order.product_answers.map((pa) => (
                <div key={pa.id} className="pt-4 border-t">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    {snakeToTitle(pa.product_key)}
                    {pa.overridden && <Badge variant="secondary" className="text-xs">Custom Override</Badge>}
                  </h4>
                  <div className="bg-card border rounded-lg p-4">
                    <PrettyAnswers answers={pa.answers as Record<string, unknown>} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.status_history.map((hist) => (
                  <div key={hist.id} className="flex gap-4 border-l-2 border-muted pl-4 relative">
                    <div className="absolute w-2.5 h-2.5 bg-primary rounded-full -left-[5px] top-1"></div>
                    <div>
                      <p className="text-sm font-medium">
                        Changed to <span className="uppercase">{hist.to_status}</span>
                      </p>
                      {hist.note && <p className="text-sm text-muted-foreground mt-1">{hist.note}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(hist.created_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium text-lg"><Link href={`/customers/${order.customer.id}`} className="hover:underline text-primary">{order.customer.first_name} {order.customer.last_name}</Link></p>
              <p>{order.customer.email}</p>
              <p>{order.customer.phone}</p>
              {order.customer.agency_name && <p>Agency: {order.customer.agency_name}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment & Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee</span>
                <span>{formatCurrency(order.fee_cents)}</span>
              </div>
              {order.discount_cents > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount_cents)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(order.total_cents)}</span>
              </div>

              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Method</span>
                  <span className="uppercase text-sm font-medium">{order.payment.method}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <PaymentStatusBadge status={order.payment.status} method={order.payment.method} />
                </div>
                
                {order.payment.method === 'zelle' && order.payment.zelle_screenshot_url && (
                  <div className="mt-4">
                    <a href={order.payment.zelle_screenshot_url} target="_blank" rel="noreferrer" className="text-sm text-primary flex items-center gap-1 hover:underline">
                      <ExternalLink className="w-4 h-4" /> View Zelle Screenshot
                    </a>
                  </div>
                )}

                {order.payment.method === 'zelle' && order.payment.status === 'pending' && (
                  <div className="flex gap-2 pt-4">
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      onClick={() => approvePayment.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAdminOrderQueryKey(id) }) })}
                      disabled={approvePayment.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          <XCircle className="w-4 h-4 mr-2" /> Reject
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject Zelle Payment</DialogTitle>
                          <DialogDescription>Provide a reason for rejection. This will notify the customer.</DialogDescription>
                        </DialogHeader>
                        <Input placeholder="Reason (e.g. Screenshot unreadable)" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                        <DialogFooter>
                          <Button 
                            variant="destructive" 
                            onClick={() => rejectPayment.mutate({ id, data: { reason: rejectReason } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAdminOrderQueryKey(id) }) })}
                            disabled={rejectPayment.isPending}
                          >
                            Confirm Reject
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {order.payment.method === 'card' && order.payment.status === 'succeeded' && order.status !== 'refunded' && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full text-red-500 hover:text-red-600 border-red-500/20 hover:bg-red-500/10">
                        <RefreshCcw className="w-4 h-4 mr-2" /> Refund Order
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Refund Stripe Payment</DialogTitle>
                        <DialogDescription>Are you sure? This will refund {formatCurrency(order.total_cents)} to the customer's card immediately and cannot be undone.</DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button 
                          variant="destructive" 
                          onClick={() => refundOrder.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAdminOrderQueryKey(id) }) })}
                          disabled={refundOrder.isPending}
                        >
                          Confirm Refund
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={statusUpdate} onValueChange={setStatusUpdate}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Optional note for customer..." value={statusNote} onChange={e => setStatusNote(e.target.value)} />
              <Button onClick={handleUpdateStatus} disabled={updateStatus.isPending} className="w-full">
                Update Order Status
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Internal Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {order.notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No internal notes.</p>
                ) : (
                  order.notes.map(note => (
                    <div key={note.id} className="bg-muted p-3 rounded-md relative group">
                      <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                      <p className="text-xs text-muted-foreground mt-2">{format(new Date(note.created_at), "MMM d, h:mm a")}</p>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                        onClick={() => deleteNote.mutate({ id, noteId: note.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAdminOrderQueryKey(id) }) })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <div className="pt-4 border-t space-y-2">
                <Textarea placeholder="Add an internal note..." value={newNote} onChange={e => setNewNote(e.target.value)} rows={3} />
                <Button onClick={handleAddNote} disabled={addNote.isPending || !newNote.trim()} variant="secondary" className="w-full">
                  Add Note
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
