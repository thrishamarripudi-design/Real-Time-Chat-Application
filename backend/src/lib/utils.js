import jwt from "jsonwebtoken";

// The token is returned in the JSON body (not only set as a cookie) so the
// frontend can store it per-tab in sessionStorage. A plain httpOnly cookie
// is shared by ALL tabs on the same origin -- that's why logging into 3
// tabs on localhost previously collapsed into "one account everywhere."
// sessionStorage is scoped to a single tab, so each tab can hold its own
// logged-in user independently.
export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV !== "development",
  });

  return token;
};