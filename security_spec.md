# Security Specification: LocalMarket Event-Driven Firestore ABAC Rules

## 1. Data Invariants
1. **Automation Events (`/automation_events/{eventId}`)**:
   - `eventId` must match the document path ID (idempotency enforcement).
   - `eventType` must be one of the 14 recognized event types (`order.created`, `order.accepted`, `order.preparing`, `order.ready`, `customer.arrived`, `order.completed`, `order.cancelled`, `inventory.stock_low`, `inventory.stock_zero`, `merchant.approved`, `message.received`, `appointment.created`, `appointment.reminder`, `merchant.daily_sales_summary`).
   - `merchantId` must be a valid non-empty identifier.
   - `timestamp` must be a valid Asia/Kolkata ISO timestamp string.
   - `status` must be one of `pending`, `emitted`, `processed`, `failed`.
   - `processed` must be a boolean flag; `processedAt` must be a string or null.
   - `payload` must be an object containing domain context.

2. **Orders (`/orders/{orderId}`)**:
   - Must specify valid `orderNumber`, `storeId`, non-negative `totalAmount`, valid lifecycle `status`, and non-empty `pickupOtp`.
   - Lifecycle progression must follow: `placed` -> `confirmed` -> `packing` -> `ready` -> `completed` (or `cancelled`).
   - Customer arrival (`customerArrivedAtCounter: true`) cannot be reset once set.

3. **Retailers (`/retailers/{retailerId}`)**:
   - Must contain valid store name, category, physical address, and confirmed coordinates within geographic bounds (-90 to 90 lat, -180 to 180 lng).
   - Approval status must be `'pending'`, `'approved'`, or `'rejected'`.

4. **Inventory Items (`/inventory/{inventoryId}`)**:
   - Belongs to a merchant (`storeId`).
   - `stockQuantity` must be a non-negative integer.
   - `lowStockThreshold` must be a non-negative integer.
   - `inStock` must match `stockQuantity > 0`.

5. **Appointments (`/appointments/{appointmentId}`)**:
   - Belongs to a merchant (`storeId`) and customer (`customerId`).
   - `status` must be `'scheduled'`, `'reminded'`, `'completed'`, or `'cancelled'`.

6. **Chat Messages (`/chat_messages/{messageId}`)**:
   - Belongs to a store conversation (`storeId`), with sender `'user'` or `'merchant'`, non-empty text (max 2000 chars).

7. **Daily Summaries (`/daily_summaries/{summaryId}`)**:
   - Keyed by `${storeId}_${date}` in Asia/Kolkata timezone (`YYYY-MM-DD`).
   - Non-negative totals (`totalOrders`, `completedOrders`, `totalRevenue`).

8. **Store Reviews (`/storeReviews/{reviewId}`)**:
   - Rating must be integer/number between 1 and 5.
   - Customers can only create and edit their own reviews (`customerId == request.auth.uid`).
   - Publicly readable.

9. **Product Reviews (`/productReviews/{reviewId}`)**:
   - Rating must be integer/number between 1 and 5.
   - Tied to purchased product from order (`productId`, `storeId`, `orderId`).
   - Customers can only create and edit their own reviews (`customerId == request.auth.uid`).
   - Publicly readable.

10. **Customer Favorite Stores (`/customers/{customerId}/favoriteStores/{storeId}`)**:
    - Scoped strictly to authenticated customer (`request.auth.uid == customerId`).
    - Synced across devices. Only the owner can read or write.

---

## 2. The Dirty Dozen Payloads (Rejection Targets)
1. **Event Poisoning**: Attempting to insert an arbitrary `eventType: "system.wipe"` into `/automation_events`.
2. **Denial of Wallet**: Injecting a 2MB string into `payload` or `notes`.
3. **Idempotency Violation**: Creating an automation event where `incoming().eventId != eventId`.
4. **Invalid Coordinates**: Registering a merchant with latitude `95.0` or longitude `200.0`.
5. **Negative Revenue**: Writing negative `totalRevenue` or `totalAmount`.
6. **Path Traversal / ID Poisoning**: Document IDs containing special characters (`../`, `@#$!`).
7. **Negative Stock**: Writing `stockQuantity: -5` into `/inventory`.
8. **Forged Status**: Setting order status to `"hacked"` or `"arbitrary_step"`.
9. **Unbounded Arrays**: Writing arrays with > 100 elements.
10. **Ghost Fields**: Injecting unauthorized privilege escalation fields (`__proto__`, `isAdmin: true`).
11. **Blanket Query Scraping**: Executing unrestricted collection scans on internal messages without store reference.
12. **Unvalidated Timestamp**: Submitting malicious non-string timestamp payloads.
