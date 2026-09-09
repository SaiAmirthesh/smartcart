import React, { useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { QrCodeDisplay } from './QrCodeDisplay';
import { PaymentSimulator } from './PaymentSimulator';
import { PaymentSuccessView } from './PaymentSuccessView';
import { PaymentService } from '../services/paymentService';
import type { CartItem, CartTotals } from '../../cart/types';
import type { PaymentReceipt, PaymentStatus } from '../types';
import { DEFAULT_CART_ID, DEFAULT_STORE_NAME } from '../../../shared/config/constants';
import { generateBillNumber } from '../../../shared/utils/formatters';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  totals: CartTotals;
  items: CartItem[];
  cartId?: string;
  onNewBill: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  totals,
  items,
  cartId = DEFAULT_CART_ID,
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
      const result = await PaymentService.simulatePayment(totals.total, true);

      if (result.success) {
        const newReceipt: PaymentReceipt = {
          transactionId: result.transactionId,
          billNumber,
          cartId,
          storeName: DEFAULT_STORE_NAME,
          totals,
          items: [...items],
          timestamp: new Date().toISOString(),
          paymentMethod: 'UPI Dynamic QR (Simulated)',
        };

        setReceipt(newReceipt);
        setStatus('success');
      } else {
        setStatus('failed');
        setErrorMessage(result.error || 'Payment failed.');
      }
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
            cartId={cartId}
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
