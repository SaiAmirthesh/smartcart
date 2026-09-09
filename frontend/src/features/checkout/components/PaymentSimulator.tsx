import React from 'react';
import { CheckCircle2, Play, AlertCircle } from 'lucide-react';
import { Button } from '../../../shared/components/Button';
import type { PaymentStatus } from '../types';

interface PaymentSimulatorProps {
  status: PaymentStatus;
  onSimulateSuccess: () => void;
  onSimulateFailure?: () => void;
  errorMessage?: string;
}

export const PaymentSimulator: React.FC<PaymentSimulatorProps> = ({
  status,
  onSimulateSuccess,
  onSimulateFailure,
  errorMessage,
}) => {
  const isProcessing = status === 'processing';

  return (
    <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
      <div className="bg-amber-50/80 border border-amber-200/70 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2.5">
        <Play className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block text-amber-900">Payment Simulation Mode</strong>
          <span>
            Click below to simulate customer completing payment via UPI. In production, this webhook will be handled automatically by Razorpay.
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2.5">
        <Button
          variant="success"
          size="md"
          onClick={onSimulateSuccess}
          isLoading={isProcessing}
          icon={<CheckCircle2 className="w-4 h-4" />}
          className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 font-semibold"
        >
          {isProcessing ? 'Verifying Transaction...' : 'Simulate Payment Success'}
        </Button>

        {onSimulateFailure && (
          <Button
            variant="ghost"
            size="md"
            onClick={onSimulateFailure}
            disabled={isProcessing}
            className="text-slate-400 hover:text-rose-600 text-xs sm:w-auto"
          >
            Simulate Fail
          </Button>
        )}
      </div>
    </div>
  );
};
