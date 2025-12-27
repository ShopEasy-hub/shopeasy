import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { X, Download, Printer, Home, Receipt as ReceiptIcon, FileText } from 'lucide-react';

interface ReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBackToHome?: () => void;
  sale: {
    id: string;
    receiptNumber: string;
    date: string;
    customer: string;
    customerPhone?: string;
    customerBirthDate?: string;
    cashierName?: string;
    items: Array<{
      name: string;
      sku: string;
      quantity: number;
      price: number;
      total: number;
    }>;
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
  };
  branch?: {
    name: string;
    address?: string;
    phone?: string;
  };
  businessName?: string;
  receiptType?: 'thermal' | 'a4';
}

export function Receipt({ 
  open, 
  onOpenChange, 
  onBackToHome,
  sale, 
  branch,
  businessName = 'shopeasy',
  receiptType = 'thermal'
}: ReceiptProps) {
  const [currentType, setCurrentType] = useState<'thermal' | 'a4'>(receiptType);
  
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // In a real implementation, this would generate a PDF
    alert('PDF download functionality will be implemented with a PDF library');
  };

  const renderReceiptContent = (type: 'thermal' | 'a4') => {
    const isThermal = type === 'thermal';
    
    return (
      <div 
        className={`bg-white text-black ${isThermal ? 'p-4 text-xs' : 'p-8 text-sm'}`}
        id="receipt-content"
      >
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          {!isThermal && (
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-2xl font-bold">S</span>
            </div>
          )}
          <h1 className={`${isThermal ? 'text-base font-bold' : 'text-3xl font-bold'} mb-2`}>
            {businessName}
          </h1>
          {branch && (
            <>
              <p className={`${isThermal ? 'font-medium' : 'font-semibold text-base'}`}>{branch.name}</p>
              {branch.address && <p className={`${isThermal ? 'text-xs' : 'text-sm'} mt-1`}>{branch.address}</p>}
              {branch.phone && <p className={`${isThermal ? 'text-xs' : 'text-sm'}`}>{branch.phone}</p>}
            </>
          )}
        </div>

        {/* Receipt Info */}
        <div className="mb-4 space-y-1">
          <div className="flex justify-between">
            <span className="font-semibold">Receipt #:</span>
            <span>{sale.receiptNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Date:</span>
            <span>{new Date(sale.date).toLocaleString()}</span>
          </div>
        </div>

        {/* Customer Info */}
        {(sale.customer !== 'Walk-in Customer' || sale.customerPhone) && (
          <div className="mb-4 pb-4 border-b border-dashed border-gray-400">
            <p className="font-semibold mb-1">Customer:</p>
            <p>{sale.customer}</p>
            {sale.customerPhone && <p>Phone: {sale.customerPhone}</p>}
            {sale.customerBirthDate && <p>DOB: {sale.customerBirthDate}</p>}
          </div>
        )}

        {/* Items Table */}
        <div className="mb-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left py-2">Item</th>
                <th className="text-center py-2">Qty</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, index) => (
                <tr key={index} className="border-b border-dashed border-gray-300">
                  <td className="py-2">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className={`${isThermal ? 'text-[10px]' : 'text-xs'} text-gray-600`}>{item.sku}</p>
                    </div>
                  </td>
                  <td className="text-center py-2">{item.quantity}</td>
                  <td className="text-right py-2">₦{item.price.toFixed(2)}</td>
                  <td className="text-right py-2 font-medium">₦{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="space-y-2 mb-4 pb-4 border-b-2 border-black">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₦{sale.subtotal.toFixed(2)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Discount:</span>
              <span>-₦{sale.discount.toFixed(2)}</span>
            </div>
          )}
          <div className={`flex justify-between ${isThermal ? 'text-base' : 'text-xl'} font-bold mt-2`}>
            <span>TOTAL:</span>
            <span>₦{sale.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Method & Cashier */}
        <div className="mb-4 pb-4 border-b border-dashed border-gray-400 space-y-1">
          <div className="flex justify-between">
            <span className="font-semibold">Payment Method:</span>
            <span className="uppercase">{sale.paymentMethod}</span>
          </div>
          {sale.cashierName && (
            <div className="flex justify-between">
              <span className="font-semibold">Cashier:</span>
              <span>{sale.cashierName}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-2">
          <p className={`${isThermal ? 'text-sm' : 'text-lg'} font-semibold`}>
            Thank you for your purchase!
          </p>
          <p className={`${isThermal ? 'text-[10px]' : 'text-xs'} text-gray-600`}>
            Powered by shopeasy
          </p>
          
          {/* QR Code Placeholder */}
          {!isThermal && (
            <div className="mt-4 flex justify-center">
              <div className="w-32 h-32 border-2 border-gray-300 flex items-center justify-center text-xs text-gray-400">
                QR Code<br/>#{sale.receiptNumber}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Receipt</DialogTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadPDF}
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Receipt Type Tabs */}
        <Tabs value={currentType} onValueChange={(v) => setCurrentType(v as 'thermal' | 'a4')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="thermal">
              <ReceiptIcon className="w-4 h-4 mr-2" />
              Thermal (3-inch)
            </TabsTrigger>
            <TabsTrigger value="a4">
              <FileText className="w-4 h-4 mr-2" />
              A4 Printable
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="thermal" className="mt-4">
            <div className="max-w-sm mx-auto">
              {renderReceiptContent('thermal')}
            </div>
          </TabsContent>
          
          <TabsContent value="a4" className="mt-4">
            {renderReceiptContent('a4')}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          {onBackToHome && (
            <Button 
              className="flex-1"
              onClick={onBackToHome}
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          )}
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
