import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import ordersRouter from "./orders.js";
import adminRouter from "./admin.js";
import adminAuthRouter from "./adminAuth.js";
import adminDashboardRouter from "./adminDashboard.js";
import adminOrdersRouter from "./adminOrders.js";
import adminCustomersRouter from "./adminCustomers.js";
import adminProductsRouter from "./adminProducts.js";
import adminSettingsRouter from "./adminSettings.js";
import catalogRouter from "./catalog.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminRouter);       // GET /settings (public)
router.use(catalogRouter);     // GET /catalog (public)
router.use(ordersRouter);      // POST /orders/* (customer portal)
router.use(adminAuthRouter);   // POST /admin/auth/login
router.use(adminDashboardRouter);
router.use(adminOrdersRouter);
router.use(adminCustomersRouter);
router.use(adminProductsRouter);
router.use(adminSettingsRouter);

export default router;
