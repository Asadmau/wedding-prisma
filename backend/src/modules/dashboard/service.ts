import { getSingleInvitationId } from "../../common/validators.ts";
import { prisma } from "../../db/prisma.ts";
export async function getAdminDashboardStats() {
  const invitationId = await getSingleInvitationId();
  const [
    invitation,
    guestCount,
    rsvps,
    wishes,
    galleryCount,
    eventsCount,
    pendingGuests,
    recentRsvps,
    recentWishes,
  ] = await Promise.all([
    prisma.invitation.findUniqueOrThrow({
      where: { id: invitationId },
      include: { template: true },
    }),
    prisma.guest.count({ where: { invitationId } }),
    prisma.rsvp.findMany({
      where: { invitationId },
      select: { attendanceStatus: true, guestCount: true },
    }),
    prisma.wish.findMany({ where: { invitationId }, select: { status: true } }),
    prisma.gallery.count({ where: { invitationId } }),
    prisma.event.count({ where: { invitationId } }),
    prisma.guest.count({ where: { invitationId, rsvp: null } }),
    prisma.rsvp.findMany({
      where: { invitationId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        guestName: true,
        attendanceStatus: true,
        guestCount: true,
        updatedAt: true,
      },
    }),
    prisma.wish.findMany({
      where: { invitationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        authorName: true,
        message: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);
  const totalHeadcount = rsvps
    .filter((r) => r.attendanceStatus === "ATTENDING")
    .reduce((n, r) => n + r.guestCount, 0);
  return {
    invitation: {
      id: invitation.id,
      title: invitation.title,
      slug: invitation.slug,
      isPublished: invitation.isPublished,
      primaryDate: invitation.primaryDate,
      templateKey: invitation.template?.key || "classic-elegant",
      templateName: invitation.template?.name || "Classic Elegant",
    },
    metrics: {
      totalGuests: guestCount,
      totalRsvps: rsvps.length,
      attendingCount: rsvps.filter((r) => r.attendanceStatus === "ATTENDING")
        .length,
      notAttendingCount: rsvps.filter(
        (r) => r.attendanceStatus === "NOT_ATTENDING",
      ).length,
      pendingGuestRsvps: pendingGuests,
      totalHeadcount,
      totalWishes: wishes.length,
      pendingWishes: wishes.filter((w) => w.status === "PENDING").length,
      approvedWishes: wishes.filter((w) => w.status === "APPROVED").length,
      galleryCount,
      eventsCount,
    },
    recentRsvps: recentRsvps.map((r) => ({
      id: r.id,
      guestName: r.guestName,
      attendanceStatus: r.attendanceStatus,
      guestCount: r.guestCount,
      updatedAt: r.updatedAt,
    })),
    recentWishes: recentWishes.map((w) => ({
      id: w.id,
      authorName: w.authorName,
      message: w.message,
      status: w.status,
      createdAt: w.createdAt,
    })),
  };
}
