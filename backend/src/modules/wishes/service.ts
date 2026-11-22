import crypto from 'node:crypto';
import { z } from 'zod';
import { sha256 } from '../../common/crypto.ts';
import { ForbiddenError, NotFoundError } from '../../common/errors.ts';
import { getSingleInvitationId, paginationQuerySchema } from '../../common/validators.ts';
import { prisma } from '../../db/prisma.ts';
export const publicWishSchema=z.object({slug:z.string().trim().min(1),guestToken:z.string().trim().max(200).optional(),guestSlug:z.string().trim().max(100).optional(),authorName:z.string().trim().min(2).max(100),relationLabel:z.string().trim().max(80).default(''),message:z.string().trim().min(3).max(800)});
export const wishQuerySchema=paginationQuerySchema.extend({status:z.enum(['ALL','PENDING','APPROVED','REJECTED']).default('ALL')});
const mapWish=(r:any)=>({id:r.id,invitationId:r.invitationId,guestId:r.guestId,authorName:r.authorName,relationLabel:r.relationLabel,message:r.message,status:r.status,moderatedAt:r.moderatedAt,createdAt:r.createdAt});
export async function submitPublicWish(input:z.infer<typeof publicWishSchema>){
 const invitation=await prisma.invitation.findFirst({where:{slug:input.slug,isPublished:true}});if(!invitation)throw new NotFoundError('Undangan tidak ditemukan');
 const settings=await prisma.siteSetting.findUnique({where:{invitationId:invitation.id}});if(settings&&!settings.wishesEnabled)throw new ForbiddenError('Kolom ucapan saat ini sedang dinonaktifkan');
 let guestId:string|null=null;let authorName=input.authorName;
 if(input.guestSlug||input.guestToken){const guest=await prisma.guest.findFirst({where:{invitationId:invitation.id,...(input.guestSlug?{guestSlug:input.guestSlug}:{tokenHash:sha256(input.guestToken!)})},select:{id:true,fullName:true}});if(!guest)throw new ForbiddenError('Tautan undangan personal tidak valid');guestId=guest.id;authorName=input.authorName||guest.fullName;}
 const status=settings?.wishesAutoApprove?'APPROVED':'PENDING';const timestamp=new Date().toISOString();const row=await prisma.wish.create({data:{id:crypto.randomUUID(),invitationId:invitation.id,guestId,authorName,relationLabel:input.relationLabel,message:input.message,status,moderatedAt:status==='APPROVED'?timestamp:null,createdAt:timestamp,updatedAt:timestamp}});
 return {id:row.id,authorName:row.authorName,relationLabel:row.relationLabel,message:row.message,status:row.status,createdAt:row.createdAt};
}
export async function listAdminWishes(query:z.infer<typeof wishQuerySchema>){const invitationId=await getSingleInvitationId();const where:any={invitationId,...(query.status!=='ALL'?{status:query.status}:{}),...(query.search?{OR:[{authorName:{contains:query.search,mode:'insensitive'}},{message:{contains:query.search,mode:'insensitive'}}]}:{})};const [all,pending,approved,rejected,total,rows]=await Promise.all([prisma.wish.count({where:{invitationId}}),prisma.wish.count({where:{invitationId,status:'PENDING'}}),prisma.wish.count({where:{invitationId,status:'APPROVED'}}),prisma.wish.count({where:{invitationId,status:'REJECTED'}}),prisma.wish.count({where}),prisma.wish.findMany({where,orderBy:{createdAt:'desc'},skip:(query.page-1)*query.limit,take:query.limit})]);return {counts:{all,pending,approved,rejected},items:rows.map(mapWish),meta:{page:query.page,limit:query.limit,total,totalPages:Math.max(1,Math.ceil(total/query.limit))}};}
export async function moderateWish(id:string,status:'APPROVED'|'REJECTED'){const invitationId=await getSingleInvitationId();const result=await prisma.wish.updateMany({where:{id,invitationId},data:{status,moderatedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}});if(!result.count)throw new NotFoundError('Ucapan tidak ditemukan');return mapWish(await prisma.wish.findUniqueOrThrow({where:{id}}));}
export async function deleteWish(id:string){const invitationId=await getSingleInvitationId();const result=await prisma.wish.deleteMany({where:{id,invitationId}});if(!result.count)throw new NotFoundError('Ucapan tidak ditemukan');}
