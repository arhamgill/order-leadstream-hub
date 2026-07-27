import { useState, useEffect } from "react";
import { useGetAdminSettings, useUpdateAdminSettings, getGetAdminSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function Settings() {
  const { data: settings, isLoading } = useGetAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    business_email: "",
    business_phone: "",
    zelle_phone: "",
    zelle_name: "",
    from_email: "",
    admin_email: "",
    stripe_publishable_key: "",
    card_fee_percent: 0,
    zelle_discount_percent: 0,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        business_email: settings.business_email || "",
        business_phone: settings.business_phone || "",
        zelle_phone: settings.zelle_phone || "",
        zelle_name: settings.zelle_name || "",
        from_email: settings.from_email || "",
        admin_email: settings.admin_email || "",
        stripe_publishable_key: settings.stripe_publishable_key || "",
        card_fee_percent: settings.card_fee_percent || 0,
        zelle_discount_percent: settings.zelle_discount_percent || 0,
      });
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value
    }));
  };

  const handleSave = () => {
    updateSettings.mutate({ data: formData }, {
      onSuccess: () => {
        toast.success("Settings updated successfully");
        queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
      }
    });
  };

  if (isLoading) return <div className="p-6">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight">Business Settings</h1>
      <p className="text-muted-foreground">Manage global configurations for the portal and dashboard.</p>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>Displayed to customers on the portal and in emails.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_email">Public Support Email</Label>
                <Input id="business_email" name="business_email" value={formData.business_email} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_phone">Public Support Phone</Label>
                <Input id="business_phone" name="business_phone" value={formData.business_phone} onChange={handleChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>Configure where automated emails come from and go to.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from_email">System "From" Address</Label>
                <Input id="from_email" name="from_email" value={formData.from_email} onChange={handleChange} placeholder="e.g. no-reply@leadstream.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_email">Admin Notification Address</Label>
                <Input id="admin_email" name="admin_email" value={formData.admin_email} onChange={handleChange} placeholder="Where to send new order alerts" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment & Pricing Rules</CardTitle>
            <CardDescription>Configure Stripe and Zelle settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="card_fee_percent">Credit Card Fee (%)</Label>
                <Input type="number" step="0.1" id="card_fee_percent" name="card_fee_percent" value={formData.card_fee_percent} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zelle_discount_percent">Zelle Discount (%)</Label>
                <Input type="number" step="0.1" id="zelle_discount_percent" name="zelle_discount_percent" value={formData.zelle_discount_percent} onChange={handleChange} />
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <h4 className="font-medium">Zelle Instructions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zelle_name">Zelle Recipient Name</Label>
                  <Input id="zelle_name" name="zelle_name" value={formData.zelle_name} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zelle_phone">Zelle Phone/Email</Label>
                  <Input id="zelle_phone" name="zelle_phone" value={formData.zelle_phone} onChange={handleChange} />
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <Label htmlFor="stripe_publishable_key">Stripe Publishable Key</Label>
              <Input id="stripe_publishable_key" name="stripe_publishable_key" value={formData.stripe_publishable_key} onChange={handleChange} />
              <p className="text-xs text-muted-foreground">The secret key is securely managed on the backend.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateSettings.isPending} size="lg">
            <Save className="w-5 h-5 mr-2" /> Save All Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
