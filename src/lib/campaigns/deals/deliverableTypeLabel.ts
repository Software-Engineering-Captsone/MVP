const DELIVERABLE_TYPE_LABELS: Record<string, string> = {
  instagram_post:   'Instagram Post',
  tiktok_video:     'TikTok Video',
  story:            'Story',
  appearance_event: 'Appearance Event',
  meetup:           'Meetup',
  keynote:          'Keynote',
  custom:           'Custom',
};

export function labelForDeliverableType(type: string): string {
  return DELIVERABLE_TYPE_LABELS[type] ?? 'Custom';
}
