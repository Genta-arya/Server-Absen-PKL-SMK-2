import csurf from "csurf";

export const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  },
});

export const CreateCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "None",

    maxAge: 2 * 24 * 60 * 60 * 1000,
  });
};
