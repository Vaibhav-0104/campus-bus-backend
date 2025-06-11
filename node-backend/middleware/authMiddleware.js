import jwt from "jsonwebtoken";

export const verifyAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer token
    if (!token) {
        return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== "admin") {
            return res.status(403).json({ message: "Forbidden - Invalid role" });
        }
        req.admin = decoded; // pass admin data to next middleware
        next();
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }
};
