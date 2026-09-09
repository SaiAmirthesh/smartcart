export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatDateTime = (dateInput?: Date | string | number): string => {
  const date = dateInput ? new Date(dateInput) : new Date();
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

export const generateTransactionId = (): string => {
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `TXN-${randomSuffix}`;
};

export const generateBillNumber = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  return `BILL-${timestamp}`;
};
