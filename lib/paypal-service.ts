interface PayPalConfig {
  clientId: string
  clientSecret: string
  environment: "sandbox" | "live"
  baseUrl: string
}

interface PayPalAccessToken {
  access_token: string
  token_type: string
  expires_in: number
}

interface PayPalSubscription {
  id: string
  status: string
  plan_id: string
  subscriber: {
    email_address: string
  }
  links: Array<{
    href: string
    rel: string
    method: string
  }>
}

interface PayPalOrder {
  id: string
  status: string
  purchase_units: Array<{
    amount: {
      value: string
      currency_code: string
    }
  }>
  payer: {
    email_address: string
  }
  links: Array<{
    href: string
    rel: string
    method: string
  }>
}

interface PayPalCardPayment {
  id: string
  status: string
  amount: {
    value: string
    currency_code: string
  }
  payment_source: {
    card: {
      last_digits: string
      brand: string
      type: string
    }
  }
}

interface VaultedPaymentMethod {
  id: string
  customer_id: string
  payment_source: {
    card?: {
      last_digits: string
      brand: string
      type: string
      expiry: string
    }
    paypal?: {
      email_address: string
    }
  }
  links: Array<{
    href: string
    rel: string
    method: string
  }>
}

export class PayPalService {
  private config: PayPalConfig
  private tokenCache: {
    token: string
    expires: number
  } | null = null

  constructor() {
    this.config = {
      clientId: process.env.PAYPAL_CLIENT_ID!,
      clientSecret: process.env.PAYPAL_SECRET!,
      environment: process.env.NODE_ENV === "production" ? "live" : "sandbox",
      baseUrl: process.env.NODE_ENV === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
    }
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a cached token that's still valid
    if (this.tokenCache && this.tokenCache.expires > Date.now()) {
      return this.tokenCache.token
    }

    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64")

    const response = await fetch(`${this.config.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`PayPal auth failed: ${response.statusText} - ${errorText}`)
    }

    const data: PayPalAccessToken = await response.json()

    // Cache the token with a 10-minute buffer before expiration
    this.tokenCache = {
      token: data.access_token,
      expires: Date.now() + (data.expires_in - 600) * 1000,
    }

    return data.access_token
  }

  private getPlanId(plan: string): string {
    // Use the actual plan IDs from environment variables
    const planMapping = {
      basic: process.env.PAYPAL_PLAN_BASIC!,
      builder: process.env.PAYPAL_PLAN_BUILDER!,
      architect: process.env.PAYPAL_PLAN_ARCHITECT!,
    }

    const planId = planMapping[plan as keyof typeof planMapping]
    if (!planId) {
      throw new Error(`Invalid plan: ${plan}. Available plans: basic, builder, architect`)
    }

    return planId
  }

  async createSubscription(planId: string, userEmail: string): Promise<PayPalSubscription> {
    const accessToken = await this.getAccessToken()
    const actualPlanId = this.getPlanId(planId)

    console.log(`Creating subscription for plan: ${planId} -> PayPal Plan ID: ${actualPlanId}`)

    const subscriptionData = {
      plan_id: actualPlanId,
      subscriber: {
        email_address: userEmail,
      },
      application_context: {
        brand_name: "Code Homie",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        payment_method: {
          payer_selected: "PAYPAL",
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
        },
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/paypal/subscription/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
      },
    }

    const response = await fetch(`${this.config.baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(subscriptionData),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`PayPal subscription creation failed:`, error)
      throw new Error(`PayPal subscription creation failed: ${error}`)
    }

    const result = await response.json()
    console.log(`Subscription created successfully:`, result.id)
    return result
  }

