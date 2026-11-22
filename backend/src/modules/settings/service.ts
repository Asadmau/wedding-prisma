import crypto from 'node:crypto';
import { z } from 'zod';
import { getSingleInvitationId } from '../../common/validators.ts';
import { prisma } from '../../db/prisma.ts';
export const settingsInputSchema=z.object({rsvpEnabled:z.boolean(),rsvpDeadline:z.string().trim().max(40).default(''),wishesEnabled:z.boolean(),wishesAutoApprove:z.boolean(),giftsEnabled:z.boolean(),musicEnabled:z.boolean(),galleryEnabled:z.boolean(),loveStoryEnabled:z.boolean(),whatsappTemplate:z.string().trim().max(2000).default(''),footerText:z.string().trim().max(300).default('')});
export type SettingsInput=z.infer<typeof settingsInputSchema>;
const mapSettings=(r:any)=>({id:r.id,invitationId:r.invitationId,rsvpEnabled:r.rsvpEnabled,rsvpDeadline:r.rsvpDeadline,wishesEnabled:r.wishesEnabled,wishesAutoApprove:r.wishesAutoApprove,giftsEnabled:r.giftsEnabled,musicEnabled:r.musicEnabled,galleryEnabled:r.galleryEnabled,loveStoryEnabled:r.loveStoryEnabled,whatsappTemplate:r.whatsappTemplate,footerText:r.footerText});
export async function getSettings(){const invitationId=await getSingleInvitationId();let row=await prisma.siteSetting.findUnique({where:{invitationId}});if(!row){const timestamp=new Date().toISOString();row=await prisma.siteSetting.create({data:{id:crypto.randomUUID(),invitationId,createdAt:timestamp,updatedAt:timestamp}});}return mapSettings(row);}
export async function updateSettings(input:SettingsInput){const invitationId=await getSingleInvitationId();const timestamp=new Date().toISOString();const row=await prisma.siteSetting.upsert({where:{invitationId},create:{id:crypto.randomUUID(),invitationId,...input,createdAt:timestamp,updatedAt:timestamp},update:{...input,updatedAt:timestamp}});return mapSettings(row);}
