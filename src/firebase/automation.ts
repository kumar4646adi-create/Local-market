import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import {
  AutomationEvent,
  AutomationEventType,
  Order,
  InventoryItem,
  Appointment,
  ChatMessage,
  DailySalesSummary,
  Store,
} from '../types';
import {
  getAsiaKolkataISOString,
  getAsiaKolkataDateString,
} from '../utils/timezone';

export const AUTOMATION_EVENTS_COLLECTION = 'automation_events';
export const INVENTORY_COLLECTION = 'inventory';
export const APPOINTMENTS_COLLECTION = 'appointments';
export const CHAT_MESSAGES_COLLECTION = 'chat_messages';
export const DAILY_SUMMARIES_COLLECTION = 'daily_summaries';

/**
 * Core idempotent event emitter.
 * Checks if eventId already exists before writing to prevent duplicate events and duplicate notifications.
 */
export async function emitAutomationEvent<T = any>(params: {
  eventType: AutomationEventType;
  eventId: string;
  orderId?: string | null;
  customerId?: string | null;
  merchantId: string;
  payload: T;
}): Promise<{ event: AutomationEvent<T>; alreadyExisted: boolean }> {
  const path = `${AUTOMATION_EVENTS_COLLECTION}/${params.eventId}`;
  try {
    const docRef = doc(db, AUTOMATION_EVENTS_COLLECTION, params.eventId);
    const existingSnap = await getDoc(docRef);

    if (existingSnap.exists()) {
      console.log(`[Automation] Idempotency: Event ${params.eventId} already emitted. Skipping duplicate.`);
      return {
        event: existingSnap.data() as AutomationEvent<T>,
        alreadyExisted: true,
      };
    }

    const eventDoc: AutomationEvent<T> = {
      eventType: params.eventType,
      eventId: params.eventId,
      orderId: params.orderId || null,
      customerId: params.customerId || null,
      merchantId: params.merchantId,
      timestamp: getAsiaKolkataISOString(),
      status: 'pending',
      payload: params.payload,
      processed: false,
      processedAt: null,
    };

    await setDoc(docRef, eventDoc);
    console.log(`[Automation] Event emitted successfully: ${params.eventType} (ID: ${params.eventId})`);
    return { event: eventDoc, alreadyExisted: false };
  } catch (error) {
    return handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * 1. New order created
 */
export async function emitOrderCreatedEvent(order: Order) {
  const eventId = `order.created_${order.id}`;
  return emitAutomationEvent({
    eventType: 'order.created',
    eventId,
    orderId: order.id,
    customerId: order.customerId || 'cust-aditya-kumar',
    merchantId: order.storeId,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      storeId: order.storeId,
      storeName: order.storeName,
      storeAddress: order.storeAddress,
      customerId: order.customerId || 'cust-aditya-kumar',
      customerName: order.customerName || 'Aditya Kumar',
      customerPhone: order.customerPhone || '+91 98160 46460',
      totalAmount: order.totalAmount,
      type: order.type,
      pickupOtp: order.pickupOtp,
      estimatedReadyTime: order.estimatedReadyTime,
      itemCount: order.items.reduce((acc, it) => acc + it.quantity, 0),
      items: order.items.map((it) => ({
        productId: it.product.id,
        productName: it.product.name,
        price: it.product.price,
        quantity: it.quantity,
        unit: it.product.unit,
      })),
      deliveryAddress: order.deliveryAddress || null,
      notes: order.notes || '',
    },
  });
}

/**
 * 2. Retailer accepts order
 */
export async function emitOrderAcceptedEvent(order: Order) {
  const eventId = `order.accepted_${order.id}`;
  return emitAutomationEvent({
    eventType: 'order.accepted',
    eventId,
    orderId: order.id,
    customerId: order.customerId || 'cust-aditya-kumar',
    merchantId: order.storeId,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      storeId: order.storeId,
      storeName: order.storeName,
      status: 'confirmed',
      acceptedAt: getAsiaKolkataISOString(),
      pickupOtp: order.pickupOtp,
      totalAmount: order.totalAmount,
    },
  });
}

/**
 * 3. Retailer starts preparing order
 */
export async function emitOrderPreparingEvent(order: Order) {
  const eventId = `order.preparing_${order.id}`;
  return emitAutomationEvent({
    eventType: 'order.preparing',
    eventId,
    orderId: order.id,
    customerId: order.customerId || 'cust-aditya-kumar',
    merchantId: order.storeId,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      storeId: order.storeId,
      storeName: order.storeName,
      status: 'packing',
      preparationStartedAt: getAsiaKolkataISOString(),
      estimatedReadyTime: order.estimatedReadyTime,
    },
  });
}

