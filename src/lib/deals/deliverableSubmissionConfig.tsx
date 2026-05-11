'use client';

import type { ReactNode } from 'react';
import {
  Calendar,
  Cloud,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  MapPin,
  Shirt,
  UploadCloud,
  Video,
} from 'lucide-react';
import { formatIsoDate, type ApiDeliverable } from '@/lib/deals/dashboardDealsClient';

export type EvidenceOption = {
  id: string;
  label: string;
  helper: string;
  placeholder: string;
  icon: ReactNode;
};

export type DeliverableSubmissionConfig = {
  evidenceOptions: EvidenceOption[];
  briefItems: Array<{ label: string; icon: ReactNode }>;
  descriptionLabel: string;
  descriptionHelper: string;
  descriptionPlaceholder: string;
};

export function getDisplayInstructions(instructions: string): string | null {
  if (!instructions?.trim()) return null;
  if (instructions.startsWith('Campaign context (read-only):')) return null;
  return instructions;
}

export function evidenceOptionsForDeliverable(type: string): EvidenceOption[] {
  switch (type) {
    case 'appearance_event':
    case 'meetup':
    case 'keynote':
      return [
        {
          id: 'attendance_proof',
          label: 'Attendance proof',
          helper: 'Link to proof that you attended or completed the appearance.',
          placeholder: 'https://drive.google.com/... or https://photos.app.goo.gl/...',
          icon: <MapPin className="h-4 w-4" />,
        },
        {
          id: 'photo_proof',
          label: 'Photo proof',
          helper: 'Link to event photos, screenshots, or a shared folder.',
          placeholder: 'https://drive.google.com/folder/...',
          icon: <ImageIcon className="h-4 w-4" />,
        },
        {
          id: 'post_url',
          label: 'Post URL',
          helper: 'Optional public post or recap URL.',
          placeholder: 'https://www.instagram.com/p/...',
          icon: <LinkIcon className="h-4 w-4" />,
        },
      ];
    case 'tiktok_video':
      return [
        {
          id: 'post_url',
          label: 'TikTok URL',
          helper: 'Public TikTok link for the submitted video.',
          placeholder: 'https://www.tiktok.com/@user/video/...',
          icon: <LinkIcon className="h-4 w-4" />,
        },
        {
          id: 'video_proof',
          label: 'Video link',
          helper: 'Shared draft or proof video link.',
          placeholder: 'https://drive.google.com/file/...',
          icon: <Video className="h-4 w-4" />,
        },
        {
          id: 'cloud_link',
          label: 'Cloud link',
          helper: 'Folder with supporting proof, captions, or drafts.',
          placeholder: 'https://drive.google.com/folder/...',
          icon: <Cloud className="h-4 w-4" />,
        },
      ];
    case 'story':
      return [
        {
          id: 'photo_proof',
          label: 'Story proof',
          helper: 'Link to story screenshots or screen recording proof.',
          placeholder: 'https://drive.google.com/folder/...',
          icon: <ImageIcon className="h-4 w-4" />,
        },
        {
          id: 'post_url',
          label: 'Story URL',
          helper: 'Live story, highlight, or recap URL if available.',
          placeholder: 'https://www.instagram.com/stories/...',
          icon: <LinkIcon className="h-4 w-4" />,
        },
        {
          id: 'cloud_link',
          label: 'Cloud link',
          helper: 'Shared folder with screenshots and metadata.',
          placeholder: 'https://drive.google.com/folder/...',
          icon: <Cloud className="h-4 w-4" />,
        },
      ];
    case 'instagram_post':
      return [
        {
          id: 'post_url',
          label: 'Post URL',
          helper: 'Public Instagram post, reel, or feed mention URL.',
          placeholder: 'https://www.instagram.com/p/...',
          icon: <LinkIcon className="h-4 w-4" />,
        },
        {
          id: 'photo_proof',
          label: 'Screenshot link',
          helper: 'Shared screenshot proof if the post is not public yet.',
          placeholder: 'https://drive.google.com/file/...',
          icon: <ImageIcon className="h-4 w-4" />,
        },
        {
          id: 'cloud_link',
          label: 'Cloud link',
          helper: 'Folder with draft assets, captions, or proof.',
          placeholder: 'https://drive.google.com/folder/...',
          icon: <Cloud className="h-4 w-4" />,
        },
      ];
    default:
      return [
        {
          id: 'work_link',
          label: 'Work link',
          helper: 'Public or shared link to the completed work.',
          placeholder: 'https://...',
          icon: <LinkIcon className="h-4 w-4" />,
        },
        {
          id: 'cloud_link',
          label: 'Cloud link',
          helper: 'Shared folder with supporting material.',
          placeholder: 'https://drive.google.com/folder/...',
          icon: <Cloud className="h-4 w-4" />,
        },
        {
          id: 'photo_proof',
          label: 'Proof link',
          helper: 'Screenshot, document, or other proof link.',
          placeholder: 'https://...',
          icon: <UploadCloud className="h-4 w-4" />,
        },
      ];
  }
}

