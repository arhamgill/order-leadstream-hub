import { useEffect } from 'react';
import { QueryCache, MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Redirect, useLocation } from 'wouter';
import { setAuthTokenGetter } from '@workspace/api-client-react';

import Layout from '@/components/layout';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Orders from '@/pages/orders';
import OrderDetail from '@/pages/order-detail';
import Customers from '@/pages/customers';
import CustomerDetail from '@/pages/customer-detail';
import Products from '@/pages/products';
import Payments from '@/pages/payments';
import Settings from '@/pages/settings';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

setAuthTokenGetter(() => localStorage.getItem('lsh_admin_token'));

const handleAuthError = (error: unknown) => {
  if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 401) {
    localStorage.removeItem('lsh_admin_token');
    window.location.href = basePath + '/login';
  }
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleAuthError,
  }),
  mutationCache: new MutationCache({
    onError: handleAuthError,
  }),
});

function ProtectedRoute({ component: Component, ...rest }: any) {
  const [location, setLocation] = useLocation();
  const token = localStorage.getItem('lsh_admin_token');
  
  useEffect(() => {
    if (!token) {
      setLocation('/login');
    }
  }, [token, setLocation]);

  if (!token) return null;

  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/orders"><ProtectedRoute component={Orders} /></Route>
      <Route path="/orders/:id"><ProtectedRoute component={OrderDetail} /></Route>
      <Route path="/customers"><ProtectedRoute component={Customers} /></Route>
      <Route path="/customers/:id"><ProtectedRoute component={CustomerDetail} /></Route>
      <Route path="/products"><ProtectedRoute component={Products} /></Route>
      <Route path="/payments"><ProtectedRoute component={Payments} /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
