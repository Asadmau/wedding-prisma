import crypto from 'node:crypto';
import { z } from 'zod';
import { NotFoundError } from '../../common/errors.ts';
import { getSingleInvitationId, safeMediaUrlSchema } from '../../common/validators.ts';
import { prisma } from '../../db/prisma.ts';

export const eventInputSchema = z.object({
  title: z.string().trim().min(2, 'Judul acara minimal 2 karakter').max(100),
  category: z.enum(['CEREMONY', 'RECEPTION', 'OTHER']).default('CEREMONY'),
  eventDate: z.string().trim().min(4).max(40), startTime: z.string().trim().min(2).max(20),
  endTime: z.string().trim().max(20).default(''), timezone: z.string().trim().max(15).default('WIB'),
  venueName: z.string().trim().min(2, 'Nama lokasi wajib diisi').max(150),
  venueAddress: z.string().trim().min(5, 'Alamat lengkap wajib diisi').max(400),
  mapsUrl: safeMediaUrlSchema.default(''), mapsEmbedUrl: safeMediaUrlSchema.default(''),
  dressCode: z.string().trim().max(150).default(''), description: z.string().trim().max(500).default(''),
  sortOrder: z.coerce.number().int().min(0).max(100).default(0),
});
export type EventInput = z.infer<typeof eventInputSchema>;
const mapEvent = (r: any) => ({ id:r.id, invitationId:r.invitationId, title:r.title, category:r.category,
  eventDate:r.eventDate, startTime:r.startTime, endTime:r.endTime, timezone:r.timezone, venueName:r.venueName,
  venueAddress:r.venueAddress, mapsUrl:r.mapsUrl, mapsEmbedUrl:r.mapsEmbedUrl, dressCode:r.dressCode,
  description:r.description, sortOrder:r.sortOrder });
export async function listEvents() {
  const invitationId = await getSingleInvitationId();
  return (await prisma.event.findMany({ where:{invitationId}, orderBy:[{sortOrder:'asc'},{eventDate:'asc'}] })).map(mapEvent);
}
export async function createEvent(input: EventInput) {
  const invitationId = await getSingleInvitationId(); const timestamp = new Date().toISOString();
  return mapEvent(await prisma.event.create({ data:{ id:crypto.randomUUID(), invitationId, ...input, createdAt:timestamp, updatedAt:timestamp } }));
}
export async function updateEvent(id:string,input:EventInput) {
  const invitationId=await getSingleInvitationId();
  const result=await prisma.event.updateMany({where:{id,invitationId},data:{...input,updatedAt:new Date().toISOString()}});
  if (!result.count) throw new NotFoundError('Acara tidak ditemukan');
  return mapEvent(await prisma.event.findUniqueOrThrow({where:{id}}));
}
export async function deleteEvent(id:string) {
  const invitationId=await getSingleInvitationId(); const result=await prisma.event.deleteMany({where:{id,invitationId}});
  if (!result.count) throw new NotFoundError('Acara tidak ditemukan');
}
