import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './backend/src/app.ts';
import { env } from './backend/src/config/env.ts';
import { prisma, disconnectPrisma } from './backend/src/db/prisma.ts';
import { seedDatabase } from './backend/src/db/seed.ts';

async function bootstrap() {
  await prisma.$connect();
  await seedDatabase();
  const app=createApiApp();
  if(!env.isProduction){const vite=await createViteServer({server:{middlewareMode:true,hmr:process.env.DISABLE_HMR!=='true'},appType:'spa'});app.use(vite.middlewares);}
  else {const distPath=path.resolve(process.cwd(),'dist');app.use(express.static(distPath));app.get('*',(_req,res)=>res.sendFile(path.resolve(distPath,'index.html')));}
  const server=app.listen(env.port,'0.0.0.0',()=>console.log(`Wedding Invitation System running on http://0.0.0.0:${env.port}`));
  const shutdown=async(signal:string)=>{console.log(`${signal} received; shutting down`);server.close(async()=>{await disconnectPrisma();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();};
  process.once('SIGTERM',()=>void shutdown('SIGTERM'));process.once('SIGINT',()=>void shutdown('SIGINT'));
}
bootstrap().catch(async(err)=>{console.error('Failed to start server:',err);await disconnectPrisma().catch(()=>undefined);process.exit(1);});