/**
 * 4. Order ready for pickup
 */
export async function emitOrderReadyEvent(order: Order) {
  const eventId = `order.ready_${order.id}`;
  return emitAutomationEvent({
    eventType: 'order.ready',
    eventId,
    orderId: order.id,
    customerId: order.customerId || 'cust-aditya-kumar',
    merchantId: order.storeId,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      storeId: order.storeId,
      storeName: order.storeName,
      storeAddress: order.storeAddress,
      status: 'ready',
      pickupOtp: order.pickupOtp,
      readyAt: getAsiaKolkataISOString(),
      pickupInstructions: 'Show 4-digit OTP at merchant counter to collect package.',
    },
  });
}

/**
 * 5. Customer taps "I'm Here"
 */
export async function emitCustomerArrivedEvent(order: Order) {
  const eventId = `customer.arrived_${order.id}`;
  return emitAutomationEvent({
    eventType: 'customer.arrived',
    eventId,
    orderId: order.id,
    customerId: order.customerId || 'cust-aditya-kumar',
    merchantId: order.storeId,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      storeId: order.storeId,
      storeName: order.storeName,
      customerId: order.customerId || 'cust-aditya-kumar',
      customerName: order.customerName || 'Aditya Kumar',
      customerPhone: order.customerPhone || '+91 98160 46460',
      pickupOtp: order.pickupOtp,
      arrivedAt: getAsiaKolkataISOString(),
      messageToRetailer: 'Customer is standing at your store counter for pickup verification.',
    },
  });
}

/**
 * 6. Order completed
 */
export async function emitOrderCompletedEvent(order: Order) {
  const eventId = `order.completed_${order.id}`;
  return emitAutomationEvent({
    eventType: 'order.completed',
    eventId,
    orderId: order.id,
    customerId: order.customerId || 'cust-aditya-kumar',
    merchantId: order.storeId,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      storeId: order.storeId,
      storeName: order.storeName,
      totalAmount: order.totalAmount,
      status: 'completed',
      completedAt: getAsiaKolkataISOString(),
      verifiedOtp: order.pickupOtp,
    },
  });
}

/**
 * 7. Order cancelled
 */
export async function emitOrderCancelledEvent(order: Order, reason: string = 'Cancelled by user or merchant') {
  const eventId = `order.cancelled_${order.id}`;
  return emitAutomationEvent({
    eventType: 'order.cancelled',
    eventId,
    orderId: order.id,
    customerId: order.customerId || 'cust-aditya-kumar',
    merchantId: order.storeId,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      storeId: order.storeId,
      storeName: order.storeName,
      totalAmount: order.totalAmount,
      status: 'cancelled',
      cancelledAt: getAsiaKolkataISOString(),
      cancellationReason: reason,
    },
  });
}

/**
 * 8. Product stock becomes low
 */
export async function emitStockLowEvent(inventory: InventoryItem) {
  const eventId = `inventory.stock_low_${inventory.storeId}_${inventory.productId}_qty${inventory.stockQuantity}`;
  return emitAutomationEvent({
    eventType: 'inventory.stock_low',
    eventId,
    orderId: null,
    customerId: null,
    merchantId: inventory.storeId,
    payload: {
      storeId: inventory.storeId,
      storeName: inventory.storeName,
      productId: inventory.productId,
      productName: inventory.productName,
      currentStock: inventory.stockQuantity,
      threshold: inventory.lowStockThreshold,
      unit: inventory.unit,
      price: inventory.price,
      alertMessage: `Warning: Stock for ${inventory.productName} is low (${inventory.stockQuantity} ${inventory.unit} remaining). Reorder recommended.`,
      detectedAt: getAsiaKolkataISOString(),
    },
  });
}

/**
 * 9. Product stock reaches zero
 */
export async function emitStockZeroEvent(inventory: InventoryItem) {
  const eventId = `inventory.stock_zero_${inventory.storeId}_${inventory.productId}`;
  return emitAutomationEvent({
    eventType: 'inventory.stock_zero',
    eventId,
    orderId: null,
    customerId: null,
    merchantId: inventory.storeId,
    payload: {
      storeId: inventory.storeId,
      storeName: inventory.storeName,
      productId: inventory.productId,
      productName: inventory.productName,
      currentStock: 0,
      unit: inventory.unit,
      price: inventory.price,
      alertMessage: `Out of Stock: ${inventory.productName} at ${inventory.storeName} has reached 0 units. Marked unavailable in catalog.`,
      detectedAt: getAsiaKolkataISOString(),
    },
  });
}

