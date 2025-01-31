import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

const transporter = nodemailer.createTransport({
  service: "SMTP",
  host: "mail.smkn2ketapang.sch.id",
  port: 465,
  secure: true, // menggunakan SSL

  auth: {
    user: "system-pkl@smkn2ketapang.sch.id",
    pass: "Genta@456", // Gantilah dengan password email Anda
  },
});

export const sendEmail = (to, subject, body) => {
  console.log(to);
  const htmlContent = fs.readFileSync(
    path.join(path.resolve(), "src", "Email", "index.html"),
    "utf-8"
  );

  const customizedContent = htmlContent
    .replace("{{subject}}", subject)
    .replace("{{pklname}}", body.pklname)
    .replace("{{creatorName}}", body.creatorName)
    .replace("{{tanggalMulai}}", body.tanggalMulai)
    .replace("{{tanggalSelesai}}", body.tanggalSelesai);

  const mailOptions = {
    from: '"No-Reply " <system-pkl@smkn2ketapang.sch.id>',
    to: to.join(","),
    subject: subject,
    html: customizedContent,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error sending email:", error);
    } else {
      console.log(`Email sent to: ${mailOptions.to}`);
      console.log(`Response: ${info.response}`);
    }
  });
};

export const sendNotificationEmail = (emailList, { pklname, creatorName , tanggalMulai, tanggalSelesai }) => {
  const subject = "Notifikasi";

  const body = {
    pklname,
    creatorName,
    tanggalMulai,
    tanggalSelesai,
  };

  sendEmail(emailList, subject, body);
};
