import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { findUserByResetToken, updateLocalUser } from '@/lib/auth/localUserRepository';

const resetSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { error, value } = resetSchema.validate(body);

    if (error) {
      return NextResponse.json({ error: error.details[0].message }, { status: 400 });
    }

    const { token, password } = value;

    const user = await findUserByResetToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await updateLocalUser(user._id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
