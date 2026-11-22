import crypto from 'node:crypto';
import { z } from 'zod';
import { NotFoundError } from '../../common/errors.ts';
import { getSingleInvitationId, safeMediaUrlSchema } from '../../common/validators.ts';
import { prisma } from '../../db/prisma.ts';
export const giftInputSchema=z.object({bankName:z.string().trim().min(2).max(100),accountNumber:z.string().trim().min(4).max(60),accountHolder:z.string().trim().min(2).max(120),qrImageUrl:safeMediaUrlSchema.default(''),notes:z.string().trim().max(300).default(''),sortOrder:z.coerce.number().int().min(0).max(100).default(0),isActive:z.boolean().default(true)});
export type GiftInput=z.infer<typeof giftInputSchema>;
const mapGift=(r:any)=>({id:r.id,invitationId:r.invitationId,bankName:r.bankName,accountNumber:r.accountNumber,accountHolder:r.accountHolder,qrImageUrl:r.qrImageUrl,notes:r.notes,sortOrder:r.sortOrder,isActive:r.isActive});
export async function listGifts(){const invitationId=await getSingleInvitationId();return (await prisma.giftAccount.findMany({where:{invitationId},orderBy:[{sortOrder:'asc'},{createdAt:'asc'}]})).map(mapGift);}
export async function createGift(input:GiftInput){const invitationId=await getSingleInvitationId();const timestamp=new Date().toISOString();return mapGift(await prisma.giftAccount.create({data:{id:crypto.randomUUID(),invitationId,...input,createdAt:timestamp,updatedAt:timestamp}}));}
export async function updateGift(id:string,input:GiftInput){const invitationId=await getSingleInvitationId();const result=await prisma.giftAccount.updateMany({where:{id,invitationId},data:{...input,updatedAt:new Date().toISOString()}});if(!result.count)throw new NotFoundError('Rekening hadiah tidak ditemukan');return mapGift(await prisma.giftAccount.findUniqueOrThrow({where:{id}}));}
export async function deleteGift(id:string){const invitationId=await getSingleInvitationId();const result=await prisma.giftAccount.deleteMany({where:{id,invitationId}});if(!result.count)throw new NotFoundError('Rekening hadiah tidak ditemukan');}
