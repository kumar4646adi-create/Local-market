import React, { useState, useEffect } from 'react';
import { Order, Store, Product, StoreReview, ProductReview } from '../types';
import { submitOrUpdateStoreReview, submitOrUpdateProductReview } from '../firebase/services';

interface RatingModalProps {
  type: 'store' | 'product';
  order: Order;
  store?: Store;
  product?: Product;
  customerId: string;
  customerName: string;
  initialStoreReview?: StoreReview | null;
  initialProductReview?: ProductReview | null;
  onClose: () => void;
  onReviewSubmitted: (stats: { averageRating: number; totalRatings: number }) => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  type,
  order,
  store,
  product,
  customerId,
  customerName,
  initialStoreReview,
  initialProductReview,
  onClose,
  onReviewSubmitted,
}) => {
  // If product mode and no single product is specified, default to first item in order
  const [selectedProduct, setSelectedProduct] = useState<Product>(
    product || order.items[0]?.product
  );
  
  const [rating, setRating] = useState<number>(() => {
    if (type === 'store') {
      return initialStoreReview?.rating || 5;
    }
    return initialProductReview?.rating || 5;
  });

  const [reviewText, setReviewText] = useState<string>(() => {
    if (type === 'store') {
      return initialStoreReview?.review || '';
    }
    return initialProductReview?.review || '';
  });

  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update text/rating when selected product changes
  useEffect(() => {
    if (type === 'product' && selectedProduct) {
      if (initialProductReview && initialProductReview.productId === selectedProduct.id) {
        setRating(initialProductReview.rating);
        setReviewText(initialProductReview.review || '');
      } else {
        setRating(5);
        setReviewText('');
      }
    }
  }, [selectedProduct, type, initialProductReview]);

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setErrorMsg('Please select a star rating between 1 and 5.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (type === 'store') {
        const stats = await submitOrUpdateStoreReview({
          storeId: order.storeId,
          storeName: store?.name || order.storeName,
          orderId: order.id,
          customerId,
          customerName,
          rating,
          review: reviewText,
        });
        onReviewSubmitted(stats);
      } else {
        const targetProd = selectedProduct || order.items[0]?.product;
        const stats = await submitOrUpdateProductReview({
          productId: targetProd.id,
          productName: targetProd.name,
          storeId: order.storeId,
          storeName: store?.name || order.storeName,
          orderId: order.id,
          customerId,
          customerName,
          rating,
          review: reviewText,
        });
        onReviewSubmitted(stats);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setErrorMsg('Failed to save review to Firestore. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = type === 'store' ? !!initialStoreReview : !!initialProductReview;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-[#edeeef] flex flex-col text-left"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-[#023616] p-4 text-white flex justify-between items-center">
          <div>
            <span className="text-[10px] bg-[#bbefc1]/30 text-[#bbefc1] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {type === 'store' ? 'Store Review' : 'Product Review'}
            </span>
            <h3 className="font-extrabold text-base text-white mt-1">
              {type === 'store' ? (store?.name || order.storeName) : selectedProduct?.name}
            </h3>
            <p className="text-[11px] text-[#8bbd92] mt-0.5">
              Verified Order {order.orderNumber}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-all"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* If Product mode with multiple products in the order, show product picker */}
          {type === 'product' && order.items.length > 1 && (
            <div>
              <label className="block text-xs font-bold text-[#191c1d] mb-1.5">
                Select Purchased Product to Rate:
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {order.items.map((it) => (
                  <button
                    key={it.product.id}
                    type="button"
                    onClick={() => setSelectedProduct(it.product)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all border ${
                      selectedProduct.id === it.product.id
                        ? 'bg-[#023616] text-white border-[#023616] shadow-xs'
                        : 'bg-[#f8f9fa] text-[#414941] border-[#edeeef] hover:border-[#c1c9be]'
                    }`}
                  >
                    {it.product.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Star Rating Interactive UI */}
          <div className="text-center py-2 bg-[#f8f9fa] rounded-2xl border border-[#edeeef]">
            <p className="text-xs font-semibold text-[#717970] mb-2">
              Tap stars to rate (1–5)
            </p>

            <div className="flex justify-center items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110 active:scale-95 focus:outline-hidden"
                    aria-label={`${star} star`}
                  >
                    <span
                      className={`material-symbols-outlined text-3xl transition-colors ${
                        filled ? 'text-amber-400' : 'text-gray-300'
                      }`}
                      style={{ fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      star
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-bold text-[#023616] mt-1.5">
              {ratingLabels[hoverRating || rating]} ({rating} / 5)
            </div>
          </div>

          {/* Optional Review Textarea */}
          <div>
            <label className="block text-xs font-bold text-[#191c1d] mb-1">
              Written Review <span className="text-[#717970] font-normal">(Optional)</span>:
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={
                type === 'store'
                  ? 'Share your experience with packing speed, freshness, and counter pickup...'
                  : 'How was the quality, taste, freshness, or packaging of this item?'
              }
              rows={3}
              maxLength={1000}
              className="w-full bg-[#f8f9fa] border border-[#edeeef] focus:border-[#023616] focus:bg-white rounded-xl p-3 text-xs text-[#191c1d] outline-hidden transition-all resize-none"
            />
            <div className="text-right text-[10px] text-[#717970] mt-0.5">
              {reviewText.length} / 1000 characters
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-50 text-red-700 p-2.5 rounded-xl text-xs font-semibold border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-[#edeeef] hover:bg-[#e1e3e4] text-[#191c1d] text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-[#023616] hover:bg-[#1e4d2b] active:scale-98 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">check</span>
                  <span>{isEditing ? 'Update Review' : 'Submit Review'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
