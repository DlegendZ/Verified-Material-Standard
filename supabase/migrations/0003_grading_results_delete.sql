-- =============================================================================
-- Migrasi 0003: perbaiki cakupan trigger append-only pada grading_results
--
-- Masalah yang ditemukan saat menjalankan seed demo:
-- trigger `grading_results_immutable` di migrasi 0001 memblokir UPDATE *dan*
-- DELETE. Menghapus satu baris `batches` memicu cascade delete ke
-- `grading_results`, sehingga trigger ikut menyala dan seluruh penghapusan batch
-- gagal — termasuk penghapusan batch demo yang memang disengaja.
--
-- Yang sebenarnya diwajibkan SRD Bab 5.3 adalah hasil grading tidak boleh
-- DIUBAH (regrading membuat baris baru, tidak menimpa). Larangan DELETE untuk
-- pengguna biasa sudah ditangani RLS: tabel ini tidak punya policy DELETE sama
-- sekali, jadi peran factory/grader/admin tidak bisa menghapusnya. Hanya service
-- role yang bisa, dan itu dipakai skrip pemeliharaan seperti seed demo.
-- =============================================================================

drop trigger if exists grading_results_immutable on grading_results;

create trigger grading_results_immutable
before update on grading_results
for each row execute function block_mutation();
