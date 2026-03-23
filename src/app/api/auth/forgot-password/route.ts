import { NextRequest, NextResponse } from 'next/server';
import Joi from 'joi';
import { findUserByEmail, newResetToken, updateLocalUser } from '@/lib/auth/localUserRepository';
import { sendPasswordResetEmail } from '@/lib/email';

const forgotSchema = Joi.object({
  email: Joi.string().email().required(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { error, value } = forgotSchema.validate(body);

    if (error) {
      return NextResponse.json({ error: error.details[0].message }, { status: 400 });
    }

    const { email } = value;

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    const { token, expires } = newResetToken();
    await updateLocalUser(user._id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires.toISOString(),
    });

    const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const resetUrl = `${base}/auth/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail(email, token);
    } catch (emailError) {
      console.error('Email send error:', emailError);
      console.info('[local auth] Password reset link (email not configured):', resetUrl);
    }

    return NextResponse.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
