import crypto from "node:crypto";
import {
  encryptValue,
  generateSecureToken,
  hashPassword,
  sha256,
} from "../common/crypto.ts";
import { env } from "../config/env.ts";
import { prisma } from "./prisma.ts";

const templates = [
  {
    id: "tpl-classic-elegant",
    key: "classic-elegant",
    name: "Classic Elegant",
    description:
      "Komposisi editorial bernuansa ivory hangat dan aksen emas antik, tipografi serif klasik, serta tata letak simetris yang abadi.",
    previewImageUrl:
      "/src/assets/images/wedding_hero_editorial_1795325195483.jpg",
    accentColor: "#9A7B4F",
    sortOrder: 1,
  },
  {
    id: "tpl-botanical-green",
    key: "botanical-green",
    name: "Botanical Green",
    description:
      "Nuansa konservatori taman hijau sage dan krem lembut dengan ilustrasi dedaunan organik serta ritme cerita yang intim.",
    previewImageUrl:
      "/src/assets/images/gallery_ceremony_floral_1795325195546.jpg",
    accentColor: "#4F6352",
    sortOrder: 2,
  },
  {
    id: "tpl-modern-minimalist",
    key: "modern-minimalist",
    name: "Modern Minimalist",
    description:
      "Estetika galeri Swiss kontemporer dengan ruang negatif luas, garis pembatas tipis, dan kontras tinta arang yang bersih.",
    previewImageUrl:
      "/src/assets/images/gallery_reception_table_1795325195798.jpg",
    accentColor: "#292524",
    sortOrder: 3,
  },
];

