import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import multer from "multer";
import { BadRequestError } from "../../common/errors.ts";
import {
  sendCreated,
  sendPaginated,
  sendSuccess,
} from "../../common/response.ts";
import { getSingleInvitationId } from "../../common/validators.ts";
import { prisma } from "../../db/prisma.ts";
import { requireAdminAuth } from "../../middlewares/authMiddleware.ts";
import { validateBody } from "../../middlewares/validate.ts";
import { storageService } from "../../storage/storageService.ts";
import { getAdminDashboardStats } from "../dashboard/service.ts";
import {
  createEvent,
  deleteEvent,
  eventInputSchema,
  listEvents,
  updateEvent,
} from "../events/service.ts";
import {
  addGalleryItem,
  deleteGalleryItem,
  galleryMetadataSchema,
  listGalleries,
} from "../galleries/service.ts";
import {
  createGift,
  deleteGift,
  giftInputSchema,
  listGifts,
  updateGift,
} from "../gifts/service.ts";
import {
  createGuest,
  deleteGuest,
  guestInputSchema,
  guestQuerySchema,
  listGuests,
  regenerateGuestToken,
  updateGuest,
} from "../guests/service.ts";
import {
  getAdminInvitationBundle,
  updateCouple,
  updateCouplePhoto,
  updateInvitation,
} from "../invitations/service.ts";
import {
  selectTemplateSchema,
  updateCoupleSchema,
  updateInvitationSchema,
} from "../invitations/validation.ts";
import {
  exportRsvpsCsv,
  getRsvpSummaryAndList,
  rsvpQuerySchema,
} from "../rsvp/service.ts";
import {
  getSettings,
  settingsInputSchema,
  updateSettings,
} from "../settings/service.ts";
import {
  createStory,
  deleteStory,
  listStories,
  storyInputSchema,
  updateStory,
} from "../stories/service.ts";
import {
  activateTemplateForInvitation,
  listTemplates,
} from "../templates/service.ts";
import {
  deleteWish,
  listAdminWishes,
  moderateWish,
  wishQuerySchema,
} from "../wishes/service.ts";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
export const adminRouter = Router();
adminRouter.use(requireAdminAuth);
adminRouter.get(
  "/dashboard",
  asyncHandler(async (_req, res) =>
    sendSuccess(res, await getAdminDashboardStats()),
  ),
);
adminRouter.get(
  "/invitation",
  asyncHandler(async (_req, res) =>
    sendSuccess(res, await getAdminInvitationBundle()),
  ),
);
adminRouter.put(
  "/invitation",
  validateBody(updateInvitationSchema),
  asyncHandler(async (req, res) =>
    sendSuccess(
      res,
      await updateInvitation(req.body),
      "Pengaturan undangan diperbarui",
    ),
  ),
);
adminRouter.put(
  "/couple",
  validateBody(updateCoupleSchema),
  asyncHandler(async (req, res) =>
    sendSuccess(
      res,
      await updateCouple(req.body),
      "Profil mempelai diperbarui",
    ),
  ),
);
adminRouter.post(
  "/couple/photo/:role",
  upload.single("image"),
  asyncHandler(async (req, res) => {
    const role = req.params.role;
    if (role !== "groom" && role !== "bride")
      throw new BadRequestError("Role foto harus groom atau bride");
    if (!req.file) throw new BadRequestError("File foto wajib diunggah");
    const stored = await storageService.saveImage(req.file);
    try {
      return sendSuccess(
        res,
        await updateCouplePhoto(role, stored.publicUrl),
        "Foto mempelai berhasil diunggah",
      );
    } catch (error) {
      await storageService
        .deleteImage(stored.storageKey)
        .catch(() => undefined);
      throw error;
    }
  }),
);
adminRouter.post(
  "/upload",
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new BadRequestError("File gambar wajib diunggah");
    return sendCreated(
      res,
      await storageService.saveImage(req.file),
      "Gambar berhasil diunggah",
    );
  }),
);
adminRouter.get(
  "/templates",
  asyncHandler(async (_req, res) => {
    const bundle = await getAdminInvitationBundle();
    return sendSuccess(res, {
      activeTemplateId: bundle.invitation.templateId,
      templates: await listTemplates(),
    });
  }),
);
adminRouter.put(
  "/templates/active",
  validateBody(selectTemplateSchema),
  asyncHandler(async (req, res) => {
    const invId = await getSingleInvitationId();
    const template = await activateTemplateForInvitation(
      invId,
      req.body.templateId,
    );
    return sendSuccess(
      res,
      template,
      `Template "${template.name}" berhasil diaktifkan`,
    );
  }),
);
adminRouter.get(
  "/events",
  asyncHandler(async (_req, res) => sendSuccess(res, await listEvents())),
);
adminRouter.post(
  "/events",
  validateBody(eventInputSchema),
  asyncHandler(async (req, res) =>
    sendCreated(res, await createEvent(req.body), "Acara berhasil ditambahkan"),
  ),
);
adminRouter.put(
  "/events/:id",
  validateBody(eventInputSchema),
  asyncHandler(async (req, res) =>
    sendSuccess(
      res,
      await updateEvent(String(req.params.id), req.body),
      "Acara diperbarui",
    ),
  ),
);
adminRouter.delete(
  "/events/:id",
  asyncHandler(async (req, res) => {
    await deleteEvent(String(req.params.id));
    return sendSuccess(res, { deleted: true }, "Acara dihapus");
  }),
);
adminRouter.get(
  "/stories",
  asyncHandler(async (_req, res) => sendSuccess(res, await listStories())),
);
adminRouter.post(
  "/stories",
  validateBody(storyInputSchema),
  asyncHandler(async (req, res) =>
    sendCreated(res, await createStory(req.body), "Cerita cinta ditambahkan"),
  ),
);
adminRouter.put(
  "/stories/:id",
  validateBody(storyInputSchema),
  asyncHandler(async (req, res) =>
    sendSuccess(
      res,
      await updateStory(String(req.params.id), req.body),
      "Cerita cinta diperbarui",
    ),
  ),
);
adminRouter.delete(
  "/stories/:id",
  asyncHandler(async (req, res) => {
    await deleteStory(String(req.params.id));
    return sendSuccess(res, { deleted: true }, "Cerita cinta dihapus");
  }),
);
adminRouter.get(
  "/gallery",
  asyncHandler(async (_req, res) => sendSuccess(res, await listGalleries())),
);
adminRouter.post(
  "/gallery",
  upload.single("image"),
  asyncHandler(async (req, res) => {
    const parsed = galleryMetadataSchema.parse(req.body);
    return sendCreated(
      res,
      await addGalleryItem(parsed, req.file),
      "Foto galeri berhasil ditambahkan",
    );
  }),
);
adminRouter.delete(
  "/gallery/:id",
  asyncHandler(async (req, res) => {
    await deleteGalleryItem(String(req.params.id));
    return sendSuccess(res, { deleted: true }, "Foto galeri dihapus");
  }),
);
adminRouter.get(
  "/guests",
  asyncHandler(async (req, res) => {
    const result = await listGuests(guestQuerySchema.parse(req.query));
    return sendPaginated(res, result.items, result.meta);
  }),
);
adminRouter.post(
  "/guests",
  validateBody(guestInputSchema),
  asyncHandler(async (req, res) =>
    sendCreated(res, await createGuest(req.body), "Tamu berhasil ditambahkan"),
  ),
);
adminRouter.put(
  "/guests/:id",
  validateBody(guestInputSchema),
  asyncHandler(async (req, res) =>
    sendSuccess(
      res,
      await updateGuest(String(req.params.id), req.body),
      "Data tamu diperbarui",
    ),
  ),
);
adminRouter.post(
  "/guests/:id/regenerate-token",
  asyncHandler(async (req, res) =>
    sendSuccess(
      res,
      await regenerateGuestToken(String(req.params.id)),
      "Tautan undangan personal berhasil diperbarui",
    ),
  ),
);
adminRouter.delete(
  "/guests/:id",
  asyncHandler(async (req, res) => {
    await deleteGuest(String(req.params.id));
    return sendSuccess(res, { deleted: true }, "Tamu dihapus");
  }),
);
adminRouter.get(
  "/rsvps",
  asyncHandler(async (req, res) =>
    sendSuccess(
      res,
      await getRsvpSummaryAndList(rsvpQuerySchema.parse(req.query)),
    ),
  ),
);
adminRouter.get(
  "/rsvps/export",
  asyncHandler(async (_req, res) => {
    const csv = await exportRsvpsCsv();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="wedding-rsvps.csv"',
    );
    return res.status(200).send(csv);
  }),
);
adminRouter.get(
  "/wishes",
  asyncHandler(async (req, res) =>
    sendSuccess(res, await listAdminWishes(wishQuerySchema.parse(req.query))),
  ),
);
adminRouter.patch(
  "/wishes/:id/approve",
  asyncHandler(async (req, res) =>
    sendSuccess(
      res,
      await moderateWish(String(req.params.id), "APPROVED"),
      "Ucapan disetujui",
    ),
  ),
);
adminRouter.patch(
  "/wishes/:id/reject",
  asyncHandler(async (req, res) =>
    sendSuccess(
      res,
      await moderateWish(String(req.params.id), "REJECTED"),
      "Ucapan ditolak",
    ),
  ),
);
adminRouter.delete(
  "/wishes/:id",
  asyncHandler(async (req, res) => {
    await deleteWish(String(req.params.id));
    return sendSuccess(res, { deleted: true }, "Ucapan dihapus");
  }),
);
adminRouter.get(
  "/gifts",
  asyncHandler(async (_req, res) => sendSuccess(res, await listGifts())),
);
adminRouter.post(
  "/gifts",
  validateBody(giftInputSchema),
  asyncHandler(async (req, res) =>
    sendCreated(res, await createGift(req.body), "Rekening hadiah ditambahkan"),
  ),
);
adminRouter.put(
  "/gifts/:id",
  validateBody(giftInputSchema),
  asyncHandler(async (req, res) =>
    sendSuccess(
      res,
      await updateGift(String(req.params.id), req.body),
      "Rekening hadiah diperbarui",
    ),
  ),
);
adminRouter.delete(
  "/gifts/:id",
  asyncHandler(async (req, res) => {
    await deleteGift(String(req.params.id));
    return sendSuccess(res, { deleted: true }, "Rekening hadiah dihapus");
  }),
);
adminRouter.get(
  "/settings",
  asyncHandler(async (_req, res) => sendSuccess(res, await getSettings())),
);
adminRouter.put(
  "/settings",
  validateBody(settingsInputSchema),
  asyncHandler(async (req, res) =>
    sendSuccess(
      res,
      await updateSettings(req.body),
      "Pengaturan situs diperbarui",
    ),
  ),
);
