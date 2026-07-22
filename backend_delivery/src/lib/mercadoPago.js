// src/lib/mercadoPago.js
// ⚡ Mercado Pago Pix — client + helper de criação de QR
import { MercadoPagoConfig, Order } from 'mercadopago';
import crypto from 'crypto';

let _mpOrder = null;
export function getMpOrder() {
  if (_mpOrder) return _mpOrder;
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado.');
  const client = new MercadoPagoConfig({ accessToken: token, options: { timeout: 10000 } });
  _mpOrder = new Order(client);
  return _mpOrder;
}

/**
 * Valida a assinatura do webhook do Mercado Pago.
 * Docs: https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks
 */
export function validateWebhookSignature({ xSignature, xRequestId, dataId, secret }) {
  if (!xSignature || !secret) return false;
  // x-signature format: "ts=1234567890,v1=abcdef..."
  const parts = String(xSignature).split(',').reduce((acc, p) => {
    const [k, v] = p.split('=').map(s => s.trim());
    if (k && v) acc[k] = v;
    return acc;
  }, {});
  if (!parts.ts || !parts.v1) return false;

  const template = `id:${dataId};request-id:${xRequestId};ts:${parts.ts};`;
  const expected = crypto.createHmac('sha256', secret).update(template).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(parts.v1, 'hex'));
  } catch { return false; }
}

/** Extrai dados de QR de uma resposta de order do MP (schema pode variar) */
export function extrairQrDaOrder(response) {
  const p0 = response?.transactions?.payments?.[0] ?? response?.transaction?.payments?.[0] ?? {};
  return {
    mpOrderId: response?.id,
    copiaECola:
      p0?.payment_method?.qr_code ?? p0?.qr_code ?? response?.type_response?.qr_data ?? response?.qr_data ?? '',
    qrCodeBase64:
      p0?.payment_method?.qr_code_base64 ?? p0?.qr_code_base64 ?? response?.type_response?.qr_code_base64 ?? response?.qr_code_base64 ?? '',
    ticketUrl: p0?.payment_method?.ticket_url ?? p0?.ticket_url ?? response?.ticket_url ?? '',
    status: response?.status,
    statusDetail: response?.status_detail
  };
}
