// Hash kata sandi — bcryptjs cost 12 (docs/SDD-Backend-Foundation.md §8.1).

const bcrypt = require('bcryptjs');

const COST = 12;

// Hash boneka valid (bukan hash sandi siapa pun) — dipakai supaya
// bcrypt.compare tetap dijalankan walau akun tidak ditemukan, sehingga waktu
// respons tidak membocorkan akun mana yang ada (§5.4, §8.2).
const HASH_BONEKA = bcrypt.hashSync('sandi-boneka-tidak-pernah-dipakai', COST);

async function hashKataSandi(kataSandi) {
  return bcrypt.hash(kataSandi, COST);
}

async function cocokKataSandi(kataSandi, hash) {
  return bcrypt.compare(kataSandi, hash || HASH_BONEKA);
}

module.exports = { hashKataSandi, cocokKataSandi, HASH_BONEKA };