/**
 * 10. Merchant account gets approved
 */
export async function emitMerchantApprovedEvent(store: Store) {
  const eventId = `merchant.approved_${store.id}`;
  return emitAutomationEvent({
    eventType: 'merchant.approved',
    eventId,
    orderId: null,
    customerId: null,
    merchantId: store.id,
    payload: {
      merchantId: store.id,
      storeName: store.name,
      category: store.category,
      address: store.address,
      area: store.area,
      city: store.city,
      district: store.district,
      state: store.state,
      latitude: store.latitude,
      longitude: store.longitude,
      phone: store.phone,
      approvalStatus: 'approved',
      approvedAt: getAsiaKolkataISOString(),
      welcomeMessage: `Congratulations! ${store.name} has been verified and approved for live orders on LocalMarket Ghumarwin.`,
    },
  });
}

/**
 * 11. New customer message
 */
export async function emitMessageReceivedEvent(message: ChatMessage, storeName: string = 'Merchant Store') {
  const eventId = `message.received_${message.id}`;
  return emitAutomationEvent({
    eventType: 'message.received',
    eventId,
    orderId: null,
    customerId: message.customerId || 'cust-aditya-kumar',
    merchantId: message.storeId || 'store-1',
    payload: {
      messageId: message.id,
      storeId: message.storeId || 'store-1',
      storeName,
      customerId: message.customerId || 'cust-aditya-kumar',
      sender: message.sender,
      text: message.text,
      sentAt: message.timestamp || getAsiaKolkataISOString(),
    },
  });
}

/**
 * 12. Appointment created
 */
export async function emitAppointmentCreatedEvent(appointment: Appointment) {
  const eventId = `appointment.created_${appointment.id}`;
  return emitAutomationEvent({
    eventType: 'appointment.created',
    eventId,
    orderId: null,
    customerId: appointment.customerId,
    merchantId: appointment.storeId,
    payload: {
      appointmentId: appointment.id,
      storeId: appointment.storeId,
      storeName: appointment.storeName,
      customerId: appointment.customerId,
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      serviceType: appointment.serviceType,
      date: appointment.date,
      timeSlot: appointment.timeSlot,
      notes: appointment.notes || '',
      status: appointment.status,
      createdAt: appointment.createdAt,
    },
  });
}

/**
 * 13. Appointment reminder
 */
export async function emitAppointmentReminderEvent(appointment: Appointment) {
  const todayStr = getAsiaKolkataDateString();
  const eventId = `appointment.reminder_${appointment.id}_${todayStr}`;
  return emitAutomationEvent({
    eventType: 'appointment.reminder',
    eventId,
    orderId: null,
    customerId: appointment.customerId,
    merchantId: appointment.storeId,
    payload: {
      appointmentId: appointment.id,
      storeId: appointment.storeId,
      storeName: appointment.storeName,
      customerId: appointment.customerId,
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      serviceType: appointment.serviceType,
      appointmentDate: appointment.date,
      timeSlot: appointment.timeSlot,
      reminderNotice: `Reminder: You have an upcoming ${appointment.serviceType} appointment with ${appointment.storeName} on ${appointment.date} at ${appointment.timeSlot}.`,
      sentAt: getAsiaKolkataISOString(),
    },
  });
}

/**
 * 14. Daily merchant sales summary
 */
export async function emitDailySalesSummaryEvent(summary: DailySalesSummary) {
  const eventId = `merchant.daily_sales_summary_${summary.storeId}_${summary.date}`;
  return emitAutomationEvent({
    eventType: 'merchant.daily_sales_summary',
    eventId,
    orderId: null,
    customerId: null,
    merchantId: summary.storeId,
    payload: {
      summaryId: summary.id,
      storeId: summary.storeId,
      storeName: summary.storeName,
      date: summary.date,
      totalOrders: summary.totalOrders,
      completedOrders: summary.completedOrders,
      cancelledOrders: summary.cancelledOrders,
      totalRevenue: summary.totalRevenue,
      pickupOrdersCount: summary.pickupOrdersCount,
      deliveryOrdersCount: summary.deliveryOrdersCount,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      generatedAt: summary.generatedAt,
    },
  });
}

