import { NextRequest, NextResponse } from 'next/server';
import Joi from 'joi';
import {
  findUserByEmail,
  newVerificationToken,
  updateLocalUser,
} from '@/lib/auth/localUserRepository';
import { sendVerificationEmail } from '@/lib/email';

const resendSchema = Joi.object({
  email: Joi.string().email().required(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { error, value } = resendSchema.validate(body);

    if (error) {
      return NextResponse.json({ error: error.details[0].message }, { status: 400 });
    }

    const { email } = value;

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({
        message: 'If an account with that email exists, a verification link has been sent.',
      });
    }

    if (user.verified) {
      return NextResponse.json({ error: 'Email is already verified' }, { status: 400 });
    }

    const { token, expires } = newVerificationToken();

    await updateLocalUser(user._id, {
      verificationToken: token,
      verificationExpires: expires.toISOString(),
    });

    try {
      await sendVerificationEmail(email, token);
    } catch (emailError) {
      console.error('Email send error:', emailError);
      const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      console.info('[local auth] Verification link (email not configured):', `${base}/api/auth/verify?token=${token}`);
      return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Verification email sent.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
