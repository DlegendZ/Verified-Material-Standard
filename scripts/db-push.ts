/**
 * Menjalankan migrasi SQL dan seed referensi ke database yang ditunjuk
 * `SUPABASE_DB_URL`.
 *
 * Ini perintah MANUAL yang dijalankan manusia dari mesinnya sendiri
 * (SRD Bab 12.2), bukan hook yang ikut jalan saat deploy. Tidak ada urusan
 * dengan pipeline apa pun.
 *
 * Jalankan seluruhnya:      npm run db:push
 * Jalankan sebagian saja:    npm run db:push -- supabase/seed.sql
 *
 * Berguna saat skema sudah terpasang lewat SQL Editor dan tinggal seed-nya yang
 * perlu dijalankan.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const DEFAULT_FILES = [
  "supabase/migrations/0001_init.sql",
  "supabase/migrations/0002_rls.sql",
  "supabase/migrations/0003_grading_results_delete.sql",
  "supabase/seed.sql",
];

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error(
      "SUPABASE_DB_URL belum diisi di .env.local. Ambil connection string Postgres dari " +
        "Supabase (Project Settings → Database → Connection string → URI).",
    );
  }

  const client = new Client({
    connectionString,
    ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  const argFiles = process.argv.slice(2).filter((arg) => arg.endsWith(".sql"));
  const files = argFiles.length > 0 ? argFiles : DEFAULT_FILES;

  await client.connect();
  console.log("Terhubung ke database.");

  try {
    for (const file of files) {
      const sql = readFileSync(join(process.cwd(), file), "utf8");
      process.stdout.write(`  menjalankan ${file} … `);
      await client.query(sql);
      console.log("selesai");
    }
    console.log("\nSkema dan data referensi siap. Lanjutkan dengan: npm run seed:demo");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("\nGagal:", error instanceof Error ? error.message : error);
  process.exit(1);
});
