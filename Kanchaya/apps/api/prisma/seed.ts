import "dotenv/config";
import { Client } from "pg";
import argon2 from "argon2";
import { randomUUID } from "node:crypto";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL no está definido");
}

const roles = [
  {
    name: "PLAYER",
    description: "Usuario que reserva y utiliza canchas deportivas",
    email: "player@kanchaya.test",
    firstName: "Player",
    lastName: "Test",
  },
  {
    name: "VENUE_MANAGER",
    description: "Administrador de un centro deportivo",
    email: "venue.manager@kanchaya.test",
    firstName: "Venue",
    lastName: "Manager",
  },
  {
    name: "TOURNAMENT_ORGANIZER",
    description: "Usuario que organiza torneos deportivos",
    email: "tournament.organizer@kanchaya.test",
    firstName: "Tournament",
    lastName: "Organizer",
  },
  {
    name: "PLATFORM_ADMIN",
    description: "Administrador de la plataforma KanchaYa",
    email: "platform.admin@kanchaya.test",
    firstName: "Platform",
    lastName: "Admin",
  },
];

const TEST_PASSWORD = "KanchaYa123!";

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });

  await client.connect();

  try {
    await client.query("BEGIN");

    const passwordHash = await argon2.hash(TEST_PASSWORD);

    for (const roleData of roles) {
      const roleResult = await client.query(
        `
        INSERT INTO "role" ("id", "name", "description", "createdAt")
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT ("name")
        DO UPDATE SET "description" = EXCLUDED."description"
        RETURNING "id"
        `,
        [randomUUID(), roleData.name, roleData.description],
      );

      const roleId = roleResult.rows[0].id;

      const userResult = await client.query(
        `
        INSERT INTO "user"
          ("id", "email", "passwordHash", "status", "createdAt", "updatedAt")
        VALUES
          ($1, $2, $3, 'ACTIVE', NOW(), NOW())
        ON CONFLICT ("email")
        DO UPDATE SET
          "passwordHash" = EXCLUDED."passwordHash",
          "status" = 'ACTIVE',
          "updatedAt" = NOW()
        RETURNING "id"
        `,
        [randomUUID(), roleData.email, passwordHash],
      );

      const userId = userResult.rows[0].id;

      await client.query(
        `
        INSERT INTO "userRole" ("id", "userId", "roleId", "createdAt")
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT ("userId", "roleId") DO NOTHING
        `,
        [randomUUID(), userId, roleId],
      );

      await client.query(
        `
        INSERT INTO "profile"
          ("id", "userId", "firstName", "lastName", "displayName", "createdAt", "updatedAt")
        VALUES
          ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT ("userId")
        DO UPDATE SET
          "firstName" = EXCLUDED."firstName",
          "lastName" = EXCLUDED."lastName",
          "displayName" = EXCLUDED."displayName",
          "updatedAt" = NOW()
        `,
        [
          randomUUID(),
          userId,
          roleData.firstName,
          roleData.lastName,
          roleData.name,
        ],
      );
    }

    await client.query("COMMIT");

    console.log("Seed completado correctamente.");
    console.log("Roles creados/verificados: 4");
    console.log("Usuarios creados/verificados: 4");
    console.log("Asignaciones de rol creadas/verificadas: 4");
    console.log(`Contraseña de prueba: ${TEST_PASSWORD}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Error ejecutando seed:", error);
  process.exit(1);
});
