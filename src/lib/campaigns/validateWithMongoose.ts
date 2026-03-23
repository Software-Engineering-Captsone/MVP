import mongoose from 'mongoose';
import Campaign from '@/models/Campaign';
import Application from '@/models/Application';

function validationError(err: mongoose.Error.ValidationError): string {
  return Object.values(err.errors)
    .map((e) => e.message)
    .join('; ');
}

export function validateCampaignInput(data: Record<string, unknown>): Record<string, unknown> {
  const doc = new Campaign(data as never);
  const err = doc.validateSync();
  if (err) {
    throw new Error(validationError(err));
  }
  return doc.toObject({ flattenMaps: true }) as Record<string, unknown>;
}

export function validateApplicationInput(data: Record<string, unknown>): Record<string, unknown> {
  const doc = new Application(data as never);
  const err = doc.validateSync();
  if (err) {
    throw new Error(validationError(err));
  }
  return doc.toObject({ flattenMaps: true }) as Record<string, unknown>;
}
