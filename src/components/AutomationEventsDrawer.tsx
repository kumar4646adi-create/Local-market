import React, { useState } from 'react';
import {
  AutomationEvent,
  AutomationEventType,
  Store,
  Order,
  InventoryItem,
  Appointment,
  ChatMessage,
} from '../types';
import {
  markAutomationEventProcessed,
  emitOrderCreatedEvent,
  emitOrderAcceptedEvent,
  emitOrderPreparingEvent,
  emitOrderReadyEvent,
  emitCustomerArrivedEvent,
  emitOrderCompletedEvent,
  emitOrderCancelledEvent,
  emitStockLowEvent,
  emitStockZeroEvent,
  emitMerchantApprovedEvent,
  emitMessageReceivedEvent,
  emitAppointmentCreatedEvent,
  emitAppointmentReminderEvent,
  generateMerchantDailySummary,
} from '../firebase/automation';
import { getAsiaKolkataDateString, formatAsiaKolkataDateTime } from '../utils/timezone';
import { sendOrderCreatedWebhook } from '../services/makeWebhook';

interface AutomationEventsDrawerProps {
  events: AutomationEvent[];
  stores: Store[];
  orders: Order[];
  onClose: () => void;
}

export const AutomationEventsDrawer: React.FC<AutomationEventsDrawerProps> = ({
  events,
  stores,
  orders,
  onClose,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<AutomationEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'events' | 'testing' | 'make_docs'>('events');
  const [testNotification, setTestNotification] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const displayEvents = events.filter((ev) => {
    if (filterType === 'all') return true;
    if (filterType === 'unprocessed') return !ev.processed;
    return ev.eventType === filterType;
  });

  const showFeedback = (msg: string) => {
    setTestNotification(msg);
    setTimeout(() => setTestNotification(null), 3500);
  };

  const handleTestEvent = async (type: AutomationEventType) => {
    const primaryStore = stores[0];
    const primaryOrder = orders[0] || {
      id: `ord-sample-${Date.now()}`,
      orderNumber: '#GW-9120',
      storeId: primaryStore.id,
      storeName: primaryStore.name,
      storeAddress: primaryStore.address,
      totalAmount: 430,
      status: 'placed' as const,
      type: 'smart_pickup' as const,
      orderTime: 'Today, 2:30 PM',
      estimatedReadyTime: '15 mins',
      pickupOtp: '5821',
      items: [{ product: primaryStore.products[0], quantity: 1 }],
      customerId: 'cust-aditya-kumar',
      customerName: 'Aditya Kumar',
      customerPhone: '+91 98160 46460',
    };

    try {
      switch (type) {
        case 'order.created': {
          const { event } = await emitOrderCreatedEvent(primaryOrder);
          const webhookResult = await sendOrderCreatedWebhook(primaryOrder, event.eventId);
          showFeedback(
            `Event 1: order.created dispatched to Firestore & Make.com webhook (${webhookResult.message})!`
          );
          break;
        }
        case 'order.accepted':
          await emitOrderAcceptedEvent(primaryOrder);
          showFeedback('Event 2: order.accepted dispatched to Firestore!');
          break;
        case 'order.preparing':
          await emitOrderPreparingEvent(primaryOrder);
          showFeedback('Event 3: order.preparing dispatched to Firestore!');
          break;
        case 'order.ready':
          await emitOrderReadyEvent(primaryOrder);
          showFeedback('Event 4: order.ready dispatched to Firestore!');
          break;
        case 'customer.arrived':
          await emitCustomerArrivedEvent(primaryOrder);
          showFeedback('Event 5: customer.arrived ("I\'m Here") dispatched!');
          break;
        case 'order.completed':
          await emitOrderCompletedEvent(primaryOrder);
          showFeedback('Event 6: order.completed dispatched to Firestore!');
          break;
        case 'order.cancelled':
          await emitOrderCancelledEvent(primaryOrder, 'Customer requested change of pickup slot');
          showFeedback('Event 7: order.cancelled dispatched to Firestore!');
          break;
        case 'inventory.stock_low': {
          const sampleItem: InventoryItem = {
            id: `${primaryStore.id}_${primaryStore.products[0].id}`,
            storeId: primaryStore.id,
            storeName: primaryStore.name,
            productId: primaryStore.products[0].id,
            productName: primaryStore.products[0].name,
            price: primaryStore.products[0].price,
            unit: primaryStore.products[0].unit,
            stockQuantity: 4,
            lowStockThreshold: 5,
            inStock: true,
            updatedAt: new Date().toISOString(),
          };
          await emitStockLowEvent(sampleItem);
          showFeedback('Event 8: inventory.stock_low dispatched to Firestore!');
          break;
        }
        case 'inventory.stock_zero': {
          const sampleItemZero: InventoryItem = {
            id: `${primaryStore.id}_${primaryStore.products[1].id}`,
            storeId: primaryStore.id,
            storeName: primaryStore.name,
            productId: primaryStore.products[1].id,
            productName: primaryStore.products[1].name,
            price: primaryStore.products[1].price,
            unit: primaryStore.products[1].unit,
            stockQuantity: 0,
            lowStockThreshold: 5,
            inStock: false,
            updatedAt: new Date().toISOString(),
          };
          await emitStockZeroEvent(sampleItemZero);
          showFeedback('Event 9: inventory.stock_zero dispatched to Firestore!');
          break;
        }
        case 'merchant.approved':
          await emitMerchantApprovedEvent(primaryStore);
          showFeedback('Event 10: merchant.approved dispatched to Firestore!');
          break;
        case 'message.received': {
          const testMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            storeId: primaryStore.id,
            customerId: 'cust-aditya-kumar',
            sender: 'user',
            text: 'Namaste! Is the fresh Himachali paneer ready for pickup today?',
            timestamp: 'Just now',
          };
          await emitMessageReceivedEvent(testMsg, primaryStore.name);
          showFeedback('Event 11: message.received dispatched to Firestore!');
          break;
        }
        case 'appointment.created': {
          const testApt: Appointment = {
            id: `apt-test-${Date.now()}`,
            storeId: stores[1]?.id || primaryStore.id,
            storeName: stores[1]?.name || primaryStore.name,
            customerId: 'cust-aditya-kumar',
            customerName: 'Aditya Kumar',
            customerPhone: '+91 98160 46460',
            serviceType: 'Bakery Custom Cake Tasting & Design',
            date: getAsiaKolkataDateString(),
            timeSlot: '04:30 PM - 05:00 PM',
            status: 'scheduled',
            createdAt: new Date().toISOString(),
          };
          await emitAppointmentCreatedEvent(testApt);
          showFeedback('Event 12: appointment.created dispatched to Firestore!');
          break;
        }
        case 'appointment.reminder': {
          const testAptRem: Appointment = {
            id: `apt-rem-${Date.now()}`,
            storeId: stores[1]?.id || primaryStore.id,
            storeName: stores[1]?.name || primaryStore.name,
            customerId: 'cust-aditya-kumar',
            customerName: 'Aditya Kumar',
            customerPhone: '+91 98160 46460',
            serviceType: 'Himachal Medicos Prescription Check',
            date: getAsiaKolkataDateString(),
            timeSlot: '11:00 AM - 11:30 AM',
            status: 'scheduled',
            createdAt: new Date().toISOString(),
          };
          await emitAppointmentReminderEvent(testAptRem);
          showFeedback('Event 13: appointment.reminder dispatched to Firestore!');
          break;
        }
        case 'merchant.daily_sales_summary':
          await generateMerchantDailySummary(primaryStore.id, primaryStore.name, orders);
          showFeedback('Event 14: merchant.daily_sales_summary dispatched to Firestore!');
          break;
      }
    } catch (err) {
      console.error('Test event trigger error:', err);
      showFeedback(`Failed: ${(err as Error).message}`);
    }
  };

  const handleCopySample = () => {
    const samplePayload = {
      eventType: 'order.created',
      eventId: 'order.created_ord-8921',
      orderId: 'ord-8921',
      customerId: 'cust-aditya-kumar',
      merchantId: 'store-1',
      timestamp: '2026-10-05T14:30:00+05:30',
      status: 'pending',
      processed: false,
      processedAt: null,
      payload: {
        orderId: 'ord-8921',
        orderNumber: '#GW-8921',
        storeName: 'Sonu Kiryana Store',
        totalAmount: 540,
        pickupOtp: '4912',
        type: 'smart_pickup',
      },
    };
    navigator.clipboard.writeText(JSON.stringify(samplePayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-[#edeeef] overflow-hidden text-left">
        {/* Header */}
        <div className="bg-[#023616] p-4 text-white flex justify-between items-center shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs uppercase tracking-wider font-extrabold text-[#bbefc1]">
                Firestore Automation Stream
              </span>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white font-mono">
                Asia/Kolkata (IST)
              </span>
            </div>
            <h2 className="text-base font-extrabold text-white mt-0.5">
              Make.com / Webhook Event Engine
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-[#edeeef] bg-[#f8f9fa] px-4 pt-2 gap-2 shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab('events')}
            className={`py-2 px-3 border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'events'
                ? 'border-[#023616] text-[#023616]'
                : 'border-transparent text-[#717970] hover:text-[#191c1d]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">dynamic_feed</span>
            <span>Live Firestore Events ({events.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('testing')}
            className={`py-2 px-3 border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'testing'
                ? 'border-[#023616] text-[#023616]'
                : 'border-transparent text-[#717970] hover:text-[#191c1d]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">play_arrow</span>
            <span>1-Click Event Test Trigger (14 Events)</span>
          </button>
          <button
            onClick={() => setActiveTab('make_docs')}
            className={`py-2 px-3 border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'make_docs'
                ? 'border-[#023616] text-[#023616]'
                : 'border-transparent text-[#717970] hover:text-[#191c1d]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">integration_instructions</span>
            <span>Make.com Integration Guide</span>
          </button>
        </div>

        {/* Feedback pill */}
        {testNotification && (
          <div className="bg-[#bbefc1] text-[#00210b] px-4 py-2 text-xs font-bold flex items-center justify-between border-b border-[#023616]/20">
            <span>✓ {testNotification}</span>
            <span className="text-[10px] font-mono">{formatAsiaKolkataDateTime()}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {activeTab === 'events' && (
            <div className="space-y-3">
              {/* Filter Row */}
              <div className="flex justify-between items-center gap-2">
                <span className="text-[11px] font-bold text-[#717970]">
                  Watching collection <code className="font-mono text-[#023616]">/automation_events</code>
                </span>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-[#f8f9fa] border border-[#edeeef] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#191c1d] focus:outline-[#023616]"
                >
                  <option value="all">All Events ({events.length})</option>
                  <option value="unprocessed">Unprocessed Only ({events.filter((e) => !e.processed).length})</option>
                  <option value="order.created">order.created</option>
                  <option value="order.accepted">order.accepted</option>
                  <option value="order.preparing">order.preparing</option>
                  <option value="order.ready">order.ready</option>
                  <option value="customer.arrived">customer.arrived</option>
                  <option value="order.completed">order.completed</option>
                  <option value="order.cancelled">order.cancelled</option>
                  <option value="inventory.stock_low">inventory.stock_low</option>
                  <option value="inventory.stock_zero">inventory.stock_zero</option>
                  <option value="merchant.approved">merchant.approved</option>
                  <option value="message.received">message.received</option>
                  <option value="appointment.created">appointment.created</option>
                  <option value="appointment.reminder">appointment.reminder</option>
                  <option value="merchant.daily_sales_summary">merchant.daily_sales_summary</option>
                </select>
              </div>

              {displayEvents.length === 0 ? (
                <div className="p-8 text-center bg-[#f8f9fa] rounded-2xl border border-[#edeeef] space-y-2">
                  <span className="material-symbols-outlined text-4xl text-[#c1c9be]">
                    inbox
                  </span>
                  <p className="font-bold text-[#191c1d]">No matching automation events in Firestore</p>
                  <p className="text-[11px] text-[#717970]">
                    Place an order, arrive at counter, or switch to the "1-Click Event Test Trigger" tab to fire any event!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayEvents.map((ev) => (
                    <div
                      key={ev.eventId}
                      className="bg-white rounded-xl p-3 border border-[#edeeef] hover:border-[#023616]/40 transition-all shadow-xs space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-black text-xs text-[#023616] bg-[#bbefc1]/30 px-2 py-0.5 rounded">
                              {ev.eventType}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                ev.processed
                                  ? 'bg-blue-100 text-blue-900'
                                  : 'bg-amber-100 text-amber-900 animate-pulse'
                              }`}
                            >
                              {ev.processed ? 'Processed by Automation' : 'Pending Make.com Queue'}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-[#717970] mt-1">
                            ID: {ev.eventId}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] font-mono text-[#191c1d]">
                            {ev.timestamp}
                          </div>
                          {!ev.processed ? (
                            <button
                              onClick={() => markAutomationEventProcessed(ev.eventId)}
                              className="mt-1 bg-[#023616] text-white text-[10px] font-bold px-2 py-1 rounded cursor-pointer hover:bg-[#1e4d2b]"
                            >
                              Mark Processed ✓
                            </button>
                          ) : (
                            <span className="text-[9px] text-[#717970] block mt-1">
                              Processed: {ev.processedAt || 'Yes'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expandable payload preview */}
                      <details className="mt-1 pt-1 border-t border-[#edeeef]/60 group">
                        <summary className="cursor-pointer text-[11px] font-bold text-[#414941] hover:text-[#023616] flex items-center justify-between">
                          <span>View Automation Payload</span>
                          <span className="text-[10px] text-[#717970] group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <pre className="mt-2 bg-[#191c1d] text-emerald-300 p-2.5 rounded-lg text-[10px] font-mono overflow-x-auto max-h-48">
                          {JSON.stringify(ev, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'testing' && (
            <div className="space-y-4">
              <div className="bg-[#bbefc1]/30 p-3 rounded-2xl border border-[#bbefc1] text-xs text-[#00210b]">
                <h4 className="font-extrabold flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-sm">checklist</span>
                  <span>14/14 Real Event Dispatchers</span>
                </h4>
                <p className="text-[11px] text-[#21502e]">
                  Tap any event button below to dispatch a real Firestore document to <code className="font-mono">/automation_events</code>. Each event is strictly idempotent and respects the Asia/Kolkata timezone.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    num: '1',
                    type: 'order.created' as const,
                    title: 'New order created',
                    desc: 'Customer places pickup or delivery order',
                  },
                  {
                    num: '2',
                    type: 'order.accepted' as const,
                    title: 'Retailer accepts order',
                    desc: 'Store confirms they can fulfill the order',
                  },
                  {
                    num: '3',
                    type: 'order.preparing' as const,
                    title: 'Retailer starts preparing order',
                    desc: 'Kitchen/staff packs items and marks packing',
                  },
                  {
                    num: '4',
                    type: 'order.ready' as const,
                    title: 'Order ready for pickup',
                    desc: 'Counter OTP is activated for customer pickup',
                  },
                  {
                    num: '5',
                    type: 'customer.arrived' as const,
                    title: 'Customer taps "I\'m Here"',
                    desc: 'Customer reaches physical store counter',
                  },
                  {
                    num: '6',
                    type: 'order.completed' as const,
                    title: 'Order completed',
                    desc: 'OTP verified and bag handed over',
                  },
                  {
                    num: '7',
                    type: 'order.cancelled' as const,
                    title: 'Order cancelled',
                    desc: 'Order voided with explicit reason',
                  },
                  {
                    num: '8',
                    type: 'inventory.stock_low' as const,
                    title: 'Product stock becomes low',
                    desc: 'Stock drops <= lowStockThreshold (e.g. 4 remaining)',
                  },
                  {
                    num: '9',
                    type: 'inventory.stock_zero' as const,
                    title: 'Product stock reaches zero',
                    desc: 'Item hits 0 units and is flagged out-of-stock',
                  },
                  {
                    num: '10',
                    type: 'merchant.approved' as const,
                    title: 'Merchant account gets approved',
                    desc: 'Admin verifies storefront & confirmed coordinates',
                  },
                  {
                    num: '11',
                    type: 'message.received' as const,
                    title: 'New customer message',
                    desc: 'Live chat inquiry from customer to store',
                  },
                  {
                    num: '12',
                    type: 'appointment.created' as const,
                    title: 'Appointment created',
                    desc: 'Customer books consultation with local merchant',
                  },
                  {
                    num: '13',
                    type: 'appointment.reminder' as const,
                    title: 'Appointment reminder',
                    desc: 'Trigger scheduled reminder for upcoming booking',
                  },
                  {
                    num: '14',
                    type: 'merchant.daily_sales_summary' as const,
                    title: 'Daily merchant sales summary',
                    desc: 'Aggregates today\'s orders, revenue in IST',
                  },
                ].map((item) => (
                  <div
                    key={item.type}
                    className="p-3 bg-[#f8f9fa] rounded-xl border border-[#edeeef] hover:border-[#023616] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#023616] text-white text-[10px] font-bold flex items-center justify-center">
                          {item.num}
                        </span>
                        <span className="font-extrabold text-[#191c1d]">{item.title}</span>
                      </div>
                      <p className="text-[11px] text-[#717970] mt-1">{item.desc}</p>
                      <code className="text-[10px] text-[#023616] font-mono mt-1 block">
                        {item.type}
                      </code>
                    </div>

                    <button
                      onClick={() => handleTestEvent(item.type)}
                      className="mt-3 w-full bg-[#023616] hover:bg-[#1e4d2b] text-white py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-sm">play_arrow</span>
                      <span>Trigger Event #{item.num}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'make_docs' && (
            <div className="space-y-4">
              <div className="bg-[#f8f9fa] p-4 rounded-2xl border border-[#edeeef] space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-[#191c1d] text-sm flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-[#fd8b00]">webhook</span>
                    <span>How Make.com Consumes LocalMarket Events</span>
                  </h4>
                  <button
                    onClick={handleCopySample}
                    className="bg-white border border-[#edeeef] hover:border-[#023616] px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    <span>{copied ? 'Copied!' : 'Copy Sample Payload'}</span>
                  </button>
                </div>

                <p className="text-xs text-[#414941] leading-relaxed">
                  Make.com can consume these events in 2 convenient, zero-failure patterns:
                </p>

                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-xl border border-[#edeeef]">
                    <div className="font-bold text-[#023616]">
                      Pattern A: Firestore "Watch Documents" Trigger
                    </div>
                    <p className="text-[11px] text-[#717970] mt-0.5">
                      Configure the Make.com Cloud Firestore module to watch collection <code className="font-mono text-[#023616]">automation_events</code> where <code className="font-mono">processed == false</code>. Once the scenario executes (e.g. sends WhatsApp, Slack alert, or updates Google Sheets), Make.com updates <code className="font-mono">processed = true</code>.
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-[#edeeef]">
                    <div className="font-bold text-[#023616]">
                      Pattern B: Idempotent Event Deduplication
                    </div>
                    <p className="text-[11px] text-[#717970] mt-0.5">
                      Every event uses deterministic keys (e.g. <code className="font-mono text-[#023616]">order.created_ord-8921</code> or <code className="font-mono text-[#023616]">merchant.daily_sales_summary_store-1_2026-10-05</code>). If Make.com restarts or replays, the event ID prevents duplicate customer emails or duplicate SMS messages.
                    </p>
                  </div>
                </div>

                <h5 className="font-bold text-[#191c1d] text-xs pt-2">Standard Automation Event Schema:</h5>
                <pre className="bg-[#191c1d] text-emerald-300 p-3 rounded-xl font-mono text-[10px] overflow-x-auto">
{`{
  "eventType": "order.created",
  "eventId": "order.created_ord-8921",
  "orderId": "ord-8921",
  "customerId": "cust-aditya-kumar",
  "merchantId": "store-1",
  "timestamp": "2026-10-05T14:30:00+05:30",
  "status": "pending",
  "payload": {
    "orderNumber": "#GW-8921",
    "storeName": "Sonu Kiryana Store",
    "totalAmount": 540,
    "pickupOtp": "4912"
  },
  "processed": false,
  "processedAt": null
}`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
