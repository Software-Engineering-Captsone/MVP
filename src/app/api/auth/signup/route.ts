import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { createLocalUser } from '@/lib/auth/localUserRepository';

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('athlete', 'brand').required(),
  name: Joi.string().required(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { error, value } = signupSchema.validate(body);

    if (error) {
      return NextResponse.json({ error: error.details[0].message }, { status: 400 });
    }

    const { email, password, role, name } = value;

    const hashedPassword = await bcrypt.hash(password, 12);

    try {
      const user = await createLocalUser({
        email,
        passwordHash: hashedPassword,
        role,
        name,
        verified: true,
      });

      return NextResponse.json(
        {
          message: 'Account created. You can sign in now.',
          userId: user._id,
        },
        { status: 201 }
      );
    } catch (e) {
      if (e instanceof Error && e.message === 'User already exists') {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }
      throw e;
    }
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
