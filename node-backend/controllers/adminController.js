import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

// Admin Login Controller
// export const loginAdmin = async (req, res) => {
//     const { email, password } = req.body;

//     if (!email || !password) {
//         return res.status(400).json({ message: "Email and password are required" });
//     }

//     try {
//         const admin = await Admin.findOne({ email });

//         if (!admin) {
//             return res.status(404).json({ message: "Admin not found" });
//         }

//         const isMatch = await bcrypt.compare(password, admin.password);
//         if (!isMatch) {
//             return res.status(401).json({ message: "Invalid credentials" });
//         }

//         const token = jwt.sign(
//             { id: admin._id, email: admin.email, role: "admin" },
//             process.env.JWT_SECRET,
//             { expiresIn: "7d" }
//         );

//         res.status(200).json({
//             message: "Login successful",
//             token,
//             admin: {
//                 id: admin._id,
//                 email: admin.email,
//                 name: admin.name
//             }
//         });
//     } catch (error) {
//         console.error("Admin Login Error:", error.message);
//         res.status(500).json({ message: "Server error" });
//     }
// };


export const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        // Check if admin exists, if not create a static admin
        let admin = await Admin.findOne({ email: "admin@gmail.com" });

        if (!admin) {
            const hashedPassword = await bcrypt.hash("admin123", 10);
            admin = new Admin({
                email: "admin@gmail.com",
                password: hashedPassword,
                name: "Admin User" // Optional: You can modify the name as needed
            });
            await admin.save();
        }

        // Proceed with login logic
        admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: admin._id, email: admin.email, role: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            admin: {
                id: admin._id,
                email: admin.email,
                name: admin.name
            }
        });
    } catch (error) {
        console.error("Admin Login Error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};