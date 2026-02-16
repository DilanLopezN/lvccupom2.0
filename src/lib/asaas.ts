import 'server-only'
import axios from 'axios'
import { z } from 'zod'

/* ================================
   TIPOS
================================ */

export interface AsaasConfig {
  apiKey: string
  baseUrl: string
}

export interface CreatePixPaymentRequest {
  amount: number // valor em centavos (convertido para reais)
  description: string
  expiresInSeconds?: number
  customer: {
    name: string
    email: string
    cpfCnpj: string
    mobilePhone?: string
  }
}

export interface PendingPayment {
  id: string
  userId?: string
  paymentId: string
  customerEmail: string
  customerName: string
  amount: number
  status: 'pending' | 'paid' | 'expired' | 'canceled'
  planType: 'premium'
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

/* ================================
   CLIENT
================================ */

export class AsaasClient {
  private config: AsaasConfig

  constructor(config: AsaasConfig) {
    this.config = config
  }

  private get headers() {
    if (!this.config.apiKey) {
      throw new Error('ASAAS_API_KEY não configurada')
    }

    return {
      'Content-Type': 'application/json',
      access_token: this.config.apiKey
    }
  }

  /* ================================
     CUSTOMER
  ================================= */

  async findOrCreateCustomer(data: {
    name: string
    email: string
    cpfCnpj: string
    mobilePhone?: string
  }): Promise<{ id: string }> {
    try {
      const searchResponse = await axios.get(
        `${this.config.baseUrl}/customers`,
        {
          headers: this.headers,
          params: { cpfCnpj: data.cpfCnpj }
        }
      )

      if (searchResponse.data?.data?.length > 0) {
        return searchResponse.data.data[0]
      }

      const createResponse = await axios.post(
        `${this.config.baseUrl}/customers`,
        {
          name: data.name,
          cpfCnpj: data.cpfCnpj,
          email: data.email,
          mobilePhone: data.mobilePhone || undefined,
          notificationDisabled: false
        },
        { headers: this.headers }
      )

      return createResponse.data
    } catch (error: any) {
      console.error('=== ERRO CUSTOMER ASAAS ===')
      console.error('Status:', error?.response?.status)
      console.error('Data:', JSON.stringify(error?.response?.data, null, 2))
      console.error('URL:', error?.config?.url)
      console.error(
        'Headers enviados:',
        JSON.stringify(error?.config?.headers, null, 2)
      )
      console.error(
        'Body enviado:',
        JSON.stringify(error?.config?.data, null, 2)
      )
      console.error('=== FIM ===')
      throw error
    }
  }

  /* ================================
     CRIAR PIX
  ================================= */

  async createPixPayment(data: CreatePixPaymentRequest): Promise<{
    paymentId: string
    qrCode: string
    qrCodeBase64: string
    expiresAt: string
    value: number
    status: string
    invoiceUrl: string
  }> {
    try {
      const customer = await this.findOrCreateCustomer(data.customer)

      const dueDate = new Date()
      dueDate.setSeconds(dueDate.getSeconds() + (data.expiresInSeconds || 3600))
      const dueDateStr = dueDate.toISOString().split('T')[0]

      const valueInReais = data.amount / 100

      const paymentResponse = await axios.post(
        `${this.config.baseUrl}/payments`,
        {
          customer: customer.id,
          billingType: 'PIX',
          value: valueInReais,
          dueDate: dueDateStr,
          description: data.description,
          externalReference: `cupons-amor-${Date.now()}`
        },
        { headers: this.headers }
      )

      const payment = paymentResponse.data
      const paymentId = payment.id

      const pixData = await this.getPixQrCode(paymentId)

      return {
        paymentId,
        qrCode: pixData.payload,
        qrCodeBase64: pixData.encodedImage,
        expiresAt: pixData.expirationDate || dueDate.toISOString(),
        value: payment.value,
        status: payment.status,
        invoiceUrl: payment.invoiceUrl
      }
    } catch (error: any) {
      console.error('=== ERRO PIX ASAAS ===')
      console.error('Status:', error?.response?.status)
      console.error('Data:', JSON.stringify(error?.response?.data, null, 2))
      console.error('URL:', error?.config?.url)
      console.error('Method:', error?.config?.method)
      console.error(
        'Body enviado:',
        JSON.stringify(error?.config?.data, null, 2)
      )
      console.error('Base URL usada:', this.config.baseUrl)
      console.error(
        'API Key (primeiros 10 chars):',
        this.config.apiKey?.substring(0, 10) + '...'
      )
      console.error('=== FIM ===')
      throw error
    }
  }

  /* ================================
     STATUS PAGAMENTO
  ================================= */

  async getPayment(paymentId: string) {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/payments/${paymentId}`,
        { headers: this.headers }
      )
      return response.data
    } catch (error: any) {
      console.error(
        'Erro ao buscar pagamento Asaas:',
        error?.response?.data || error
      )
      throw error
    }
  }

  /* ================================
     QR CODE PIX
  ================================= */

  async getPixQrCode(paymentId: string): Promise<{
    encodedImage: string
    payload: string
    expirationDate: string
  }> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/payments/${paymentId}/pixQrCode`,
        { headers: this.headers }
      )
      return response.data
    } catch (error: any) {
      console.error(
        'Erro ao buscar QR Code Asaas:',
        error?.response?.data || error
      )
      throw error
    }
  }
}

/* ================================
   FACTORY SEGURA (SEM INSTÂNCIA GLOBAL)
================================ */

function getEnvOrThrow(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não definida`)
  }
  return value
}

export function getAsaasClient(): AsaasClient {
  const apiKey = getEnvOrThrow('ASAAS_API_KEY')
  const baseUrl = getEnvOrThrow('ASAAS_BASE_URL')

  console.log('[AsaasClient] Base URL:', baseUrl)
  console.log(
    '[AsaasClient] API Key definida:',
    !!apiKey,
    '| Tamanho:',
    apiKey.length
  )

  return new AsaasClient({ apiKey, baseUrl })
}

/* ================================
   SCHEMA
================================ */

export const registerWithPaymentSchema = z
  .object({
    name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z
      .string()
      .min(6, 'A senha deve ter pelo menos 6 caracteres'),
    paymentId: z.string().optional(),
    planType: z.string().default('base')
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword']
  })
