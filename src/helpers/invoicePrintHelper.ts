import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
};

const escapeHtml = (value: string = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCurrency = (val: number) => {
  return 'C$ ' + val.toFixed(2);
};

export const buildInvoiceHtml = (invoice: any, storeName: string) => {
  const invoiceNumber = invoice.invoice_number || 'INV-000000';
  const clientName = invoice.client_name || 'CONSUMIDOR FINAL';
  const dateStr = formatDate(invoice.invoice_date || new Date().toISOString());
  const seller = invoice.seller || 'Vendedor';
  const paymentMethod = (invoice.payment_method || 'Efectivo').toUpperCase();
  const subtotal = Number(invoice.total || invoice.grand_total || 0);
  const discount = Number(invoice.discount || 0);
  const tax = Number(invoice.tax || 0);
  const grandTotal = Number(invoice.grand_total || 0);
  const note = invoice.invoice_note || '';

  const detailsRows = (invoice.invoice_details || [])
    .map(
      (item: any) => `
        <div class="item">
          <div class="item-name">${escapeHtml(item.product_name)}</div>
          <table class="item-meta-table">
            <tr>
              <td class="item-sku">${escapeHtml(item.sku || 'N/A')} ${item.quantity}x</td>
              <td class="item-unit">${formatCurrency(Number(item.price))}</td>
              <td class="item-total">${formatCurrency(Number(item.grand_total ?? item.total))}</td>
            </tr>
          </table>
        </div>`
    )
    .join('');

  // Metadatos de pago (cambio, recibido, etc.)
  let paymentDetailsHtml = '';
  if (invoice.payment_metadata) {
    const meta = invoice.payment_metadata;
    if (paymentMethod === 'CASH') {
      const paidNio = Number(meta.paid_nio || 0);
      const paidUsd = Number(meta.paid_usd || 0);
      const rate = Number(meta.exchange_rate || 36.5);
      const changeNio = Number(meta.change_nio || 0);

      let receivedStr = formatCurrency(paidNio);
      if (paidUsd > 0) {
        receivedStr += ` + $${paidUsd.toFixed(2)} USD`;
        if (rate > 0) {
          receivedStr += ` (Tasa ${rate})`;
        }
      }

      paymentDetailsHtml = `
        <tr class="summary-row" style="border-top: 1px dashed #000; font-weight: bold;">
          <td class="totals-label">Recibido:</td>
          <td class="totals-value">${receivedStr}</td>
        </tr>
        <tr class="summary-row">
          <td class="totals-label">Cambio:</td>
          <td class="totals-value">${formatCurrency(changeNio)}</td>
        </tr>
      `;
    } else if (paymentMethod === 'TRANSFER' && meta.bank) {
      paymentDetailsHtml = `
        <tr class="summary-row" style="border-top: 1px dashed #000; font-weight: bold;">
          <td class="totals-label">Banco:</td>
          <td class="totals-value">${escapeHtml(meta.bank)}</td>
        </tr>
        ${meta.reference ? `
        <tr class="summary-row">
          <td class="totals-label">Referencia:</td>
          <td class="totals-value">${escapeHtml(meta.reference)}</td>
        </tr>
        ` : ''}
      `;
    } else if (paymentMethod === 'CARD' && meta.card_brand) {
      paymentDetailsHtml = `
        <tr class="summary-row" style="border-top: 1px dashed #000; font-weight: bold;">
          <td class="totals-label">Tarjeta:</td>
          <td class="totals-value">${escapeHtml(meta.card_brand)}${meta.card_last_four ? ` (*${meta.card_last_four})` : ''}</td>
        </tr>
        ${meta.reference ? `
        <tr class="summary-row">
          <td class="totals-label">Referencia:</td>
          <td class="totals-value">${escapeHtml(meta.reference)}</td>
        </tr>
        ` : ''}
      `;
    }
  }

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${invoiceNumber}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
        }
        .paper {
          width: 80mm;
          margin: 0 auto;
          padding: 4mm 3mm;
          box-sizing: border-box;
          background: #fff;
          color: #000;
          font-family: 'Helvetica Neue', 'Arial', sans-serif;
          font-size: 11px;
          line-height: 1.3;
        }
        .header {
          text-align: center;
          margin-bottom: 3mm;
        }
        .store-name {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 1mm;
        }
        .info {
          font-size: 10px;
          color: #555;
          margin-bottom: 0.5mm;
        }
        .hr {
          border-top: 1px dashed #000;
          margin: 2mm 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        td {
          padding: 0.5mm 0;
          vertical-align: top;
        }
        .meta-table td {
          font-size: 10px;
        }
        .meta-label {
          font-weight: bold;
          color: #333;
        }
        .meta-value {
          text-align: right;
        }
        .items {
          margin: 2mm 0;
        }
        .item {
          padding: 1.5mm 0;
          border-bottom: 1px dashed #eee;
        }
        .item:last-child {
          border-bottom: none;
        }
        .item-name {
          font-weight: bold;
          font-size: 11px;
          margin-bottom: 0.5mm;
        }
        .item-meta-table td {
          font-size: 10px;
          color: #333;
        }
        .item-sku {
          width: 45%;
        }
        .item-unit {
          width: 25%;
          text-align: right;
        }
        .item-total {
          width: 30%;
          text-align: right;
          font-weight: bold;
        }
        .totals-table td {
          font-size: 11px;
        }
        .totals-label {
          width: 50%;
          font-weight: bold;
        }
        .totals-value {
          text-align: right;
          font-weight: bold;
        }
        .grand-total td {
          font-size: 13px;
          border-top: 1px dashed #000;
          padding-top: 1.5mm;
        }
        .note {
          font-size: 10px;
          font-style: italic;
          text-align: center;
          margin-top: 3mm;
          color: #444;
        }
        .footer {
          font-size: 10px;
          text-align: center;
          margin-top: 4mm;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="paper">
        <div class="header">
          <div class="store-name">${escapeHtml(storeName)}</div>
          <div class="info">DipleBill POS Móvil</div>
          <div class="info">Factura de Venta</div>
        </div>

        <div class="hr"></div>

        <table class="meta-table">
          <tr>
            <td class="meta-label">Factura Nº:</td>
            <td class="meta-value">${escapeHtml(invoiceNumber)}</td>
          </tr>
          <tr>
            <td class="meta-label">Fecha:</td>
            <td class="meta-value">${escapeHtml(dateStr)}</td>
          </tr>
          <tr>
            <td class="meta-label">Cliente:</td>
            <td class="meta-value">${escapeHtml(clientName)}</td>
          </tr>
          <tr>
            <td class="meta-label">Vendedor:</td>
            <td class="meta-value">${escapeHtml(seller)}</td>
          </tr>
          <tr>
            <td class="meta-label">Pago:</td>
            <td class="meta-value">${escapeHtml(paymentMethod)}</td>
          </tr>
        </table>

        <div class="hr"></div>

        <div class="items">
          ${detailsRows}
        </div>

        <div class="hr"></div>

        <table class="totals-table">
          <tr class="summary-row">
            <td class="totals-label">Subtotal:</td>
            <td class="totals-value">${formatCurrency(subtotal)}</td>
          </tr>
          ${discount > 0 ? `
          <tr class="summary-row">
            <td class="totals-label">Descuento:</td>
            <td class="totals-value">-${formatCurrency(discount)}</td>
          </tr>
          ` : ''}
          ${tax > 0 ? `
          <tr class="summary-row">
            <td class="totals-label">Impuesto:</td>
            <td class="totals-value">${formatCurrency(tax)}</td>
          </tr>
          ` : ''}
          <tr class="grand-total">
            <td class="totals-label">TOTAL NETO:</td>
            <td class="totals-value">${formatCurrency(grandTotal)}</td>
          </tr>
          ${paymentDetailsHtml}
        </table>

        ${note ? `
          <div class="hr"></div>
          <div class="note">Observaciones: ${escapeHtml(note)}</div>
        ` : ''}

        <div class="footer">
          ¡Gracias por su compra!
        </div>
      </div>
    </body>
  </html>`;
};

export const printInvoice = async (invoice: any, storeName: string) => {
  try {
    const html = buildInvoiceHtml(invoice, storeName);
    await Print.printAsync({ html });
  } catch (error: any) {
    // Evitar mostrar alerta de error si el usuario canceló la impresión
    const message = error?.message || String(error);
    if (
      message.includes('did not complete') ||
      message.includes('cancel') ||
      message.includes('dismiss')
    ) {
      if (__DEV__) {
        console.log('Impresión cancelada o cerrada por el usuario:', message);
      }
      return;
    }
    console.error('Error printing invoice:', error);
    Alert.alert('Error', 'No se pudo abrir el diálogo de impresión.');
  }
};

export const shareInvoice = async (invoice: any, storeName: string) => {
  try {
    const html = buildInvoiceHtml(invoice, storeName);
    const { uri } = await Print.printToFileAsync({ html });
    
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Factura ${invoice.invoice_number}`
      });
    } else {
      Alert.alert('Error', 'La función de compartir no está disponible en este dispositivo.');
    }
  } catch (error) {
    console.error('Error sharing invoice:', error);
    Alert.alert('Error', 'Ocurrió un error al generar o compartir el archivo PDF.');
  }
};
