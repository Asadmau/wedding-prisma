import { NotFoundError } from '../../common/errors.ts';
import { prisma } from '../../db/prisma.ts';
export interface TemplateDto {id:string;key:string;name:string;description:string;previewImageUrl:string;accentColor:string;isActive:boolean;sortOrder:number;}
const mapTemplate=(r:any):TemplateDto=>({id:r.id,key:r.key,name:r.name,description:r.description,previewImageUrl:r.previewImageUrl,accentColor:r.accentColor,isActive:r.isActive,sortOrder:r.sortOrder});
export async function listTemplates():Promise<TemplateDto[]>{return (await prisma.template.findMany({where:{isActive:true},orderBy:[{sortOrder:'asc'},{name:'asc'}]})).map(mapTemplate);}
export async function getTemplateByIdOrKey(idOrKey:string):Promise<TemplateDto>{const row=await prisma.template.findFirst({where:{OR:[{id:idOrKey},{key:idOrKey}]}});if(!row)throw new NotFoundError('Template undangan tidak ditemukan');return mapTemplate(row);}
export async function activateTemplateForInvitation(invitationId:string,templateId:string):Promise<TemplateDto>{const template=await prisma.template.findFirst({where:{id:templateId,isActive:true}});if(!template)throw new NotFoundError('Template tidak ditemukan atau tidak aktif');await prisma.invitation.update({where:{id:invitationId},data:{templateId,updatedAt:new Date().toISOString()}});return mapTemplate(template);}
