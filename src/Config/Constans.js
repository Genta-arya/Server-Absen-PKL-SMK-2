
import { DateTime } from "luxon";
import moment from 'moment-timezone';
export const image_url = "http://localhost:8080/image";

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


const time = moment.tz("Asia/Jakarta");
const isoString = time.format();  // Format dengan zona waktu yang benar (termasuk +07:00)


let date = DateTime.fromISO(isoString);
date = date.setZone("Asia/Jakarta");
// const updatedDate = date.plus({ minutes: 45 });
export const formattedHour = date.toJSDate();

export const newDateIndonesia = date;
console.log(newDateIndonesia);  