export async function seedDatabase(): Promise<void> {
  const timestamp = new Date().toISOString();
  for (const template of templates) {
    await prisma.template.upsert({
      where: { id: template.id },
      create: {
        ...template,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      // update: { ...template, updatedAt: timestamp },
      update: {},
    });
  }
  /*
  if (env.adminEmail && env.adminPassword) {
    const passwordHash = await hashPassword(env.adminPassword);
    const existing = await prisma.admin.findUnique({
      where: { email: env.adminEmail },
    });
    if (existing) {
      await prisma.admin.update({
        where: { id: existing.id },
        data: { passwordHash, isActive: true, updatedAt: timestamp },
      });
    } else {
      await prisma.admin.create({
        data: {
          id: crypto.randomUUID(),
          email: env.adminEmail,
          name: "Wedding Administrator",
          passwordHash,
          isActive: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });
    }
  }
    */
  if (env.adminEmail && env.adminPassword) {
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: env.adminEmail },
    });

    if (!existingAdmin) {
      const passwordHash = await hashPassword(env.adminPassword);

      await prisma.admin.create({
        data: {
          id: crypto.randomUUID(),
          email: env.adminEmail,
          name: "Wedding Administrator",
          passwordHash,
          isActive: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });
    }
  }
  // Data contoh hanya untuk development dan testing.
  if (env.isProduction) {
    return;
  }

  const invitationExists = await prisma.invitation.count();
  if (invitationExists) return;

  const invitationId = crypto.randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.invitation.create({
      data: {
        id: invitationId,
        title: "The Wedding of Andi & Siti",
        slug: "andi-siti",
        templateId: "tpl-classic-elegant",
        isPublished: true,
        heroSubtitle:
          "Dengan memohon rahmat dan ridho Tuhan Yang Maha Esa, kami mengundang Anda untuk menghadiri hari bahagia kami.",
        heroImageUrl:
          "/src/assets/images/wedding_hero_editorial_1795325195483.jpg",
        openingQuote:
          "Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup dari jenismu sendiri, supaya kamu merasa tenteram kepadanya.",
        openingQuoteAuthor: "QS. Ar-Rum : 21",
        seoTitle: "Undangan Pernikahan Andi Pratama & Siti Rahmawati",
        seoDescription:
          "Bergabunglah dalam perayaan sakral pernikahan Andi Pratama & Siti Rahmawati pada 12 Juni 2027 di Jakarta Selatan.",
        ogImageUrl:
          "/src/assets/images/wedding_hero_editorial_1795325195483.jpg",
        musicUrl: "",
        musicTitle: "Clair de Lune — Acoustic Strings",
        isMusicEnabled: true,
        primaryDate: "2027-06-12",
        countdownTarget: "2027-06-12T09:00:00+07:00",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });
    await tx.couple.create({
      data: {
        id: crypto.randomUUID(),
        invitationId,
        groomFullName: "Andi Pratama Wijaya, S.T.",
        groomNickName: "Andi",
        groomParents:
          "Putra pertama dari Bapak Hendra Wijaya & Ibu Ratna Kusuma",
        groomBio:
          "Arsitek lanskap yang mencintai kopi pagi, fotografi analog, dan perjalanan panjang menuju rumah.",
        groomInstagram: "@andipratama",
        groomPhotoUrl:
          "/src/assets/images/groom_portrait_editorial_1795325196311.jpg",
        brideFullName: "Siti Rahmawati Putri, M.Ds.",
        brideNickName: "Siti",
        brideParents: "Putri kedua dari Bapak Ahmad Fauzi & Ibu Nurhayati",
        brideBio:
          "Desainer editorial yang menemukan keindahan dalam detail kecil, bunga taman, dan percakapan hangat.",
        brideInstagram: "@sitirahmawati",
        bridePhotoUrl:
          "/src/assets/images/bride_portrait_editorial_1795325196020.jpg",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });
    await tx.event.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          invitationId,
          title: "Akad Nikah",
          category: "CEREMONY",
          eventDate: "2027-06-12",
          startTime: "09:00",
          endTime: "11:00",
          timezone: "WIB",
          venueName: "Glasshouse Conservatory — Plataran Kinandari",
          venueAddress: "Jl. Durian No. 26, Jagakarsa, Jakarta Selatan 12620",
          mapsUrl:
            "https://maps.google.com/?q=Plataran+Kinandari+Jakarta+Selatan",
          mapsEmbedUrl:
            "https://maps.google.com/maps?q=Plataran%20Kinandari%20Jakarta&t=&z=14&ie=UTF8&iwloc=&output=embed",
          dressCode: "Ivory, Cream & Sage Formal Attire",
          description:
            "Prosesi ijab kabul khidmat yang dihadiri oleh keluarga inti dan sahabat terdekat.",
          sortOrder: 1,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: crypto.randomUUID(),
          invitationId,
          title: "Resepsi Pernikahan",
          category: "RECEPTION",
          eventDate: "2027-06-12",
          startTime: "18:30",
          endTime: "21:30",
          timezone: "WIB",
          venueName: "Garden Courtyard — Plataran Kinandari",
          venueAddress: "Jl. Durian No. 26, Jagakarsa, Jakarta Selatan 12620",
          mapsUrl:
            "https://maps.google.com/?q=Plataran+Kinandari+Jakarta+Selatan",
          mapsEmbedUrl:
            "https://maps.google.com/maps?q=Plataran%20Kinandari%20Jakarta&t=&z=14&ie=UTF8&iwloc=&output=embed",
          dressCode: "Warm Earth Tone / Cocktail Formal",
          description:
            "Jamuan makan malam di taman terbuka di bawah cahaya lentera senja bersama seluruh kerabat.",
          sortOrder: 2,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    });
    await tx.loveStory.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          invitationId,
          title: "Pertemuan Pertama di Pameran Seni",
          periodLabel: "Bab 01",
          storyDate: "Oktober 2022",
          description:
            "Kami bertemu tanpa sengaja di sebuah ruang pameran arsitektur dan tipografi di Jakarta Pusat. Percakapan singkat mengenai buku desain berujung pada secangkir teh sore yang tak terlupakan.",
          imageUrl:
            "/src/assets/images/gallery_rings_details_1795325196520.jpg",
          sortOrder: 1,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: crypto.randomUUID(),
          invitationId,
          title: "Melangkah Bersama",
          periodLabel: "Bab 02",
          storyDate: "Agustus 2024",
          description:
            "Dua tahun penuh perjalanan, proyek kolaborasi, dan doa-doa yang saling menguatkan meyakinkan kami bahwa rumah bukanlah tempat, melainkan seseorang.",
          imageUrl:
            "/src/assets/images/gallery_ceremony_floral_1795325195546.jpg",
          sortOrder: 2,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: crypto.randomUUID(),
          invitationId,
          title: "Komitmen Menuju Pelaminan",
          periodLabel: "Bab 03",
          storyDate: "Desember 2026",
          description:
            "Di hadapan kedua keluarga besar, kami mengikat janji pertunangan dan bersiap memulai babak kehidupan baru yang penuh berkah bersama.",
          imageUrl:
            "/src/assets/images/gallery_reception_table_1795325195798.jpg",
          sortOrder: 3,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    });
    const gallery = [
      [
        "Golden Hour Walk",
        "Langkah awal menuju hari penuh syukur",
        "/src/assets/images/wedding_hero_editorial_1795325195483.jpg",
      ],
      [
        "Potret Mempelai Wanita",
        "Dalam balutan sutra gading dan mawar putih",
        "/src/assets/images/bride_portrait_editorial_1795325196020.jpg",
      ],
      [
        "Potret Mempelai Pria",
        "Menanti momen sakral dengan penuh ketenangan",
        "/src/assets/images/groom_portrait_editorial_1795325196311.jpg",
      ],
      [
        "Konservatori Akad",
        "Ruang kaca bercahaya tempat janji suci diucapkan",
        "/src/assets/images/gallery_ceremony_floral_1795325195546.jpg",
      ],
      [
        "Cincin & Detail Undangan",
        "Simbol ikatan abadi di atas kertas katun buatan tangan",
        "/src/assets/images/gallery_rings_details_1795325196520.jpg",
      ],
      [
        "Jamuan Taman Senja",
        "Meja perayaan hangat bersama sahabat dan keluarga",
        "/src/assets/images/gallery_reception_table_1795325195798.jpg",
      ],
    ];
    await tx.gallery.createMany({
      data: gallery.map((g, i) => ({
        id: crypto.randomUUID(),
        invitationId,
        title: g[0],
        caption: g[1],
        imageUrl: g[2],
        storageKey: "",
        mimeType: "image/jpeg",
        fileSize: 0,
        sortOrder: i + 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
    });
    await tx.giftAccount.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          invitationId,
          bankName: "Bank Central Asia (BCA)",
          accountNumber: "5480912345",
          accountHolder: "Andi Pratama Wijaya",
          qrImageUrl: "",
          notes: "Mohon sertakan nama Anda pada catatan transfer.",
          sortOrder: 1,
          isActive: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: crypto.randomUUID(),
          invitationId,
          bankName: "Bank Mandiri",
          accountNumber: "1270009876543",
          accountHolder: "Siti Rahmawati Putri",
          qrImageUrl: "",
          notes: "Terima kasih atas doa restu dan tanda kasih Anda.",
          sortOrder: 2,
          isActive: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    });
    await tx.siteSetting.create({
      data: {
        id: crypto.randomUUID(),
        invitationId,
        rsvpEnabled: true,
        rsvpDeadline: "2027-06-01",
        wishesEnabled: true,
        wishesAutoApprove: false,
        giftsEnabled: true,
        musicEnabled: true,
        galleryEnabled: true,
        loveStoryEnabled: true,
        whatsappTemplate:
          "Kepada Yth. {{guest_name}},\n\nDengan penuh rasa syukur, kami mengundang Anda untuk menghadiri pernikahan {{couple_names}}.\n\nBuka undangan personal Anda di:\n{{invite_url}}\n\nMerupakan kehormatan bagi kami apabila Anda berkenan hadir dan memberikan doa restu.",
        footerText:
          "Dibuat dengan cinta untuk pernikahan Andi & Siti · Jakarta, 12 Juni 2027",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });
    const sampleGuests = [
      {
        fullName: "Bapak Budi Santoso & Keluarga",
        phone: "6281234567801",
        email: "budi.santoso@example.com",
        groupName: "Keluarga Besar",
        maxGuests: 4,
        status: "ATTENDING",
        guestCount: 3,
        message: "InsyaAllah hadir bersama keluarga.",
      },
      {
        fullName: "Dr. Rina Kartika",
        phone: "6281234567802",
        email: "rina.kartika@example.com",
        groupName: "Rekan Kerja",
        maxGuests: 2,
        status: "ATTENDING",
        guestCount: 2,
        message: "Selamat menempuh hidup baru Andi & Siti!",
      },
      {
        fullName: "Dimas & Nadia",
        phone: "6281234567803",
        email: "dimas.nadia@example.com",
        groupName: "Sahabat Kuliah",
        maxGuests: 2,
        status: "PENDING",
        guestCount: 2,
        message: "",
      },
      {
        fullName: "Ibu Dewi Lestari",
        phone: "6281234567804",
        email: "dewi.lestari@example.com",
        groupName: "VIP",
        maxGuests: 2,
        status: "NOT_ATTENDING",
        guestCount: 0,
        message: "Mohon maaf belum dapat hadir karena tugas di luar kota.",
      },
      {
        fullName: "Fajar Ramadhan",
        phone: "6281234567805",
        email: "fajar.r@example.com",
        groupName: "Komunitas Desain",
        maxGuests: 2,
        status: "PENDING",
        guestCount: 1,
        message: "",
      },
    ];
    const seededGuestIds: string[] = [];
    for (const guest of sampleGuests) {
      const id = crypto.randomUUID();
      seededGuestIds.push(id);
      const rawToken = generateSecureToken(24);
      await tx.guest.create({
        data: {
          id,
          invitationId,
          fullName: guest.fullName,
          phone: guest.phone,
          email: guest.email,
          groupName: guest.groupName,
          maxGuests: guest.maxGuests,
          guestSlug: `${guest.fullName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")}-${crypto.randomBytes(8).toString("hex")}`,
          tokenHash: sha256(rawToken),
          tokenEncrypted: encryptValue(rawToken, env.sessionKey),
          notes: "",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });
      if (guest.status !== "PENDING")
        await tx.rsvp.create({
          data: {
            id: crypto.randomUUID(),
            invitationId,
            guestId: id,
            guestName: guest.fullName,
            guestPhone: guest.phone,
            attendanceStatus: guest.status,
            guestCount: guest.guestCount,
            message: guest.message,
            editTokenHash: "",
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        });
    }
    await tx.wish.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          invitationId,
          guestId: seededGuestIds[0],
          authorName: "Bapak Budi Santoso",
          relationLabel: "Keluarga Besar",
          message:
            "Barakallahu lakuma wa baraka alaikuma. Semoga menjadi keluarga yang sakinah, mawaddah, warahmah hingga akhir hayat.",
          status: "APPROVED",
          moderatedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: crypto.randomUUID(),
          invitationId,
          guestId: seededGuestIds[1],
          authorName: "Dr. Rina Kartika",
          relationLabel: "Rekan Studio",
          message:
            "Bahagia selalu Andi dan Siti! Semoga langkah baru ini selalu dipenuhi cinta, kesabaran, dan tawa hangat.",
          status: "APPROVED",
          moderatedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: crypto.randomUUID(),
          invitationId,
          guestId: seededGuestIds[2],
          authorName: "Dimas & Nadia",
          relationLabel: "Sahabat Kuliah",
          message:
            "Selamat memulai lembaran baru bersama! Tak sabar merayakan hari bahagia kalian di taman nanti.",
          status: "PENDING",
          moderatedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    });
  });
}
