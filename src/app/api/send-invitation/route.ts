import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  try {
    const { email, inviteCode } = await request.json()

    if (!email || !inviteCode) {
      return NextResponse.json(
        { error: 'Email and invite code are required' },
        { status: 400 }
      )
    }

    // Check if Resend API key is available
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.warn('RESEND_API_KEY not found - email sending disabled')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      )
    }

    const resend = new Resend(apiKey)

    const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/sign-up?invite=${inviteCode}`

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 30px 20px; text-align: center; border-radius: 8px; }
            .content { padding: 30px 20px; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎨 You're Invited to Artist Rentals!</h1>
            </div>
            
            <div class="content">
              <p>Hello!</p>
              
              <p>You've been invited to join our exclusive <strong>Artist Rentals</strong> community - a platform where artists share and discover rental spaces like studios, galleries, and creative workspaces.</p>
              
              <p>Our community is invite-only, bringing together artists who need spaces and those who have spaces to share.</p>
              
              <p style="text-align: center;">
                <a href="${inviteLink}" class="button">Join Artist Rentals</a>
              </p>
              
              <p><small>This invitation is specifically for: <strong>${email}</strong></small></p>
              
              <p>Welcome to the community!</p>
            </div>
            
            <div class="footer">
              <p>Artist Rentals - Connecting Artists with Creative Spaces</p>
              <p><small>If you didn't expect this invitation, you can safely ignore this email.</small></p>
            </div>
          </div>
        </body>
      </html>
    `

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'Artist Rentals <onboarding@resend.dev>',
      to: [email],
      subject: "You're invited to Artist Rentals 🎨",
      html: emailHtml,
    })

    if (error) {
      console.error('Email sending error:', error)
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: `Invitation email sent to ${email}`,
      emailId: data?.id 
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}