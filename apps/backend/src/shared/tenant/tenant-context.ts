export interface TenantContext {
  organizationId: string;
  userId?: string;
  customerId?: string;
  role?: 'super_admin' | 'product_manager' | 'support_agent';
  email?: string;
}
