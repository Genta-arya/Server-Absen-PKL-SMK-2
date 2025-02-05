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

export const getTimeInJakarta = async () => {
  try {
    const apiKey = "9DYFOGZS7MVB"; // Ganti dengan API key dari TimeZoneDB
    const response = await axios.get(
      `http://api.timezonedb.com/v2.1/get-time-zone`,
      {
        params: {
          key: apiKey,
          format: "json",
          by: "zone",
          zone: "Asia/Jakarta",
        },
      }
    );

    const jakartaTime = response.data.formatted;

    const time = moment.tz(jakartaTime, "Asia/Jakarta");
    const isoString = time.format();

    let date = DateTime.fromISO(isoString);
    date = date.setZone("Asia/Jakarta");

    formattedHour = date.toJSDate();

    newDateIndonesia = date;

    console.log(newDateIndonesia);
  } catch (error) {
    console.error("Terjadi kesalahan saat mengambil waktu:", error);
  }
};

// // Dapatkan waktu saat ini dalam zona waktu Indonesia (WIB, UTC+7)
// const currentDate = new Date();
// const formatter = new Intl.DateTimeFormat("en-US", {
//   timeZone: "Asia/Jakarta",
//   year: "numeric",
//   month: "2-digit",
//   day: "2-digit",
//   hour: "2-digit",
//   minute: "2-digit",
//   second: "2-digit",
//   hour12: false,
// });

// // Ambil bagian tanggal & waktu dari formatter
// const parts = formatter.formatToParts(currentDate);
// const year = parts.find((p) => p.type === "year").value;
// const month = parts.find((p) => p.type === "month").value;
// const day = parts.find((p) => p.type === "day").value;
// const hour = parts.find((p) => p.type === "hour").value;
// const minute = parts.find((p) => p.type === "minute").value;
// const second = parts.find((p) => p.type === "second").value;

// // Buat objek Date yang benar-benar di zona WIB
// export const newDateIndonesia = new Date(
//   `${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`
// );
// console.log(
//   newDateIndonesia.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
// );
