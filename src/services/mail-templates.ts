export interface MailTemplateData {
  toName: string;
  projectName?: string;
  [key: string]: unknown;
}

export const mailTemplates = {
  /**
   * 1. Welcome / Onboarding Complete Email Template
   */
  getWelcomeEmail(data: MailTemplateData): string {
    const projectName = data.projectName || "WOOLF.INDIA";
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${projectName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f7f9fc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f7f9fc;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      border: 1px solid #edf2f7;
    }
    .header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      color: #f59e0b;
      letter-spacing: 0.2em;
      margin: 0 0 10px 0;
    }
    .header-subtitle {
      color: #94a3b8;
      font-size: 14px;
      margin: 0;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .content {
      padding: 40px 30px;
      color: #334155;
      line-height: 1.6;
    }
    .greeting {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .body-text {
      font-size: 16px;
      color: #475569;
      margin-bottom: 30px;
    }
    .cta-container {
      text-align: center;
      margin: 35px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #0f172a;
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 32px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 50px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
      transition: background-color 0.2s ease;
    }
    .features {
      background-color: #f8fafc;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 30px;
      border: 1px solid #f1f5f9;
    }
    .feature-item {
      display: flex;
      margin-bottom: 16px;
    }
    .feature-item:last-child {
      margin-bottom: 0;
    }
    .feature-icon {
      font-size: 20px;
      margin-right: 14px;
      margin-top: 2px;
    }
    .feature-text {
      font-size: 14px;
      color: #475569;
    }
    .feature-title {
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #edf2f7;
      font-size: 12px;
      color: #94a3b8;
    }
    .footer a {
      color: #475569;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <div class="logo">WOOLF.INDIA</div>
        <div class="header-subtitle">Premium Companions & Care</div>
      </div>
      
      <!-- Content -->
      <div class="content">
        <div class="greeting">Hi ${data.toName},</div>
        <p class="body-text">
          Thank you for completing your profile! Your account is now fully active, and you are ready to explore the premium companion and care services at WOOLF.INDIA.
        </p>
        
        <div class="features">
          <div class="feature-item">
            <span class="feature-icon">✨</span>
            <div class="feature-text">
              <div class="feature-title">Premium Companions Catalog</div>
              Find certified, vaccinated, and lovingly bred puppies, kittens, and birds ready to join your home.
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">❤️</span>
            <div class="feature-text">
              <div class="feature-title">Adoption Program</div>
              Browse our rescue pets looking for their forever homes. Adoption is completely free.
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🎒</span>
            <div class="feature-text">
              <div class="feature-title">Professional Training</div>
              Book customized training sessions led by verified behavioral specialists.
            </div>
          </div>
        </div>

        <div class="cta-container">
          <a href="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080'}/" class="cta-button">Explore the Marketplace</a>
        </div>

        <p class="body-text" style="margin-bottom: 0;">
          If you have any questions or need advice on pet care, feel free to reply to this email. Our support team is always here to help.
        </p>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>This is an automated message from WOOLF.INDIA. Please do not reply directly.</p>
        <p>© 2026 WOOLF.INDIA. All rights reserved.</p>
        <p>
          <a href="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080'}/about">About Us</a> • 
          <a href="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080'}/contact">Contact Support</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  },

  /**
   * 2. Order Confirmation / Receipt Email Template
   */
  getOrderReceiptEmail(data: {
    toName: string;
    orderId: string;
    items: Array<{ name: string; quantity: number; unitPrice: number; imageUrl?: string }>;
    total: number;
    shippingAddress: {
      address_line: string;
      city: string;
      postal_code: string;
      country: string;
    };
  }): string {
    const formattedTotal = Number(data.total).toFixed(2);
    const itemsHtml = data.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
          <div style="font-weight: 600; color: #0f172a;">${item.name}</div>
          <div style="font-size: 12px; color: #94a3b8;">Qty: ${item.quantity} @ ₹${Number(item.unitPrice).toFixed(2)}</div>
        </td>
        <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">
          ₹${(item.quantity * item.unitPrice).toFixed(2)}
        </td>
      </tr>
    `,
      )
      .join("");

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation #${data.orderId.slice(0, 8)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f7f9fc;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      width: 100%;
      background-color: #f7f9fc;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      border: 1px solid #edf2f7;
    }
    .header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      color: #f59e0b;
      letter-spacing: 0.2em;
      margin: 0 0 10px 0;
    }
    .header-subtitle {
      color: #94a3b8;
      font-size: 14px;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .content {
      padding: 40px 30px;
      color: #334155;
      line-height: 1.6;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 8px;
    }
    .order-id {
      font-size: 14px;
      color: #94a3b8;
      margin-bottom: 30px;
      font-weight: 500;
    }
    .receipt-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .total-row td {
      padding-top: 16px;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }
    .info-grid {
      background-color: #f8fafc;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 30px;
      border: 1px solid #f1f5f9;
      font-size: 14px;
    }
    .info-header {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 10px;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.05em;
    }
    .info-body {
      color: #475569;
    }
    .cta-container {
      text-align: center;
      margin: 35px 0 15px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #0f172a;
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 32px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 50px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
    }
    .footer {
      background-color: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #edf2f7;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <div class="logo">WOOLF.INDIA</div>
        <div class="header-subtitle">Order Confirmation</div>
      </div>
      
      <!-- Content -->
      <div class="content">
        <div class="title">Thank you for your order!</div>
        <div class="order-id">Order ID: #${data.orderId}</div>
        
        <p style="color: #475569; font-size: 15px; margin-bottom: 30px;">
          Hi ${data.toName}, your order has been received and is currently being processed. You can find your order receipt details and shipping destination below.
        </p>

        <!-- Receipt Table -->
        <table class="receipt-table">
          <thead>
            <tr>
              <th style="text-align: left; padding-bottom: 12px; border-bottom: 2px solid #edf2f7; font-size: 12px; color: #94a3b8; text-transform: uppercase;">Item Description</th>
              <th style="text-align: right; padding-bottom: 12px; border-bottom: 2px solid #edf2f7; font-size: 12px; color: #94a3b8; text-transform: uppercase;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr class="total-row">
              <td style="text-align: left; padding-top: 20px;">Total Paid</td>
              <td style="text-align: right; padding-top: 20px; color: #d97706; font-size: 20px;">₹${formattedTotal}</td>
            </tr>
          </tbody>
        </table>

        <!-- Shipping details -->
        <div class="info-grid">
          <div class="info-header">Shipping Address</div>
          <div class="info-body">
            <strong>${data.toName}</strong><br>
            ${data.shippingAddress.address_line}<br>
            ${data.shippingAddress.city}, ${data.shippingAddress.postal_code}<br>
            ${data.shippingAddress.country}
          </div>
        </div>

        <div class="cta-container">
          <a href="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080'}/dashboard" class="cta-button">Track Order Status</a>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>If you need to make changes to your delivery address, please contact us immediately.</p>
        <p>© 2026 WOOLF.INDIA. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  },

  /**
   * 3. Adoption Request Confirmation Email Template
   */
  getAdoptionRequestEmail(data: {
    toName: string;
    petName: string;
    petBreed: string;
    petType: string;
    petImageUrl: string;
    applicationId: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Adoption Application Received</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f7f9fc;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      width: 100%;
      background-color: #f7f9fc;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      border: 1px solid #edf2f7;
    }
    .header {
      background: linear-gradient(135deg, #065f46 0%, #064e3b 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 0.2em;
      margin: 0 0 10px 0;
    }
    .header-subtitle {
      color: #34d399;
      font-size: 14px;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .content {
      padding: 40px 30px;
      color: #334155;
      line-height: 1.6;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #064e3b;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .card {
      display: flex;
      background-color: #f0fdf4;
      border: 1px solid #dcfce7;
      border-radius: 20px;
      padding: 20px;
      margin-bottom: 30px;
      align-items: center;
    }
    .card-img {
      width: 100px;
      height: 100px;
      border-radius: 14px;
      object-fit: cover;
      margin-right: 20px;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .card-body {
      flex: 1;
    }
    .pet-name {
      font-size: 20px;
      font-weight: 700;
      color: #064e3b;
      margin: 0 0 4px 0;
    }
    .pet-meta {
      font-size: 14px;
      color: #047857;
      margin: 0;
    }
    .timeline {
      border-left: 2px solid #dcfce7;
      padding-left: 20px;
      margin-left: 10px;
      margin-bottom: 30px;
    }
    .timeline-item {
      position: relative;
      margin-bottom: 20px;
    }
    .timeline-item:last-child {
      margin-bottom: 0;
    }
    .timeline-badge {
      position: absolute;
      left: -27px;
      top: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: #34d399;
      border: 2px solid #ffffff;
    }
    .timeline-title {
      font-weight: 600;
      font-size: 14px;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .timeline-desc {
      font-size: 13px;
      color: #64748b;
    }
    .cta-container {
      text-align: center;
      margin: 35px 0 15px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #065f46;
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 32px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 50px;
      box-shadow: 0 4px 12px rgba(6, 95, 70, 0.15);
    }
    .footer {
      background-color: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #edf2f7;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <div class="logo">WOOLF.INDIA</div>
        <div class="header-subtitle">Adoption Application</div>
      </div>
      
      <!-- Content -->
      <div class="content">
        <div class="title">Adoption Request Received!</div>
        
        <p style="color: #475569; font-size: 15px; margin-bottom: 25px;">
          Hi ${data.toName}, thank you for your interest in adopting from WOOLF.INDIA! We have received your application, and our coordinators are reviewing it.
        </p>

        <!-- Pet Profile Card -->
        <div class="card">
          <img src="${data.petImageUrl}" alt="${data.petName}" class="card-img">
          <div class="card-body">
            <h4 class="pet-name">${data.petName}</h4>
            <p class="pet-meta">${data.petBreed} • ${data.petType}</p>
          </div>
        </div>

        <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em;">Next Steps in the Process</h3>
        
        <!-- Timeline -->
        <div class="timeline">
          <div class="timeline-item">
            <span class="timeline-badge"></span>
            <div class="timeline-title">Application Review</div>
            <div class="timeline-desc">Our team verifies your living arrangements and experience compatibility. (1-2 days)</div>
          </div>
          <div class="timeline-item">
            <span class="timeline-badge" style="background-color: #cbd5e1;"></span>
            <div class="timeline-title">Coordinators Interview</div>
            <div class="timeline-desc">A brief phone call to discuss care, veterinary access, and companion transitions.</div>
          </div>
          <div class="timeline-item">
            <span class="timeline-badge" style="background-color: #cbd5e1;"></span>
            <div class="timeline-title">Meet & Greet</div>
            <div class="timeline-desc">Schedule a session to meet ${data.petName} in person and complete the adoption transition.</div>
          </div>
        </div>

        <div class="cta-container">
          <a href="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080'}/dashboard" class="cta-button">Check Application Status</a>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>Application Reference: #${data.applicationId}</p>
        <p>© 2026 WOOLF.INDIA. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  },
};
