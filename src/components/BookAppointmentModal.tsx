import React, { useState } from 'react';
import { Store, Appointment } from '../types';
import { saveAppointmentToFirestore } from '../firebase/automation';
import { getAsiaKolkataDateString, getAsiaKolkataISOString } from '../utils/timezone';

interface BookAppointmentModalProps {
  store: Store;
  onClose: () => void;
  onAppointmentBooked: (appointment: Appointment) => void;
}

export const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({
  store,
  onClose,
  onAppointmentBooked,
}) => {
  const [customerName, setCustomerName] = useState('Aditya Kumar');
  const [customerPhone, setCustomerPhone] = useState('+91 98160 46460');
  const [serviceType, setServiceType] = useState(
    store.category === 'Bakery'
      ? 'Custom Cake Tasting & Design Consultation'
      : store.category === 'Pharmacy'
      ? 'Prescription Review & Medication Counseling'
      : store.category === 'Clothing'
      ? 'Bridal & Kurta Measurement Fitting'
      : store.category === 'Electronics'
      ? 'Device Diagnostic & Repair Drop-off'
      : 'In-Store Priority Shopping Consultation'
  );
  const [selectedDate, setSelectedDate] = useState(getAsiaKolkataDateString());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('11:00 AM - 11:30 AM');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const timeSlots = [
    '09:30 AM - 10:00 AM',
    '11:00 AM - 11:30 AM',
    '02:00 PM - 02:30 PM',
    '04:30 PM - 05:00 PM',
    '06:00 PM - 06:30 PM',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const appointmentId = `apt-${Date.now()}`;
    const newAppointment: Appointment = {
      id: appointmentId,
      storeId: store.id,
      storeName: store.name,
      customerId: 'cust-aditya-kumar',
      customerName,
      customerPhone,
      serviceType,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      notes,
      status: 'scheduled',
      createdAt: getAsiaKolkataISOString(),
    };

    try {
      await saveAppointmentToFirestore(newAppointment);
      onAppointmentBooked(newAppointment);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to book appointment:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-[#edeeef] text-left">
        <div className="bg-[#023616] p-4 text-white flex justify-between items-center">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#bbefc1] font-bold">
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              <span>Local Store Appointment</span>
            </div>
            <h3 className="font-extrabold text-base text-white mt-0.5">
              Book with {store.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#bbefc1] text-[#00210b] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>
            <h4 className="font-extrabold text-base text-[#191c1d]">
              Appointment Confirmed!
            </h4>
            <p className="text-xs text-[#717970] max-w-xs mx-auto">
              Your appointment with {store.name} has been booked and an automation event has been dispatched to Firestore for Make.com.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
            <div>
              <label className="block font-bold text-[#191c1d] mb-1">Service / Consultation Type</label>
              <input
                type="text"
                required
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full bg-[#f8f9fa] border border-[#edeeef] rounded-xl px-3 py-2 text-xs font-semibold text-[#191c1d] focus:outline-[#023616]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-[#191c1d] mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#f8f9fa] border border-[#edeeef] rounded-xl px-3 py-2 text-xs text-[#191c1d] focus:outline-[#023616]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#191c1d] mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-[#f8f9fa] border border-[#edeeef] rounded-xl px-3 py-2 text-xs text-[#191c1d] focus:outline-[#023616]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-[#191c1d] mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-[#f8f9fa] border border-[#edeeef] rounded-xl px-3 py-2 text-xs text-[#191c1d] focus:outline-[#023616]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#191c1d] mb-1">Time Slot</label>
                <select
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  className="w-full bg-[#f8f9fa] border border-[#edeeef] rounded-xl px-3 py-2 text-xs text-[#191c1d] focus:outline-[#023616]"
                >
                  {timeSlots.map((ts) => (
                    <option key={ts} value={ts}>
                      {ts}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#191c1d] mb-1">Special Notes / Requirements</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Need gluten-free sponge sample, or bringing old mobile phone."
                className="w-full bg-[#f8f9fa] border border-[#edeeef] rounded-xl px-3 py-2 text-xs text-[#191c1d] focus:outline-[#023616]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#023616] hover:bg-[#1e4d2b] text-white py-2.5 rounded-xl font-extrabold text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Booking & Emitting Event...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">event_available</span>
                    <span>Confirm Booking (Triggers Event)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