  async createOrder(amount: string, description: string, userEmail: string): Promise<PayPalOrder> {
    const accessToken = await this.getAccessToken()

    console.log(`Creating PayPal order: $${amount} for ${description}`)

    const orderData = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: amount,
          },
          description: description,
        },
      ],
      payer: {
        email_address: userEmail,
      },
      application_context: {
        brand_name: "Code Homie",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/paypal/order/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
      },
    }

    const response = await fetch(`${this.config.baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(orderData),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`PayPal order creation failed:`, error)
      throw new Error(`PayPal order creation failed: ${error}`)
    }

    const result = await response.json()
    console.log(`Order created successfully:`, result.id)
    return result
  }

  async captureOrder(orderId: string): Promise<PayPalOrder> {
    const accessToken = await this.getAccessToken()

    console.log(`Capturing PayPal order: ${orderId}`)

    const response = await fetch(`${this.config.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`PayPal order capture failed:`, error)
      throw new Error(`PayPal order capture failed: ${error}`)
    }

    const result = await response.json()
    console.log(`Order captured successfully:`, result.id)
    return result
  }

  async getSubscription(subscriptionId: string): Promise<PayPalSubscription> {
    const accessToken = await this.getAccessToken()

    const response = await fetch(`${this.config.baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`PayPal subscription fetch failed: ${error}`)
    }

    return await response.json()
  }

  async cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
    const accessToken = await this.getAccessToken()

    const response = await fetch(`${this.config.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        reason: reason,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`PayPal subscription cancellation failed: ${error}`)
    }
  }

  // Advanced Card Payment - Create Order
  async createCardOrder(
    amount: string,
    description: string,
    cardDetails: {
      number: string
      expiry: string
      security_code: string
      name: string
    },
    billingAddress: {
      address_line_1: string
      address_line_2?: string
      admin_area_2: string // city
      admin_area_1: string // state
      postal_code: string
      country_code: string
    },
    userEmail: string,
    savePaymentMethod = false,
    customerId?: string,
  ): Promise<PayPalCardPayment> {
    const accessToken = await this.getAccessToken()

    console.log(`Creating card payment: $${amount} for ${description}`)

    const paymentData: any = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: amount,
          },
          description: description,
        },
      ],
      payment_source: {
        card: {
          number: cardDetails.number,
          expiry: cardDetails.expiry,
          security_code: cardDetails.security_code,
          name: cardDetails.name,
          billing_address: billingAddress,
        },
      },
      processing_instruction: "ORDER_COMPLETE_ON_PAYMENT_APPROVAL",
    }

    // Add vault instruction if saving payment method
    if (savePaymentMethod && customerId) {
      paymentData.payment_source.card.attributes = {
        vault: {
          store_in_vault: "ON_SUCCESS",
          usage: "MERCHANT",
          customer_type: "CONSUMER",
          permit_multiple_payment_tokens: false,
        },
        customer: {
          id: customerId,
        },
      }
    }

    const response = await fetch(`${this.config.baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "PayPal-Request-Id": `card-order-${Date.now()}`,
      },
      body: JSON.stringify(paymentData),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`PayPal card payment failed:`, error)
      throw new Error(`PayPal card payment failed: ${error}`)
    }

    const result = await response.json()
    console.log(`Card payment created successfully:`, result.id)
    return result
  }

  // Create Customer for Vault
  async createCustomer(userEmail: string, userId: string): Promise<{ id: string }> {
    const accessToken = await this.getAccessToken()

    const customerData = {
      merchant_customer_id: userId,
      email_address: userEmail,
    }

    const response = await fetch(`${this.config.baseUrl}/v2/customer/customers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(customerData),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`PayPal customer creation failed:`, error)
      throw new Error(`PayPal customer creation failed: ${error}`)
    }

    const result = await response.json()
    console.log(`Customer created successfully:`, result.id)
    return result
  }

  // Get Vaulted Payment Methods
  async getVaultedPaymentMethods(customerId: string): Promise<VaultedPaymentMethod[]> {
    const accessToken = await this.getAccessToken()

    const response = await fetch(`${this.config.baseUrl}/v2/customer/customers/${customerId}/payment-methods`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Failed to get vaulted payment methods:`, error)
      return []
    }

    const result = await response.json()
    return result.payment_methods || []
  }

  // Pay with Vaulted Payment Method
  async payWithVaultedMethod(
    vaultId: string,
    amount: string,
    description: string,
    customerId: string,
  ): Promise<PayPalCardPayment> {
    const accessToken = await this.getAccessToken()

    const paymentData = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: amount,
          },
          description: description,
        },
      ],
      payment_source: {
        vault: {
          id: vaultId,
          stored_credential: {
            payment_initiator: "CUSTOMER",
            payment_type: "UNSCHEDULED",
            usage: "SUBSEQUENT",
          },
        },
      },
      processing_instruction: "ORDER_COMPLETE_ON_PAYMENT_APPROVAL",
    }

    const response = await fetch(`${this.config.baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "PayPal-Request-Id": `vault-payment-${Date.now()}`,
      },
      body: JSON.stringify(paymentData),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Vaulted payment failed:`, error)
      throw new Error(`Vaulted payment failed: ${error}`)
    }

    const result = await response.json()
    console.log(`Vaulted payment successful:`, result.id)
    return result
  }

  // Delete Vaulted Payment Method
  async deleteVaultedPaymentMethod(vaultId: string): Promise<void> {
    const accessToken = await this.getAccessToken()

    const response = await fetch(`${this.config.baseUrl}/v2/customer/payment-methods/${vaultId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Failed to delete vaulted payment method:`, error)
      throw new Error(`Failed to delete vaulted payment method: ${error}`)
    }

    console.log(`Vaulted payment method deleted:`, vaultId)
  }
}

export const paypalService = new PayPalService()
