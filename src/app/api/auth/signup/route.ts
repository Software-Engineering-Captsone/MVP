import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { sendVerificationEmail } from '@/lib/email';

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('athlete', 'brand').required(),
  name: Joi.string().required(),
});

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { error, value } = signupSchema.validate(body);

    if (error) {
      return NextResponse.json({ error: error.details[0].message }, { status: 400 });
    }

    const { email, password, role, name } = value;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      email,
      password: hashedPassword,
      role,
      name,
      verificationToken,
      verificationExpires,
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (emailError) {
      console.error('Email send error:', emailError);
      // Don't fail signup if email fails
    }

    return NextResponse.json({ message: 'User created successfully. Pending for Approval.', userId: user._id }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}