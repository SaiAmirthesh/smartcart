import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Smartphone, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/formatters';

interface QrCodeDisplayProps {
  amount: number;
  cartId: string;
  billNumber: string;
}

export const QrCodeDisplay: React.FC<QrCodeDisplayProps> = ({
  amount,
  cartId,
  billNumber,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrGenerated, setQrGenerated] = useState(false);

  // UPI payment intent payload
  const upiPayload = `upi://pay?pa=smartcart.pos@upi&pn=SmartCart%20Supermarket&am=${amount.toFixed(
    2
  )}&cu=INR&tn=Bill%20${billNumber}%20Cart%20${cartId}`;

  useEffect(() => {
    if (canvasRef.current && amount > 0) {
      QRCode.toCanvas(
        canvasRef.current,
        upiPayload,
        {
          width: 200,
          margin: 1.5,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) {
            console.error('Error generating QR code:', error);
          } else {
            setQrGenerated(true);
          }
        }
      );
    }
  }, [upiPayload, amount]);

  return (
    <div className="flex flex-col items-center text-center">
      {/* Amount Header */}
      <div className="mb-4">
        <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
          Total Amount Due
        </span>
        <div className="text-3xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
          {formatCurrency(amount)}
        </div>
      </div>

      {/* QR Code Container with subtle card frame */}
      <div className="relative p-3 bg-white rounded-2xl border-2 border-dashed border-indigo-200/80 shadow-md shadow-indigo-100/50 flex flex-col items-center">
        <canvas
          ref={canvasRef}
          className={`rounded-lg transition-opacity duration-300 ${
            qrGenerated ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {!qrGenerated && (
          <div className="w-48 h-48 flex items-center justify-center text-slate-400">
            <QrCode className="w-12 h-12 animate-pulse" />
          </div>
        )}

        {/* Center overlay pill */}
        <div className="mt-2 flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-semibold border border-indigo-100">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span>Dynamic UPI QR</span>
        </div>
      </div>

      {/* App Logos & Instruction */}
      <div className="mt-4 space-y-2">
        <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
          Scan with GPay, PhonePe, Paytm, or BHIM
        </p>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">GPay</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">PhonePe</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">Paytm</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">BHIM</span>
        </div>
      </div>
    </div>
  );
};
