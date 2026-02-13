// src/lib/asaas.ts
import axios from 'axios'
import { z } from 'zod'

export interface AsaasConfig {
  apiKey: string
  baseUrl: string
}

export interface CreatePixPaymentRequest {
  amount: number // valor em centavos (será convertido para reais na chamada)
  description: string
  expiresInSeconds?: number
  customer: {
    name: string
    email: string
    cpfCnpj: string // OBRIGATÓRIO no Asaas para criar customer
    mobilePhone?: string
  }
}

export class AsaasClient {
  private config: AsaasConfig

  constructor(config: AsaasConfig) {
    this.config = config
  }

  private get headers() {
    console.log(
      'ASAAS_API_KEY presente:',
      !!this.config.apiKey,
      'length:',
      this.config.apiKey.length
    )
    return {
      'Content-Type': 'application/json',
      access_token: this.config.apiKey
    }
  }

  // Buscar ou criar customer no Asaas
  // cpfCnpj é OBRIGATÓRIO para criar customer
  async findOrCreateCustomer(data: {
    name: string
    email: string
    cpfCnpj: string
    mobilePhone?: string
  }): Promise<{ id: string }> {
    try {
      // Tentar buscar por cpfCnpj
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

      // Criar novo customer - name e cpfCnpj são obrigatórios
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
      console.error(
        'Erro ao buscar/criar customer Asaas:',
        error?.response?.data || error
      )
      throw error
    }
  }

  // Criar cobrança PIX
  async createPixPayment(data: CreatePixPaymentRequest): Promise<{
    paymentId: string
    qrCode: string // copia e cola (payload)
    qrCodeBase64: string // imagem base64 (encodedImage)
    expiresAt: string
    value: number
    status: string
    invoiceUrl: string
  }> {
    try {
      // 1. Buscar/criar customer
      const customer = await this.findOrCreateCustomer({
        name: data.customer.name,
        email: data.customer.email,
        cpfCnpj: data.customer.cpfCnpj,
        mobilePhone: data.customer.mobilePhone
      })

      // 2. Calcular dueDate (YYYY-MM-DD)
      const dueDate = new Date()
      dueDate.setSeconds(dueDate.getSeconds() + (data.expiresInSeconds || 3600))
      const dueDateStr = dueDate.toISOString().split('T')[0]

      // 3. Criar cobrança - value no Asaas é em REAIS (não centavos)
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

      // 4. Buscar QR Code PIX (endpoint separado)
      const pixData = await this.getPixQrCode(paymentId)

      return {
        paymentId,
        qrCode: pixData.payload, // código copia e cola
        qrCodeBase64: pixData.encodedImage, // imagem base64 do QR
        expiresAt: pixData.expirationDate || dueDate.toISOString(),
        value: payment.value,
        status: payment.status,
        invoiceUrl: payment.invoiceUrl
      }
    } catch (error: any) {
      console.error(
        'Erro ao criar pagamento PIX Asaas:',
        error?.response?.data || error
      )
      throw error
    }
  }

  // Buscar status de um pagamento
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

  // Buscar QR Code PIX de um pagamento
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

// Instância única do client
export const asaasClient = new AsaasClient({
  apiKey: process.env.ASAAS_API_KEY || '',
  baseUrl: process.env.ASAAS_BASE_URL || ''
})

// Schema de validação para registro com pagamento
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