/**
 * Marks an automation event as processed (for external automation platforms such as Make.com)
 */
export async function markAutomationEventProcessed(eventId: string): Promise<void> {
  const path = `${AUTOMATION_EVENTS_COLLECTION}/${eventId}`;
  try {
    await updateDoc(doc(db, AUTOMATION_EVENTS_COLLECTION, eventId), {
      processed: true,
      processedAt: getAsiaKolkataISOString(),
      status: 'processed',
    });
    console.log(`[Automation] Event marked processed by Make.com: ${eventId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Subscribes to the live automation event stream
 */
export function subscribeToAutomationEvents(
  onData: (events: AutomationEvent[]) => void
): () => void {
  const path = AUTOMATION_EVENTS_COLLECTION;
  const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const liveEvents = snapshot.docs.map((docSnap) => docSnap.data() as AutomationEvent);
      onData(liveEvents);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Saves or updates inventory stock item in Firestore and triggers stock low / stock zero events
 */
export async function saveInventoryItemToFirestore(item: InventoryItem): Promise<void> {
  const path = `${INVENTORY_COLLECTION}/${item.id}`;
  try {
    await setDoc(doc(db, INVENTORY_COLLECTION, item.id), item);

    // Event check: Stock zero
    if (item.stockQuantity <= 0) {
      await emitStockZeroEvent(item);
    } else if (item.stockQuantity <= item.lowStockThreshold) {
      // Event check: Stock low
      await emitStockLowEvent(item);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves appointment to Firestore and emits appointment.created event
 */
export async function saveAppointmentToFirestore(appointment: Appointment): Promise<void> {
  const path = `${APPOINTMENTS_COLLECTION}/${appointment.id}`;
  try {
    await setDoc(doc(db, APPOINTMENTS_COLLECTION, appointment.id), appointment);
    await emitAppointmentCreatedEvent(appointment);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Sends and persists appointment reminder
 */
export async function triggerAppointmentReminder(appointment: Appointment): Promise<void> {
  const path = `${APPOINTMENTS_COLLECTION}/${appointment.id}`;
  try {
    await updateDoc(doc(db, APPOINTMENTS_COLLECTION, appointment.id), {
      status: 'reminded',
    });
    await emitAppointmentReminderEvent(appointment);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Saves chat message to Firestore and emits message.received event
 */
export async function saveChatMessageToFirestore(
  message: ChatMessage,
  storeName: string = 'Local Store'
): Promise<void> {
  const path = `${CHAT_MESSAGES_COLLECTION}/${message.id}`;
  try {
    await setDoc(doc(db, CHAT_MESSAGES_COLLECTION, message.id), {
      ...message,
      createdAt: getAsiaKolkataISOString(),
    });
    await emitMessageReceivedEvent(message, storeName);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Calculates and persists daily sales summary for a merchant in Asia/Kolkata timezone
 */
export async function generateMerchantDailySummary(
  storeId: string,
  storeName: string,
  orders: Order[],
  targetDateStr?: string
): Promise<DailySalesSummary> {
  const dateStr = targetDateStr || getAsiaKolkataDateString();
  const summaryId = `${storeId}_${dateStr}`;
  const path = `${DAILY_SUMMARIES_COLLECTION}/${summaryId}`;

  // Filter orders for this merchant
  const merchantOrders = orders.filter((o) => o.storeId === storeId);
  const completedOrders = merchantOrders.filter((o) => o.status === 'completed');
  const cancelledOrders = merchantOrders.filter((o) => o.status === 'cancelled');

  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const pickupCount = merchantOrders.filter((o) => o.type === 'smart_pickup').length;
  const deliveryCount = merchantOrders.filter((o) => o.type === 'home_delivery').length;

  const summary: DailySalesSummary = {
    id: summaryId,
    storeId,
    storeName,
    date: dateStr,
    totalOrders: merchantOrders.length,
    completedOrders: completedOrders.length,
    cancelledOrders: cancelledOrders.length,
    totalRevenue,
    pickupOrdersCount: pickupCount,
    deliveryOrdersCount: deliveryCount,
    generatedAt: getAsiaKolkataISOString(),
  };

  try {
    await setDoc(doc(db, DAILY_SUMMARIES_COLLECTION, summaryId), summary);
    await emitDailySalesSummaryEvent(summary);
    return summary;
  } catch (error) {
    return handleFirestoreError(error, OperationType.WRITE, path);
  }
}