export function submissionConfigForDeliverable(deliverable: ApiDeliverable): DeliverableSubmissionConfig {
  const briefItems: Array<{ label: string; icon: ReactNode }> = [];
  if (deliverable.dueAt) briefItems.push({ label: `Due ${formatIsoDate(deliverable.dueAt)}`, icon: <Calendar className="h-4 w-4" /> });
  if (deliverable.publishRequired) briefItems.push({ label: 'Public post required', icon: <LinkIcon className="h-4 w-4" /> });
  if (deliverable.proofRequired) briefItems.push({ label: 'Proof required', icon: <UploadCloud className="h-4 w-4" /> });
  if (deliverable.disclosureRequired) briefItems.push({ label: 'Include disclosure', icon: <FileText className="h-4 w-4" /> });

  switch (deliverable.type) {
    case 'appearance_event':
    case 'meetup':
    case 'keynote':
      briefItems.push(
        { label: deliverable.type === 'keynote' ? 'Complete speaking session' : 'Arrive on-site', icon: <MapPin className="h-4 w-4" /> },
        { label: 'Capture proof of attendance', icon: <ImageIcon className="h-4 w-4" /> },
      );
      if (deliverable.type !== 'keynote') {
        briefItems.push({ label: 'Follow attire notes', icon: <Shirt className="h-4 w-4" /> });
      }
      return {
        evidenceOptions: evidenceOptionsForDeliverable(deliverable.type),
        briefItems,
        descriptionLabel: 'Describe what you completed',
        descriptionHelper: 'Summarize what you completed and what proof you included.',
        descriptionPlaceholder:
          'I attended the event, completed the agreed appearance, engaged with attendees, and included proof links for the brand to review.',
      };
    case 'tiktok_video':
      return {
        evidenceOptions: evidenceOptionsForDeliverable(deliverable.type),
        briefItems,
        descriptionLabel: 'Describe the video',
        descriptionHelper: 'Include hook, key message, CTA, caption notes, and any required hashtags.',
        descriptionPlaceholder:
          'I created a TikTok showing the product in my routine, included the required talking points, added the CTA in the caption, and used the required hashtags.',
      };
    case 'story':
      return {
        evidenceOptions: evidenceOptionsForDeliverable(deliverable.type),
        briefItems,
        descriptionLabel: 'Describe the story set',
        descriptionHelper: 'Include frame count, mention/tag placement, stickers, CTA, and proof details.',
        descriptionPlaceholder:
          'I posted the required story frames, tagged the brand, included the CTA sticker, and added screenshot proof for review.',
      };
    case 'instagram_post':
      return {
        evidenceOptions: evidenceOptionsForDeliverable(deliverable.type),
        briefItems,
        descriptionLabel: 'Describe the post',
        descriptionHelper: 'Include post format, caption points, tags, CTA, and proof details.',
        descriptionPlaceholder:
          'I created the Instagram post/reel, tagged the brand, included the required message and CTA, and added proof for review.',
      };
    default:
      return {
        evidenceOptions: evidenceOptionsForDeliverable(deliverable.type),
        briefItems,
        descriptionLabel: 'Describe what you completed',
        descriptionHelper: 'Include what was created, where the proof lives, and anything the brand should review.',
        descriptionPlaceholder: 'I completed the deliverable according to the brief and included the proof link for review.',
      };
  }
}
