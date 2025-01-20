import jwt from "jsonwebtoken";



export const JWT_SECRET = process.env.JWT_KEY;
export const createToken = (payload) => {
    
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: "3d",
    });
}