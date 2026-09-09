import React, { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { QrCodeDisplay } from './QrCodeDisplay';
import { PaymentSimulator } from './PaymentSimulator';
import { PaymentSuccessView } from './PaymentSuccessView';
import { PaymentService } from '../services/paymentService';
import { smartCartApi } from '../../../shared/services/api';
import type { CartItem, CartTotals } from '../../cart/types';
import type { PaymentReceipt, PaymentStatus } from '../types';
import { DEFAULT_STORE_NAME } from '../../../shared/config/constants';
import { generateBillNumber } from '../../../shared/utils/formatters';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  totals: CartTotals;
  items: CartItem[];
  cartId: number | null;
  cartCode: string;
  onNewBill: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  totals,
  items,
  cartId,
  cartCode,
  onNewBill,
}) => {
  const [status, setStatus] = useState<PaymentStatus>('awaiting_payment');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [billNumber] = useState<string>(() => generateBillNumber());

  const handleSimulateSuccess = async () => {
    setStatus('processing');
    setErrorMessage(undefined);

    try {
      let transactionId = '';

      // If connected to backend, initiate checkout in FastAPI backend
      if (cartId) {
        try {
          const checkoutRes = await smartCartApi.checkout(cartId);
          transactionId = checkoutRes.transaction_code;
        } catch (apiErr) {
          console.warn('Backend checkout call failed, using simulation fallback:', apiErr);
        }
      }

      // If backend didn't provide transactionId, use simulated one
      if (!transactionId) {
        const simResult = await PaymentService.simulatePayment(totals.total, true);
        transactionId = simResult.transactionId;
      } else {
        // short simulated processing delay for UX
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      const newReceipt: PaymentReceipt = {
        transactionId,
        billNumber,
        cartId: cartCode,
        storeName: DEFAULT_STORE_NAME,
        totals,
        items: [...items],
        timestamp: new Date().toISOString(),
        paymentMethod: 'UPI Dynamic QR (Verified)',
      };

      setReceipt(newReceipt);
      setStatus('success');
    } catch {
      setStatus('failed');
      setErrorMessage('Unexpected gateway error occurred.');
    }
  };

  const handleSimulateFailure = async () => {
    setStatus('processing');
    setErrorMessage(undefined);

    const result = await PaymentService.simulatePayment(totals.total, false);
    setStatus('failed');
    setErrorMessage(result.error);
  };

  const handleStartNewBill = () => {
    setStatus('awaiting_payment');
    setReceipt(null);
    onNewBill();
    onClose();
  };

  const handleClose = () => {
    if (status === 'success') {
      handleStartNewBill();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={status === 'success' ? 'Payment Receipt' : 'Contactless Checkout'}
      subtitle={
        status === 'success'
          ? `Bill #${billNumber}`
          : 'Scan the QR code to complete your supermarket purchase'
      }
      maxWidth="md"
    >
      {status === 'success' && receipt ? (
        <PaymentSuccessView receipt={receipt} onStartNewBill={handleStartNewBill} />
      ) : (
        <div>
          <QrCodeDisplay
            amount={totals.total}
            cartId={cartCode}
            billNumber={billNumber}
          />

          <PaymentSimulator
            status={status}
            onSimulateSuccess={handleSimulateSuccess}
            onSimulateFailure={handleSimulateFailure}
            errorMessage={errorMessage}
          />
        </div>
      )}
    </Modal>
  );
};
