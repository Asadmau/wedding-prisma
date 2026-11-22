import crypto from 'node:crypto';
import { z } from 'zod';
import { BadRequestError, NotFoundError } from '../../common/errors.ts';
import { getSingleInvitationId, safeMediaUrlSchema } from '../../common/validators.ts';
import { prisma } from '../../db/prisma.ts';
import { storageService } from '../../storage/storageService.ts';
export const galleryMetadataSchema=z.object({title:z.string().trim().min(1).max(120),caption:z.string().trim().max(300).default(''),imageUrl:safeMediaUrlSchema.optional(),sortOrder:z.coerce.number().int().min(0).max(500).default(0)});
const mapGallery=(r:any)=>({id:r.id,invitationId:r.invitationId,title:r.title,caption:r.caption,imageUrl:r.imageUrl,mimeType:r.mimeType,fileSize:r.fileSize,sortOrder:r.sortOrder,createdAt:r.createdAt});
export async function listGalleries(){const invitationId=await getSingleInvitationId();return (await prisma.gallery.findMany({where:{invitationId},orderBy:[{sortOrder:'asc'},{createdAt:'desc'}]})).map(mapGallery);}
export async function addGalleryItem(input:z.infer<typeof galleryMetadataSchema>,file?:{buffer:Buffer;mimetype:string;size:number}){
 const invitationId=await getSingleInvitationId();let imageUrl=input.imageUrl||'',storageKey='',mimeType='image/jpeg',fileSize=0;
 if(file){const stored=await storageService.saveImage(file);imageUrl=stored.publicUrl;storageKey=stored.storageKey;mimeType=stored.mimeType;fileSize=stored.fileSize;}else if(!imageUrl)throw new BadRequestError('File gambar atau URL gambar wajib diisi');
 const timestamp=new Date().toISOString();try{return mapGallery(await prisma.gallery.create({data:{id:crypto.randomUUID(),invitationId,title:input.title,caption:input.caption,imageUrl,storageKey,mimeType,fileSize,sortOrder:input.sortOrder,createdAt:timestamp,updatedAt:timestamp}}));}catch(error){if(storageKey)await storageService.deleteImage(storageKey).catch(()=>undefined);throw error;}
}
export async function deleteGalleryItem(id:string){const invitationId=await getSingleInvitationId();const row=await prisma.gallery.findFirst({where:{id,invitationId},select:{id:true,storageKey:true}});if(!row)throw new NotFoundError('Foto galeri tidak ditemukan');await prisma.gallery.delete({where:{id}});if(row.storageKey)await storageService.deleteImage(row.storageKey);}
