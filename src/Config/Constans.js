import { DateTime } from "luxon";
import moment from "moment-timezone";
import axios from "axios";

export const image_url = "http://localhost:8080/image";

const time = moment.tz("Asia/Jakarta");
const isoString = time.format(); // Format dengan zona waktu yang benar (termasuk +07:00)

let date = DateTime.fromISO(isoString);
date = date.setZone("Asia/Jakarta");

// export const formattedHour = date.toJSDate();

// export const newDateIndonesia = date;
export let formattedHour;
export let newDateIndonesia;

const fetchTimeZoneDB = async (apiKey, retries = 2) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get("http://api.timezonedb.com/v2.1/get-time-zone", {
        params: {
          key: apiKey,
          format: "json",
          by: "zone",
          zone: "Asia/Jakarta",
        },
      });
      console.log(`✅ TimeZoneDB berhasil digunakan (API Key: ${apiKey}, Attempt: ${attempt})`);
      return response.data.formatted;
    } catch (error) {
      console.error(`❌ Error dengan TimeZoneDB (API Key: ${apiKey}, Attempt: ${attempt}):`, error.message);
      if (attempt === retries) return null; // Jika semua percobaan gagal, kembalikan null
    }
  }
};

export const getTimeInJakarta = async () => {
  let jakartaTime = null;

  // 1️⃣ Coba API TimeZoneDB dengan mekanisme retry
  const timeZoneDBKeys = ["9DYFOGZS7MVB", "SGHKJRN8UKM4"];
  for (const apiKey of timeZoneDBKeys) {
    jakartaTime = await fetchTimeZoneDB(apiKey, 2); // Coba maksimal 2 kali per API Key
    if (jakartaTime) break; // Jika berhasil, hentikan loop
  }

  // 2️⃣ Jika semua API TimeZoneDB gagal, coba TimeAPI.io sebagai cadangan
  if (!jakartaTime) {
    try {
      const response = await axios.get("https://timeapi.io/api/Time/current/zone", {
        params: { timeZone: "Asia/Jakarta" },
      });
      jakartaTime = response.data.dateTime;
      console.log("✅ Menggunakan TimeAPI.io sebagai fallback");
    } catch (error) {
      console.error("❌ Error dengan TimeAPI.io:", error.message);
    }
  }

  // Jika semua API gagal, hentikan eksekusi
  if (!jakartaTime) {
    console.error("❌ Gagal mendapatkan waktu Jakarta dari semua sumber.");
    return null;
  }

  // Konversi waktu ke Luxon
  const time = moment.tz(jakartaTime, "Asia/Jakarta");
  const isoString = time.format();

  let date = DateTime.fromISO(isoString).setZone("Asia/Jakarta");

  formattedHour = date.toJSDate();
  newDateIndonesia = date;

  console.log("✅ Waktu di Jakarta:", newDateIndonesia.toISO());

  return newDateIndonesia;
};

// export const getTimeInJakarta = async () => {
//     try {
//       const apiKey = "9DYFOGZS7MVB"; // Kunci API pertama
//       const response = await axios.get(
//         `http://api.timezonedb.com/v2.1/get-time-zone`,
//         {
//           params: {
//             key: apiKey,
//             format: "json",
//             by: "zone",
//             zone: "Asia/Jakarta",
//           },
//         }
//       );

//       const jakartaTime = response.data.formatted;

//       const time = moment.tz(jakartaTime, "Asia/Jakarta");
//       const isoString = time.format();

//       let date = DateTime.fromISO(isoString);
//       date = date.setZone("Asia/Jakarta");

//       formattedHour = date.toJSDate();

//       newDateIndonesia = date;

//       console.log(newDateIndonesia);
//     } catch (error) {
//       console.error("Error with the first API key:", error);

//       // Coba API key kedua jika yang pertama gagal
//       try {
//         const apiKey = "SGHKJRN8UKM4"; // Ganti dengan kunci API yang berbeda
//         const response = await axios.get(
//           `http://api.timezonedb.com/v2.1/get-time-zone`,
//           {
//             params: {
//               key: apiKey,
//               format: "json",
//               by: "zone",
//               zone: "Asia/Jakarta",
//             },
//           }
//         );

//         const jakartaTime = response.data.formatted;

//         const time = moment.tz(jakartaTime, "Asia/Jakarta");
//         const isoString = time.format();

//         let date = DateTime.fromISO(isoString);
//         date = date.setZone("Asia/Jakarta");

//         formattedHour = date.toJSDate();

//         newDateIndonesia = date;

//         console.log(newDateIndonesia);
//       } catch (secondError) {
//         console.error("Error with the second API key:", secondError);
//       }
//     }
//   };

// export const getTimeInJakarta = async () => {
//   // Coba API dari TimeAPI.io terlebih dahulu
//   let jakartaTime = null;
//   try {
//     const response = await axios.get("https://timeapi.io/api/Time/current/zone", {
//       params: { timeZone: "Asia/Jakarta" },
//     });
//     jakartaTime = response.data.dateTime;
//   } catch (error) {
//     console.error("Error with TimeAPI.io:", error.message);
//   }

//   // Jika gagal, coba TimeZoneDB API (API pertama)
//   const fetchTimeZoneDB = async (apiKey) => {
//     try {
//       const response = await axios.get("http://api.timezonedb.com/v2.1/get-time-zone", {
//         params: {
//           key: apiKey,
//           format: "json",
//           by: "zone",
//           zone: "Asia/Jakarta",
//         },
//       });
//       return response.data.formatted;
//     } catch (error) {
//       console.error(`Error with API key (${apiKey}):`, error.message);
//       return null;
//     }
//   };

//   if (!jakartaTime) {
//     jakartaTime = await fetchTimeZoneDB("9DYFOGZS7MVB");
//   }

//   // Jika gagal, coba API kedua
//   if (!jakartaTime) {
//     jakartaTime = await fetchTimeZoneDB("SGHKJRN8UKM4");
//   }

//   // Jika semua API gagal, hentikan eksekusi
//   if (!jakartaTime) {
//     console.error("Gagal mendapatkan waktu Jakarta dari semua sumber.");
//     return null;
//   }

//   // Konversi waktu
//   const time = moment.tz(jakartaTime, "Asia/Jakarta");
//   const isoString = time.format();

//   let date = DateTime.fromISO(isoString).setZone("Asia/Jakarta");

//   formattedHour = date.toJSDate();
//   newDateIndonesia = date;

//   console.log("Waktu di Jakarta:", newDateIndonesia.toISO());

//   return newDateIndonesia;
// };
