import crypto from 'node:crypto';
import { z } from 'zod';
import { NotFoundError } from '../../common/errors.ts';
import { getSingleInvitationId, safeMediaUrlSchema } from '../../common/validators.ts';
import { prisma } from '../../db/prisma.ts';
export const storyInputSchema=z.object({title:z.string().trim().min(2).max(120),periodLabel:z.string().trim().min(1).max(50),storyDate:z.string().trim().max(50).default(''),description:z.string().trim().min(5).max(1000),imageUrl:safeMediaUrlSchema.default(''),sortOrder:z.coerce.number().int().min(0).max(100).default(0)});
export type StoryInput=z.infer<typeof storyInputSchema>;
const mapStory=(r:any)=>({id:r.id,invitationId:r.invitationId,title:r.title,periodLabel:r.periodLabel,storyDate:r.storyDate,description:r.description,imageUrl:r.imageUrl,sortOrder:r.sortOrder});
export async function listStories(){const invitationId=await getSingleInvitationId();return (await prisma.loveStory.findMany({where:{invitationId},orderBy:[{sortOrder:'asc'},{createdAt:'asc'}]})).map(mapStory);}
export async function createStory(input:StoryInput){const timestamp=new Date().toISOString();const invitationId=await getSingleInvitationId();return mapStory(await prisma.loveStory.create({data:{id:crypto.randomUUID(),invitationId,...input,createdAt:timestamp,updatedAt:timestamp}}));}
export async function updateStory(id:string,input:StoryInput){const invitationId=await getSingleInvitationId();const result=await prisma.loveStory.updateMany({where:{id,invitationId},data:{...input,updatedAt:new Date().toISOString()}});if(!result.count)throw new NotFoundError('Cerita cinta tidak ditemukan');return mapStory(await prisma.loveStory.findUniqueOrThrow({where:{id}}));}
export async function deleteStory(id:string){const invitationId=await getSingleInvitationId();const result=await prisma.loveStory.deleteMany({where:{id,invitationId}});if(!result.count)throw new NotFoundError('Cerita cinta tidak ditemukan');}
